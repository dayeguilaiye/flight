package protocol

import (
	"net/http"
	"net/url"
	"strings"
	"time"

	llm "github.com/ziyuanhe/flight/internal/features/llm_api_tester"
	"github.com/ziyuanhe/flight/internal/features/llm_api_tester/capability"
)

// OpenAIChatAdapter implements the OpenAI Chat Completions wire protocol.
type OpenAIChatAdapter struct{ *wireAdapter }

// NewOpenAIChatAdapter creates an adapter with bounded request time.
func NewOpenAIChatAdapter() *OpenAIChatAdapter {
	adapter := &OpenAIChatAdapter{}
	adapter.wireAdapter = &wireAdapter{
		interfaceType: llm.InterfaceOpenAIChat,
		client:        &http.Client{Timeout: 60 * time.Second},
		unsupported:   map[llm.CapabilityType]string{},
		buildRequest:  adapter.buildRequest,
	}
	return adapter
}

func (a *OpenAIChatAdapter) buildRequest(request llm.CapabilityRequest, fixture capability.Fixture, stream bool) (string, map[string]any, http.Header) {
	base, _ := url.Parse(strings.TrimRight(request.BaseURL, "/"))
	base.Path = strings.TrimRight(base.Path, "/") + "/chat/completions"
	body := map[string]any{"model": request.ModelName, "messages": []any{map[string]any{"role": "user", "content": fixture.Prompt}}}
	if stream {
		body["stream"] = true
		body["stream_options"] = map[string]any{"include_usage": true}
	}
	if fixture.ToolSchema != nil {
		body["tools"] = []any{fixture.ToolSchema}
	}
	if request.Capability == llm.CapabilityToolChoice {
		body["tool_choice"] = map[string]any{"type": "function", "function": map[string]any{"name": fixture.ExpectedTool}}
	}
	if fixture.JSONSchema != nil {
		body["response_format"] = map[string]any{"type": "json_schema", "json_schema": map[string]any{"name": "answer", "schema": fixture.JSONSchema, "strict": true}}
	}
	headers := make(http.Header)
	headers.Set("Authorization", "Bearer "+request.Token)
	return base.String(), body, headers
}
