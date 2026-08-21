package protocol

import (
	"net/http"
	"net/url"
	"strings"
	"time"

	llm "github.com/ziyuanhe/flight/internal/features/llm_api_tester"
	"github.com/ziyuanhe/flight/internal/features/llm_api_tester/capability"
)

// OpenAIResponsesAdapter implements the OpenAI Responses wire protocol.
type OpenAIResponsesAdapter struct{ *wireAdapter }

// NewOpenAIResponsesAdapter creates an adapter with bounded request time.
func NewOpenAIResponsesAdapter() *OpenAIResponsesAdapter {
	adapter := &OpenAIResponsesAdapter{}
	adapter.wireAdapter = &wireAdapter{
		interfaceType: llm.InterfaceOpenAIResponses,
		client:        &http.Client{Timeout: 60 * time.Second},
		unsupported:   map[llm.CapabilityType]string{},
		buildRequest:  adapter.buildRequest,
	}
	return adapter
}

func (a *OpenAIResponsesAdapter) buildRequest(request llm.CapabilityRequest, fixture capability.Fixture, stream bool) (string, map[string]any, http.Header) {
	base, _ := url.Parse(strings.TrimRight(request.BaseURL, "/"))
	base.Path = strings.TrimRight(base.Path, "/") + "/responses"
	body := map[string]any{"model": request.ModelName, "input": fixture.Prompt}
	if stream {
		body["stream"] = true
	}
	if fixture.ToolSchema != nil {
		function, _ := fixture.ToolSchema["function"].(map[string]any)
		body["tools"] = []any{map[string]any{"type": "function", "name": function["name"], "description": function["description"], "parameters": function["parameters"]}}
	}
	if request.Capability == llm.CapabilityToolChoice {
		body["tool_choice"] = map[string]any{"type": "function", "name": fixture.ExpectedTool}
	}
	if fixture.JSONSchema != nil {
		body["text"] = map[string]any{"format": map[string]any{"type": "json_schema", "name": "answer", "schema": fixture.JSONSchema, "strict": true}}
	}
	headers := make(http.Header)
	headers.Set("Authorization", "Bearer "+request.Token)
	return base.String(), body, headers
}
