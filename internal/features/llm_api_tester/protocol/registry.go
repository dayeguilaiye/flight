package protocol

import llm "github.com/ziyuanhe/flight/internal/features/llm_api_tester"

type registry struct {
	adapters map[llm.InterfaceType]llm.TestAdapter
}

// NewRegistry creates the default protocol adapter registry.
func NewRegistry() llm.AdapterRegistry {
	return &registry{adapters: map[llm.InterfaceType]llm.TestAdapter{
		llm.InterfaceOpenAIChat:      NewOpenAIChatAdapter(),
		llm.InterfaceOpenAIResponses: NewOpenAIResponsesAdapter(),
		llm.InterfaceAnthropic:       NewAnthropicMessagesAdapter(),
	}}
}

func (r *registry) Adapter(interfaceType llm.InterfaceType) (llm.TestAdapter, bool) {
	adapter, ok := r.adapters[interfaceType]
	return adapter, ok
}
