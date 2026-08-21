package llm_api_tester

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"
)

// InterfaceType identifies the wire protocol used by a model endpoint.
type InterfaceType string

const (
	InterfaceOpenAIChat      InterfaceType = "openai_chat"
	InterfaceOpenAIResponses InterfaceType = "openai_responses"
	InterfaceAnthropic       InterfaceType = "anthropic_messages"
)

func (i InterfaceType) Valid() bool {
	switch i {
	case InterfaceOpenAIChat, InterfaceOpenAIResponses, InterfaceAnthropic:
		return true
	default:
		return false
	}
}

// CapabilityType identifies one hardcoded capability test.
type CapabilityType string

const (
	CapabilityToolUse          CapabilityType = "tool_use"
	CapabilityReasoning        CapabilityType = "reasoning"
	CapabilityStream           CapabilityType = "stream"
	CapabilityToolChoice       CapabilityType = "tool_choice"
	CapabilityStructuredOutput CapabilityType = "structured_output"
)

// AllCapabilities is the source-controlled list shown by the UI.
var AllCapabilities = []CapabilityType{
	CapabilityToolUse,
	CapabilityReasoning,
	CapabilityStream,
	CapabilityToolChoice,
	CapabilityStructuredOutput,
}

// CapabilityStatus describes the last observed state for one check.
type CapabilityStatus string

const (
	StatusNeverRun    CapabilityStatus = "never_run"
	StatusPassed      CapabilityStatus = "passed"
	StatusFailed      CapabilityStatus = "failed"
	StatusUnsupported CapabilityStatus = "unsupported"
	StatusNotRun      CapabilityStatus = "not_run"
)

// Provider is the safe provider view returned to clients. Token is never part
// of this type; HasToken and TokenMasked are enough for edit forms.
type Provider struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	BaseURL     string    `json:"baseUrl"`
	HasToken    bool      `json:"hasToken"`
	TokenMasked string    `json:"tokenMasked"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	Models      []Model   `json:"models"`
}

// Model is the safe model view returned to clients.
type Model struct {
	ID             int64                               `json:"id"`
	ProviderID     int64                               `json:"providerId"`
	Name           string                              `json:"name"`
	InterfaceType  InterfaceType                       `json:"interfaceType"`
	MaxConcurrency *int                                `json:"maxConcurrency,omitempty"`
	Results        map[CapabilityType]CapabilityResult `json:"results"`
	CreatedAt      time.Time                           `json:"createdAt"`
	UpdatedAt      time.Time                           `json:"updatedAt"`
}

// CapabilityResult is both the API result and the persisted latest result.
type CapabilityResult struct {
	Status                CapabilityStatus `json:"status"`
	Request               any              `json:"request,omitempty"`
	Response              any              `json:"response,omitempty"`
	Error                 any              `json:"error,omitempty"`
	StartedAt             *time.Time       `json:"startedAt,omitempty"`
	CompletedAt           *time.Time       `json:"completedAt,omitempty"`
	DurationMs            *int64           `json:"durationMs,omitempty"`
	TTFTMs                *int64           `json:"ttftMs,omitempty"`
	InputTokens           *int64           `json:"inputTokens,omitempty"`
	OutputTokens          *int64           `json:"outputTokens,omitempty"`
	OutputTokensPerSecond *float64         `json:"outputTokensPerSecond,omitempty"`
}

// storedProvider and storedModel are repository representations that retain
// encrypted token material and database timestamps.
type storedProvider struct {
	Provider
	TokenCiphertext []byte
	TokenNonce      []byte
}

type storedModel struct {
	Model
	ProviderTokenCiphertext []byte
	ProviderTokenNonce      []byte
}

func validateProvider(name, description, baseURL, token string, tokenRequired bool) error {
	if strings.TrimSpace(name) == "" {
		return errors.New("provider name is required")
	}
	parsed, err := url.Parse(strings.TrimSpace(baseURL))
	if err != nil || parsed.Scheme == "" || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return errors.New("provider base URL must be an absolute HTTP or HTTPS URL")
	}
	if tokenRequired && strings.TrimSpace(token) == "" {
		return errors.New("provider token is required")
	}
	_ = description
	return nil
}

func validateModel(name string, interfaceType InterfaceType, maxConcurrency *int) error {
	if strings.TrimSpace(name) == "" {
		return errors.New("model name is required")
	}
	if !interfaceType.Valid() {
		return fmt.Errorf("unsupported interface type %q", interfaceType)
	}
	if maxConcurrency != nil && *maxConcurrency < 1 {
		return errors.New("max concurrency must be at least 1")
	}
	return nil
}
