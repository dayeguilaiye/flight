package protocol

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	llm "github.com/ziyuanhe/flight/internal/features/llm_api_tester"
)

func TestAnthropicStructuredOutputIsUnsupportedWithoutRequest(t *testing.T) {
	called := false
	server := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { called = true }))
	t.Cleanup(server.Close)
	adapter := NewAnthropicMessagesAdapter()
	result := adapter.RunCapability(context.Background(), llm.CapabilityRequest{
		Capability:    llm.CapabilityStructuredOutput,
		BaseURL:       server.URL,
		Token:         "secret-token",
		ModelName:     "model",
		InterfaceType: llm.InterfaceAnthropic,
	}, nil)
	if result.Status != llm.StatusUnsupported {
		t.Fatalf("status = %s", result.Status)
	}
	if called {
		t.Fatal("unsupported capability sent a request")
	}
}

func TestOpenAIChatStreamEmitsProgressAndRedactsToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer secret-token" {
			t.Errorf("authorization header missing")
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\"hello\"}}]}\n\n")
		_, _ = fmt.Fprint(w, "data: [DONE]\n\n")
	}))
	t.Cleanup(server.Close)
	adapter := NewOpenAIChatAdapter()
	var deltas strings.Builder
	result := adapter.RunCapability(context.Background(), llm.CapabilityRequest{
		Capability:    llm.CapabilityStream,
		BaseURL:       server.URL,
		Token:         "secret-token",
		ModelName:     "model",
		InterfaceType: llm.InterfaceOpenAIChat,
	}, func(event llm.TestEvent) { deltas.WriteString(event.Delta) })
	if result.Status != llm.StatusPassed {
		t.Fatalf("status = %s error=%#v", result.Status, result.Error)
	}
	if deltas.String() != "hello" {
		t.Fatalf("deltas = %q", deltas.String())
	}
	if strings.Contains(fmt.Sprintf("%#v", result), "secret-token") {
		t.Fatal("token leaked into result")
	}
}

func TestCapabilityValidationRequiresObservableBehavior(t *testing.T) {
	if validCapabilityResponse(llm.CapabilityReasoning, "model", map[string]any{"choices": []any{map[string]any{"message": map[string]any{"content": "17 × 19 = 323"}}}}) {
		t.Fatal("plain answer was accepted as reasoning")
	}
	if !validCapabilityResponse(llm.CapabilityReasoning, "model", map[string]any{"output": []any{map[string]any{"type": "reasoning"}}}) {
		t.Fatal("reasoning output was rejected")
	}
	if validCapabilityResponse(llm.CapabilityStructuredOutput, "model", map[string]any{"content": "answer: forty-two"}) {
		t.Fatal("non-structured answer was accepted")
	}
	if !validCapabilityResponse(llm.CapabilityStructuredOutput, "model", map[string]any{"content": `{"answer":42}`}) {
		t.Fatal("structured answer was rejected")
	}
}
