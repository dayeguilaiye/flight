package llm_api_tester

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/ziyuanhe/flight/internal/httpapi"
	"github.com/ziyuanhe/flight/internal/platform/auth"
)

const (
	guestRunTimeout      = 30 * time.Second
	guestMaxTargets      = 4
	guestMaxCapabilities = 5
)

// RunHandler is intentionally separate from owner CRUD: it accepts ephemeral
// guest configuration but never exposes persistence operations.
type RunHandler struct {
	service *Service
	auth    *auth.SessionManager
}

// NewRunHandler creates the public/owner test execution endpoint.
func NewRunHandler(service *Service, manager *auth.SessionManager) *RunHandler {
	return &RunHandler{service: service, auth: manager}
}

// ServeHTTP handles POST /api/v1/llm-api-tester/test-runs.
func (h *RunHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/api/v1/llm-api-tester/test-runs" {
		http.NotFound(w, r)
		return
	}
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		httpapi.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed.")
		return
	}
	var request testRunRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		httpapi.WriteError(w, http.StatusBadRequest, "invalid_json", "The request is invalid.")
		return
	}
	owner := h.auth.IsOwner(r, time.Now().UTC())
	if err := request.validate(owner); err != nil {
		httpapi.WriteError(w, http.StatusBadRequest, "invalid_input", err.Error())
		return
	}
	if request.hasPersistedTarget() && !owner {
		httpapi.WriteError(w, http.StatusUnauthorized, "owner_required", "Owner authentication is required for persisted models.")
		return
	}
	ctx := r.Context()
	if !owner {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, guestRunTimeout)
		defer cancel()
		ctx = WithGuestRequest(ctx)
	}
	if r.Header.Get("Accept") == "text/event-stream" {
		h.runSSE(w, ctx, request)
		return
	}
	h.runJSON(w, ctx, request)
}

func (h *RunHandler) runJSON(w http.ResponseWriter, ctx context.Context, request testRunRequest) {
	results, err := h.execute(ctx, request, nil)
	if err != nil {
		httpapi.WriteError(w, http.StatusBadGateway, "test_run_failed", "The test run could not be completed.")
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, map[string]any{"results": results})
}

func (h *RunHandler) runSSE(w http.ResponseWriter, ctx context.Context, request testRunRequest) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		httpapi.WriteError(w, http.StatusInternalServerError, "streaming_unavailable", "Streaming is unavailable.")
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	events := make(chan runEvent, 32)
	type execution struct {
		results map[string]map[CapabilityType]CapabilityResult
		err     error
	}
	executionCh := make(chan execution, 1)
	go func() {
		results, err := h.execute(ctx, request, events)
		executionCh <- execution{results: results, err: err}
	}()
	for event := range events {
		writeSSE(w, event)
		flusher.Flush()
	}
	executed := <-executionCh
	results, err := executed.results, executed.err
	if err != nil {
		writeSSE(w, runEvent{Kind: "error", Error: "The test run could not be completed."})
		flusher.Flush()
		return
	}
	writeSSE(w, runEvent{Kind: "complete", Results: results})
	flusher.Flush()
}

func (h *RunHandler) execute(ctx context.Context, request testRunRequest, events chan<- runEvent) (map[string]map[CapabilityType]CapabilityResult, error) {
	if events != nil {
		defer close(events)
	}
	results := make(map[string]map[CapabilityType]CapabilityResult, len(request.Targets))
	var mu sync.Mutex
	var wg sync.WaitGroup
	errCh := make(chan error, len(request.Targets))
	for _, target := range request.Targets {
		target := target
		wg.Add(1)
		go func() {
			defer wg.Done()
			ref := target.reference()
			if events != nil {
				events <- runEvent{Kind: "started", ModelRef: ref}
			}
			sink := func(capability CapabilityType, event TestEvent) {
				if events != nil {
					events <- runEvent{Kind: "progress", ModelRef: ref, Capability: capability, Delta: event.Delta}
				}
			}
			var output map[CapabilityType]CapabilityResult
			var err error
			if target.ModelID != nil {
				output, err = h.service.RunPersistedCapabilities(ctx, *target.ModelID, request.Capabilities, sink)
			} else {
				output, err = h.service.RunEphemeralCapabilities(ctx, EphemeralTarget{BaseURL: target.BaseURL, Token: target.Token, ModelName: target.ModelName, InterfaceType: target.InterfaceType, MaxConcurrency: target.MaxConcurrency}, request.Capabilities, sink)
			}
			if err != nil {
				errCh <- err
				return
			}
			if events != nil {
				for capability, result := range output {
					events <- runEvent{Kind: "result", ModelRef: ref, Capability: capability, Result: &result}
				}
			}
			mu.Lock()
			results[ref] = output
			mu.Unlock()
		}()
	}
	wg.Wait()
	close(errCh)
	if err := <-errCh; err != nil {
		return nil, err
	}
	return results, nil
}

type testRunRequest struct {
	Targets      []testTarget     `json:"targets"`
	Capabilities []CapabilityType `json:"capabilities"`
}

type testTarget struct {
	ModelID        *int64        `json:"modelId,omitempty"`
	BaseURL        string        `json:"baseUrl,omitempty"`
	Token          string        `json:"token,omitempty"`
	ModelName      string        `json:"modelName,omitempty"`
	InterfaceType  InterfaceType `json:"interfaceType,omitempty"`
	MaxConcurrency *int          `json:"maxConcurrency,omitempty"`
}

func (r testRunRequest) validate(owner bool) error {
	if len(r.Targets) == 0 {
		return errors.New("at least one test target is required")
	}
	if len(r.Capabilities) == 0 {
		return errors.New("at least one capability is required")
	}
	if !owner && (len(r.Targets) > guestMaxTargets || len(r.Capabilities) > guestMaxCapabilities) {
		return errors.New("guest test run exceeds the request limit")
	}
	seen := make(map[CapabilityType]struct{}, len(r.Capabilities))
	for _, capability := range r.Capabilities {
		if !containsCapability(capability) {
			return errors.New("unknown capability")
		}
		if _, ok := seen[capability]; ok {
			return errors.New("duplicate capability")
		}
		seen[capability] = struct{}{}
	}
	for _, target := range r.Targets {
		if (target.ModelID == nil) == (target.BaseURL == "") {
			return errors.New("each target must be persisted modelId or ephemeral configuration")
		}
		if target.ModelID != nil && *target.ModelID < 1 {
			return errors.New("modelId is invalid")
		}
		if target.ModelID == nil {
			if target.Token == "" || target.ModelName == "" || !target.InterfaceType.Valid() {
				return errors.New("ephemeral target configuration is incomplete")
			}
		}
	}
	return nil
}

func (r testRunRequest) hasPersistedTarget() bool {
	for _, target := range r.Targets {
		if target.ModelID != nil {
			return true
		}
	}
	return false
}

func containsCapability(value CapabilityType) bool {
	for _, capability := range AllCapabilities {
		if capability == value {
			return true
		}
	}
	return false
}

func (target testTarget) reference() string {
	if target.ModelID != nil {
		return strconv.FormatInt(*target.ModelID, 10)
	}
	return target.ModelName
}

type runEvent struct {
	Kind       string                                         `json:"kind"`
	ModelRef   string                                         `json:"modelRef,omitempty"`
	Capability CapabilityType                                 `json:"capability,omitempty"`
	Delta      string                                         `json:"delta,omitempty"`
	Result     *CapabilityResult                              `json:"result,omitempty"`
	Results    map[string]map[CapabilityType]CapabilityResult `json:"results,omitempty"`
	Error      string                                         `json:"error,omitempty"`
}

func writeSSE(w http.ResponseWriter, event runEvent) {
	encoded, _ := json.Marshal(event)
	_, _ = w.Write([]byte("event: " + event.Kind + "\ndata: " + string(encoded) + "\n\n"))
}
