package llm_api_tester

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ziyuanhe/flight/internal/platform/auth"
	"github.com/ziyuanhe/flight/internal/platform/database"
	"github.com/ziyuanhe/flight/internal/platform/secrets"
)

type runFakeAdapter struct{}

func (runFakeAdapter) InterfaceType() InterfaceType { return InterfaceOpenAIChat }
func (runFakeAdapter) RunCapability(_ context.Context, request CapabilityRequest, sink EventSink) CapabilityResult {
	if sink != nil {
		sink(TestEvent{Kind: "delta", Delta: "ok"})
	}
	return CapabilityResult{Status: StatusPassed, Response: map[string]any{"kind": request.Capability}}
}

type runFakeRegistry struct{}

func (runFakeRegistry) Adapter(interfaceType InterfaceType) (TestAdapter, bool) {
	return runFakeAdapter{}, interfaceType == InterfaceOpenAIChat
}

func TestRunHandlerSeparatesGuestAndOwnerData(t *testing.T) {
	ctx := context.Background()
	db, err := database.Open(ctx, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := database.ApplyMigrations(ctx, db, Migrations()); err != nil {
		t.Fatal(err)
	}
	box, _ := secrets.NewBox("master-key-that-is-long-enough")
	repository := NewSQLiteRepository(db)
	service := NewService(repository, box)
	service.SetAdapters(runFakeRegistry{})
	manager := auth.NewSessionManager("password", "master-key-that-is-long-enough")
	handler := NewRunHandler(service, manager)

	guestBody := `{"targets":[{"baseUrl":"https://api.example.com","token":"guest-token","modelName":"guest-model","interfaceType":"openai_chat"},{"baseUrl":"https://api.example.com","token":"guest-token-2","modelName":"guest-model-2","interfaceType":"openai_chat"}],"capabilities":["stream"]}`
	guestRequest := httptest.NewRequest(http.MethodPost, "/api/v1/llm-api-tester/test-runs", strings.NewReader(guestBody))
	guestRequest.Header.Set("Content-Type", "application/json")
	guestResponse := httptest.NewRecorder()
	handler.ServeHTTP(guestResponse, guestRequest)
	if guestResponse.Code != http.StatusOK {
		t.Fatalf("guest status = %d body=%s", guestResponse.Code, guestResponse.Body.String())
	}
	var guestPayload map[string]any
	if err := json.Unmarshal(guestResponse.Body.Bytes(), &guestPayload); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(guestResponse.Body.String(), "guest-token") {
		t.Fatal("guest token leaked in response")
	}
	if results, ok := guestPayload["results"].(map[string]any); !ok || len(results) != 2 {
		t.Fatalf("guest multi-target results = %#v", guestPayload["results"])
	}
	providers, err := service.ListProviders(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(providers) != 0 {
		t.Fatal("guest run created durable provider data")
	}

	token := "owner-token"
	provider, err := service.CreateProvider(ctx, ProviderInput{Name: "owner", BaseURL: "https://api.example.com", Token: &token})
	if err != nil {
		t.Fatal(err)
	}
	model, err := service.CreateModel(ctx, provider.ID, ModelInput{Name: "owner-model", InterfaceType: InterfaceOpenAIChat})
	if err != nil {
		t.Fatal(err)
	}
	loginRecorder := httptest.NewRecorder()
	manager.SetOwnerCookie(loginRecorder, nowUTC())
	ownerRequest := httptest.NewRequest(http.MethodPost, "/api/v1/llm-api-tester/test-runs", bytes.NewBufferString(`{"targets":[{"modelId":1}],"capabilities":["tool_use"]}`))
	for _, cookie := range loginRecorder.Result().Cookies() {
		ownerRequest.AddCookie(cookie)
	}
	ownerResponse := httptest.NewRecorder()
	handler.ServeHTTP(ownerResponse, ownerRequest)
	if ownerResponse.Code != http.StatusOK {
		t.Fatalf("owner status = %d body=%s", ownerResponse.Code, ownerResponse.Body.String())
	}
	providers, err = service.ListProviders(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if providers[0].Models[0].Results[CapabilityToolUse].Status != StatusPassed {
		t.Fatal("owner result was not persisted")
	}
	_ = model

	unauthorized := httptest.NewRecorder()
	unauthorizedRequest := httptest.NewRequest(http.MethodPost, "/api/v1/llm-api-tester/test-runs", bytes.NewBufferString(`{"targets":[{"modelId":1}],"capabilities":["tool_use"]}`))
	handler.ServeHTTP(unauthorized, unauthorizedRequest)
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("unauthorized status = %d", unauthorized.Code)
	}
}

func TestRunHandlerReturnsStructuredValidationError(t *testing.T) {
	box, _ := secrets.NewBox("master-key-that-is-long-enough")
	manager := auth.NewSessionManager("password", "master-key-that-is-long-enough")
	handler := NewRunHandler(NewService(nil, box), manager)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/llm-api-tester/test-runs", strings.NewReader(`{"targets":[],"capabilities":["stream"]}`))
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	var payload struct {
		Error struct {
			Code  string `json:"code"`
			Field string `json:"field"`
		} `json:"error"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if response.Code != http.StatusBadRequest || payload.Error.Code != "test_target_required" || payload.Error.Field != "targets" {
		t.Fatalf("response = status %d payload %#v", response.Code, payload)
	}
}

func TestRunHandlerSSEUsesStructuredPublicError(t *testing.T) {
	box, _ := secrets.NewBox("master-key-that-is-long-enough")
	manager := auth.NewSessionManager("password", "master-key-that-is-long-enough")
	handler := NewRunHandler(NewService(nil, box), manager)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/llm-api-tester/test-runs", strings.NewReader(`{"targets":[{"baseUrl":"https://api.example.com","token":"token","modelName":"model","interfaceType":"openai_chat"}],"capabilities":["stream"]}`))
	request.Header.Set("Accept", "text/event-stream")
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	body := response.Body.String()
	if !strings.Contains(body, `"kind":"error"`) || !strings.Contains(body, `"error":{"code":"test_run_failed"`) {
		t.Fatalf("SSE body does not contain a structured public error: %s", body)
	}
	if strings.Contains(body, "test adapters are not configured") {
		t.Fatalf("SSE leaked internal error: %s", body)
	}
}
