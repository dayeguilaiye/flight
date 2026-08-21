package protocol

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	llm "github.com/ziyuanhe/flight/internal/features/llm_api_tester"
	"github.com/ziyuanhe/flight/internal/features/llm_api_tester/capability"
	"github.com/ziyuanhe/flight/internal/platform/egress"
)

const maxResponseBytes = 2 << 20

type wireAdapter struct {
	interfaceType llm.InterfaceType
	client        *http.Client
	unsupported   map[llm.CapabilityType]string
	buildRequest  func(llm.CapabilityRequest, capability.Fixture, bool) (string, map[string]any, http.Header)
}

func (a *wireAdapter) InterfaceType() llm.InterfaceType { return a.interfaceType }

func (a *wireAdapter) RunCapability(ctx context.Context, request llm.CapabilityRequest, sink llm.EventSink) llm.CapabilityResult {
	if reason, unsupported := a.unsupported[request.Capability]; unsupported {
		return llm.CapabilityResult{Status: llm.StatusUnsupported, Error: map[string]any{"code": "unsupported", "message": reason}}
	}
	fixture := capability.Default(string(request.Capability))
	stream := request.Capability == llm.CapabilityStream
	endpoint, payload, headers := a.buildRequest(request, fixture, stream)
	if llm.IsGuestRequest(ctx) {
		if err := egress.ValidateGuestURL(ctx, endpoint); err != nil {
			return llm.CapabilityResult{Status: llm.StatusFailed, Error: map[string]any{"code": "guest_url_blocked", "message": err.Error()}}
		}
	}
	requestSafe := map[string]any{"method": http.MethodPost, "url": endpoint, "body": payload}
	started := time.Now().UTC()
	result := llm.CapabilityResult{Status: llm.StatusFailed, Request: requestSafe, StartedAt: &started}
	body, err := json.Marshal(payload)
	if err != nil {
		return finishFailure(result, err)
	}
	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return finishFailure(result, err)
	}
	httpRequest.Header.Set("Content-Type", "application/json")
	for key, values := range headers {
		for _, value := range values {
			httpRequest.Header.Add(key, value)
		}
	}
	client := a.client
	if llm.IsGuestRequest(ctx) {
		clone := *a.client
		clone.CheckRedirect = func(req *http.Request, _ []*http.Request) error {
			if err := egress.ValidateGuestURL(req.Context(), req.URL.String()); err != nil {
				return err
			}
			return nil
		}
		client = &clone
	}
	response, err := client.Do(httpRequest)
	if err != nil {
		return finishFailure(result, err)
	}
	defer response.Body.Close()

	if stream {
		return a.readStream(response, result, sink)
	}
	raw, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBytes+1))
	if err != nil {
		return finishFailure(result, err)
	}
	if len(raw) > maxResponseBytes {
		return finishFailure(result, fmt.Errorf("response exceeded %d bytes", maxResponseBytes))
	}
	var decoded any
	if json.Unmarshal(raw, &decoded) != nil {
		decoded = string(raw)
	}
	result.Response = decoded
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return finishFailure(result, fmt.Errorf("provider returned HTTP %d", response.StatusCode))
	}
	if !validCapabilityResponse(request.Capability, request.ModelName, decoded) {
		return finishFailure(result, fmt.Errorf("response did not demonstrate %s", request.Capability))
	}
	result.Status = llm.StatusPassed
	return finishSuccess(result, decoded)
}

func (a *wireAdapter) readStream(response *http.Response, result llm.CapabilityResult, sink llm.EventSink) llm.CapabilityResult {
	firstToken := time.Time{}
	var lastPayload any
	scanner := bufio.NewScanner(io.LimitReader(response.Body, maxResponseBytes+1))
	scanner.Buffer(make([]byte, 1024), 1<<20)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" || data == "" {
			continue
		}
		var payload any
		if json.Unmarshal([]byte(data), &payload) != nil {
			continue
		}
		lastPayload = payload
		delta := extractDelta(payload)
		if delta != "" {
			if firstToken.IsZero() {
				firstToken = time.Now().UTC()
			}
			if sink != nil {
				sink(llm.TestEvent{Kind: "delta", Delta: delta})
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return finishFailure(result, err)
	}
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return finishFailure(result, fmt.Errorf("provider returned HTTP %d", response.StatusCode))
	}
	if firstToken.IsZero() {
		return finishFailure(result, fmt.Errorf("stream returned no content"))
	}
	result.Response = lastPayload
	result.Status = llm.StatusPassed
	completed := time.Now().UTC()
	result.CompletedAt = &completed
	duration := completed.Sub(*result.StartedAt)
	durationMs := duration.Milliseconds()
	result.DurationMs = &durationMs
	ttftMs := firstToken.Sub(*result.StartedAt).Milliseconds()
	result.TTFTMs = &ttftMs
	return addUsageMetrics(result, lastPayload, duration, completed)
}

func finishSuccess(result llm.CapabilityResult, payload any) llm.CapabilityResult {
	completed := time.Now().UTC()
	result.CompletedAt = &completed
	duration := completed.Sub(*result.StartedAt)
	durationMs := duration.Milliseconds()
	result.DurationMs = &durationMs
	return addUsageMetrics(result, payload, duration, completed)
}

func finishFailure(result llm.CapabilityResult, err error) llm.CapabilityResult {
	completed := time.Now().UTC()
	result.CompletedAt = &completed
	duration := completed.Sub(*result.StartedAt)
	durationMs := duration.Milliseconds()
	result.DurationMs = &durationMs
	result.Error = map[string]any{"code": "request_failed", "message": err.Error()}
	return result
}

func addUsageMetrics(result llm.CapabilityResult, payload any, duration time.Duration, completed time.Time) llm.CapabilityResult {
	outputTokens, ok := findInt(payload, "output_tokens", "completion_tokens")
	if !ok {
		return result
	}
	result.OutputTokens = &outputTokens
	if duration > 0 {
		seconds := duration.Seconds()
		throughput := float64(outputTokens) / seconds
		result.OutputTokensPerSecond = &throughput
	}
	_ = completed
	return result
}

func extractDelta(value any) string {
	if object, ok := value.(map[string]any); ok {
		for _, key := range []string{"content", "text", "delta"} {
			if text, ok := object[key].(string); ok {
				return text
			}
		}
		for _, child := range object {
			if text := extractDelta(child); text != "" {
				return text
			}
		}
	}
	if list, ok := value.([]any); ok {
		for _, child := range list {
			if text := extractDelta(child); text != "" {
				return text
			}
		}
	}
	return ""
}

func findInt(value any, keys ...string) (int64, bool) {
	object, ok := value.(map[string]any)
	if ok {
		for _, key := range keys {
			if number, ok := object[key].(float64); ok {
				return int64(number), true
			}
		}
		for _, child := range object {
			if number, ok := findInt(child, keys...); ok {
				return number, true
			}
		}
	}
	if list, ok := value.([]any); ok {
		for _, child := range list {
			if number, ok := findInt(child, keys...); ok {
				return number, true
			}
		}
	}
	return 0, false
}

func validCapabilityResponse(kind llm.CapabilityType, model string, response any) bool {
	_ = model
	if kind == llm.CapabilityToolUse || kind == llm.CapabilityToolChoice {
		serialized, _ := json.Marshal(response)
		return bytes.Contains(serialized, []byte("get_weather")) || bytes.Contains(serialized, []byte("tool_call")) || bytes.Contains(serialized, []byte("tool_use"))
	}
	return response != nil
}
