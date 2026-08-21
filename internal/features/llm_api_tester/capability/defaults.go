package capability

// Fixture is source-controlled test content. It is intentionally not a user
// editable API in the first release.
type Fixture struct {
	Prompt       string
	ToolSchema   map[string]any
	JSONSchema   map[string]any
	ExpectedTool string
}

var fixtures = map[string]Fixture{
	"tool_use": {
		Prompt: "Use the provided weather tool to answer the user's question. Do not invent weather data.",
		ToolSchema: map[string]any{
			"type": "function",
			"function": map[string]any{
				"name":        "get_weather",
				"description": "Get the current weather for a city.",
				"parameters": map[string]any{
					"type":       "object",
					"properties": map[string]any{"city": map[string]any{"type": "string"}},
					"required":   []string{"city"},
				},
			},
		},
		ExpectedTool: "get_weather",
	},
	"reasoning": {Prompt: "Solve this carefully and state the key reasoning steps: what is 17 × 19?"},
	"stream":    {Prompt: "Write a short two-sentence explanation of why the sky appears blue."},
	"tool_choice": {
		Prompt:       "Call the required weather tool with a city of Tokyo.",
		ExpectedTool: "get_weather",
		ToolSchema: map[string]any{
			"type": "function",
			"function": map[string]any{
				"name":       "get_weather",
				"parameters": map[string]any{"type": "object", "properties": map[string]any{"city": map[string]any{"type": "string"}}, "required": []string{"city"}},
			},
		},
	},
	"structured_output": {
		Prompt: "Return the result as JSON with a single integer field named answer. The answer is 6 × 7.",
		JSONSchema: map[string]any{
			"type":       "object",
			"properties": map[string]any{"answer": map[string]any{"type": "integer"}},
			"required":   []string{"answer"},
		},
	},
}

// Default returns a copy of the fixture for a capability.
func Default(kind string) Fixture {
	fixture, ok := fixtures[kind]
	if !ok {
		return Fixture{Prompt: "Respond with a concise acknowledgement."}
	}
	return fixture
}
