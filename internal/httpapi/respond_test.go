package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWritePublicErrorUsesStableEnvelope(t *testing.T) {
	recorder := httptest.NewRecorder()
	WritePublicError(recorder, http.StatusBadRequest, PublicError{
		Code:    "max_concurrency_invalid",
		Message: "Max concurrency must be at least 1.",
		Field:   "maxConcurrency",
		Params:  map[string]any{"min": 1},
	})

	var payload struct {
		Error PublicError `json:"error"`
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
