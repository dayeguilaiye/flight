package llm_api_tester

import "context"

type guestRequestContextKey struct{}

// WithGuestRequest marks an adapter call as visitor-originated. Adapters use
// this marker to apply public-HTTPS and redirect validation.
func WithGuestRequest(ctx context.Context) context.Context {
	return context.WithValue(ctx, guestRequestContextKey{}, true)
}

// IsGuestRequest reports whether a request is subject to visitor egress rules.
func IsGuestRequest(ctx context.Context) bool {
	value, _ := ctx.Value(guestRequestContextKey{}).(bool)
	return value
}

// CapabilityRequest is the protocol-neutral input passed to every adapter.
// The adapter receives the decrypted token only in memory for the duration of
// the request and must never place it in a result or event.
type CapabilityRequest struct {
	Capability    CapabilityType
	BaseURL       string
	Token         string
	ModelName     string
	InterfaceType InterfaceType
}

// TestEvent carries incremental progress from a streaming adapter.
type TestEvent struct {
	Kind  string `json:"kind"`
	Delta string `json:"delta,omitempty"`
}

// EventSink receives adapter progress. A nil sink is valid for JSON-only runs.
type EventSink func(TestEvent)

// TestAdapter is the only protocol seam used by the main test orchestration.
// Unsupported capabilities are represented as results, not errors or branches
// in the orchestration service.
type TestAdapter interface {
	InterfaceType() InterfaceType
	RunCapability(context.Context, CapabilityRequest, EventSink) CapabilityResult
}

// AdapterRegistry resolves a model interface to its single shared test seam.
type AdapterRegistry interface {
	Adapter(InterfaceType) (TestAdapter, bool)
}
