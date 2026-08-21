package llm_api_tester

import (
	"context"
	"errors"
	"fmt"
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

// Service contains feature use cases and owns token encryption boundaries.
type Service struct {
	repository Repository
	box        *secrets.Box
}

// NewService creates the owner CRUD service.
func NewService(repository Repository, box *secrets.Box) *Service {
	return &Service{repository: repository, box: box}
}

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
