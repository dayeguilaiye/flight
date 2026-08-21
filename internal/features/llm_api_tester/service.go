package llm_api_tester

import (
	"context"
	"errors"
	"fmt"
	"hash/fnv"
	"strings"

	"github.com/ziyuanhe/flight/internal/platform/secrets"
)

const defaultConcurrency = 4

// ProviderInput is the owner-facing provider mutation shape. A nil token on
// update preserves the currently encrypted token.
type ProviderInput struct {
	Name        string
	Description string
	BaseURL     string
	Token       *string
}

// ModelInput is the owner-facing model mutation shape.
type ModelInput struct {
	Name           string
	InterfaceType  InterfaceType
	MaxConcurrency *int
}

// EphemeralTarget is a visitor-owned model configuration that exists only for
// the current test request.
type EphemeralTarget struct {
	BaseURL        string
	Token          string
	ModelName      string
	InterfaceType  InterfaceType
	MaxConcurrency *int
}

// Service contains feature use cases and owns token encryption boundaries.
type Service struct {
	repository Repository
	box        *secrets.Box
	adapters   AdapterRegistry
	scheduler  *modelScheduler
}

// NewService creates the owner CRUD service.
func NewService(repository Repository, box *secrets.Box) *Service {
	return &Service{repository: repository, box: box, scheduler: newModelScheduler()}
}

// SetAdapters wires protocol implementations at the application composition
// root without making the feature depend on a concrete protocol package.
func (s *Service) SetAdapters(adapters AdapterRegistry) { s.adapters = adapters }

// ListProviders returns safe provider/model views with sparse latest results.
func (s *Service) ListProviders(ctx context.Context) ([]Provider, error) {
	stored, err := s.repository.ListProviders(ctx)
	if err != nil {
		return nil, err
	}
	providers := make([]Provider, 0, len(stored))
	for _, provider := range stored {
		providers = append(providers, publicProvider(provider))
	}
	return providers, nil
}

// CreateProvider persists a provider after validation and token encryption.
func (s *Service) CreateProvider(ctx context.Context, input ProviderInput) (Provider, error) {
	if input.Token == nil {
		return Provider{}, errors.New("provider token is required")
	}
	if err := validateProvider(input.Name, input.Description, input.BaseURL, *input.Token, true); err != nil {
		return Provider{}, err
	}
	nonce, ciphertext, err := s.box.Encrypt(*input.Token)
	if err != nil {
		return Provider{}, fmt.Errorf("encrypt provider token: %w", err)
	}
	provider, err := s.repository.CreateProvider(ctx, storedProvider{Provider: Provider{Name: strings.TrimSpace(input.Name), Description: input.Description, BaseURL: strings.TrimSpace(input.BaseURL)}, TokenCiphertext: ciphertext, TokenNonce: nonce})
	if err != nil {
		return Provider{}, err
	}
	return publicProvider(provider), nil
}

// UpdateProvider updates metadata and optionally replaces the token.
func (s *Service) UpdateProvider(ctx context.Context, id int64, input ProviderInput) (Provider, error) {
	if err := validateProvider(input.Name, input.Description, input.BaseURL, valueOrEmpty(input.Token), false); err != nil {
		return Provider{}, err
	}
	provider := storedProvider{Provider: Provider{ID: id, Name: strings.TrimSpace(input.Name), Description: input.Description, BaseURL: strings.TrimSpace(input.BaseURL)}}
	if input.Token != nil && strings.TrimSpace(*input.Token) != "" {
		var err error
		provider.TokenNonce, provider.TokenCiphertext, err = s.box.Encrypt(*input.Token)
		if err != nil {
			return Provider{}, fmt.Errorf("encrypt provider token: %w", err)
		}
	}
	updated, err := s.repository.UpdateProvider(ctx, provider)
	if err != nil {
		return Provider{}, err
	}
	return publicProvider(updated), nil
}

// DeleteProvider removes a provider and its models/results via foreign keys.
func (s *Service) DeleteProvider(ctx context.Context, id int64) error {
	return s.repository.DeleteProvider(ctx, id)
}

// CreateModel adds a model under an existing provider.
func (s *Service) CreateModel(ctx context.Context, providerID int64, input ModelInput) (Model, error) {
	if err := validateModel(input.Name, input.InterfaceType, input.MaxConcurrency); err != nil {
		return Model{}, err
	}
	model, err := s.repository.CreateModel(ctx, storedModel{Model: Model{ProviderID: providerID, Name: strings.TrimSpace(input.Name), InterfaceType: input.InterfaceType, MaxConcurrency: input.MaxConcurrency}})
	if err != nil {
		return Model{}, err
	}
	return publicModel(model), nil
}

// UpdateModel changes model metadata and its independent concurrency limit.
func (s *Service) UpdateModel(ctx context.Context, id int64, input ModelInput) (Model, error) {
	if err := validateModel(input.Name, input.InterfaceType, input.MaxConcurrency); err != nil {
		return Model{}, err
	}
	model, err := s.repository.UpdateModel(ctx, storedModel{Model: Model{ID: id, Name: strings.TrimSpace(input.Name), InterfaceType: input.InterfaceType, MaxConcurrency: input.MaxConcurrency}})
	if err != nil {
		return Model{}, err
	}
	return publicModel(model), nil
}

// DeleteModel removes a model and its latest capability results.
func (s *Service) DeleteModel(ctx context.Context, id int64) error {
	return s.repository.DeleteModel(ctx, id)
}

// RunPersistedCapabilities runs selected checks for one owner model. Each
// capability is persisted independently, so a partial run is sparse.
func (s *Service) RunPersistedCapabilities(ctx context.Context, modelID int64, capabilities []CapabilityType, sink func(CapabilityType, TestEvent)) (map[CapabilityType]CapabilityResult, error) {
	model, err := s.repository.GetModel(ctx, modelID)
	if err != nil {
		return nil, err
	}
	token, err := s.box.Decrypt(model.ProviderTokenNonce, model.ProviderTokenCiphertext)
	if err != nil {
		return nil, fmt.Errorf("decrypt provider token: %w", err)
	}
	return s.runCapabilities(ctx, modelID, model.ProviderBaseURL, model.Model, token, capabilities, true, sink)
}

// RunEphemeralCapabilities executes a visitor target without repository access
// or durable writes.
func (s *Service) RunEphemeralCapabilities(ctx context.Context, target EphemeralTarget, capabilities []CapabilityType, sink func(CapabilityType, TestEvent)) (map[CapabilityType]CapabilityResult, error) {
	if err := validateProvider("ephemeral", "", target.BaseURL, target.Token, true); err != nil {
		return nil, err
	}
	if err := validateModel(target.ModelName, target.InterfaceType, target.MaxConcurrency); err != nil {
		return nil, err
	}
	model := Model{Name: target.ModelName, InterfaceType: target.InterfaceType, MaxConcurrency: target.MaxConcurrency}
	return s.runCapabilities(ctx, ephemeralSchedulerKey(target), target.BaseURL, model, target.Token, capabilities, false, sink)
}

func (s *Service) runCapabilities(ctx context.Context, modelID int64, baseURL string, model Model, token string, capabilities []CapabilityType, persist bool, sink func(CapabilityType, TestEvent)) (map[CapabilityType]CapabilityResult, error) {
	if s.adapters == nil {
		return nil, errors.New("test adapters are not configured")
	}
	adapter, ok := s.adapters.Adapter(model.InterfaceType)
	if !ok {
		return nil, fmt.Errorf("no adapter for interface %q", model.InterfaceType)
	}
	release, acquired := s.scheduler.Acquire(ctx, modelID, model.MaxConcurrency)
	if !acquired {
		return nil, ctx.Err()
	}
	defer release()
	results := make(map[CapabilityType]CapabilityResult, len(capabilities))
	for _, capability := range capabilities {
		result := adapter.RunCapability(ctx, CapabilityRequest{Capability: capability, BaseURL: baseURL, Token: token, ModelName: model.Name, InterfaceType: model.InterfaceType}, func(event TestEvent) {
			if sink != nil {
				sink(capability, event)
			}
		})
		results[capability] = result
		if persist {
			if err := s.repository.UpsertCapabilityResult(ctx, modelID, capability, result); err != nil {
				return nil, err
			}
		}
	}
	return results, nil
}

func ephemeralSchedulerKey(target EphemeralTarget) int64 {
	hash := fnv.New64a()
	_, _ = hash.Write([]byte(target.BaseURL + "\x00" + target.ModelName + "\x00" + string(target.InterfaceType)))
	return -int64(hash.Sum64() & 0x7fffffffffffffff)
}

func publicProvider(provider storedProvider) Provider {
	provider.TokenCiphertext = nil
	provider.TokenNonce = nil
	provider.HasToken = true
	provider.TokenMasked = "••••••••"
	if provider.Models == nil {
		provider.Models = []Model{}
	}
	for i := range provider.Models {
		provider.Models[i] = publicModel(storedModel{Model: provider.Models[i]})
	}
	return provider.Provider
}

func publicModel(model storedModel) Model {
	if model.Results == nil {
		model.Results = make(map[CapabilityType]CapabilityResult)
	}
	for _, capability := range AllCapabilities {
		if _, ok := model.Results[capability]; !ok {
			model.Results[capability] = CapabilityResult{Status: StatusNeverRun}
		}
	}
	return model.Model
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
