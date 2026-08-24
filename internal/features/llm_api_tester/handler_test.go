package llm_api_tester

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ziyuanhe/flight/internal/httpapi"
)

func TestWriteDomainErrorUsesSpecificStableCode(t *testing.T) {
	recorder := httptest.NewRecorder()
	writeDomainError(recorder, errMaxConcurrencyInvalid)

	var payload struct {
		Error httpapi.PublicError `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if recorder.Code != http.StatusBadRequest || payload.Error.Code != "max_concurrency_invalid" {
		t.Fatalf("response = status %d payload %#v", recorder.Code, payload)
	}
	if payload.Error.Field != "maxConcurrency" || payload.Error.Params["min"].(float64) != 1 {
		t.Fatalf("error metadata = %#v", payload.Error)
	}
}
