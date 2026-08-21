package protocol

import (
	"net/http"
	"net/url"
	"strings"
	"time"

	llm "github.com/ziyuanhe/flight/internal/features/llm_api_tester"
	"github.com/ziyuanhe/flight/internal/features/llm_api_tester/capability"
)

// AnthropicMessagesAdapter implements the Anthropic Messages wire protocol.
type AnthropicMessagesAdapter struct{ *wireAdapter }

// NewAnthropicMessagesAdapter creates an adapter. Structured output is
// explicitly unsupported because the first release does not emulate it with a
// tool schema for Anthropic.
func NewAnthropicMessagesAdapter() *AnthropicMessagesAdapter {
	adapter := &AnthropicMessagesAdapter{}
	adapter.wireAdapter = &wireAdapter{
		interfaceType: llm.InterfaceAnthropic,
		client:        &http.Client{Timeout: 60 * time.Second},
		unsupported: map[llm.CapabilityType]string{
			llm.CapabilityStructuredOutput: "Anthropic Messages has no native structured-output check in the first release",
		},
		buildRequest: adapter.buildRequest,
	}
	return adapter
}

func (a *AnthropicMessagesAdapter) buildRequest(request llm.CapabilityRequest, fixture capability.Fixture, stream bool) (string, map[string]any, http.Header) {
	base, _ := url.Parse(strings.TrimRight(request.BaseURL, "/"))
	base.Path = strings.TrimRight(base.Path, "/") + "/messages"
	body := map[string]any{
		"model":      request.ModelName,
		"max_tokens": 1024,
		"messages":   []any{map[string]any{"role": "user", "content": fixture.Prompt}},
	}
	if stream {
		body["stream"] = true
	}
	if fixture.ToolSchema != nil {
		function, _ := fixture.ToolSchema["function"].(map[string]any)
		body["tools"] = []any{map[string]any{"name": function["name"], "description": function["description"], "input_schema": function["parameters"]}}
	}
	if request.Capability == llm.CapabilityToolChoice {
		body["tool_choice"] = map[string]any{"type": "tool", "name": fixture.ExpectedTool}
	}
	headers := make(http.Header)
	headers.Set("x-api-key", request.Token)
	headers.Set("anthropic-version", "2023-06-01")
	return base.String(), body, headers
}
