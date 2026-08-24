package httpapi

import (
	"encoding/json"
	"net/http"
)

// PublicError is the language-neutral error contract shared by JSON and
// streaming APIs. Message is an English diagnostic fallback; browser clients
// render Code through their active locale instead.
type PublicError struct {
	Code      string         `json:"code"`
	Message   string         `json:"message"`
	Field     string         `json:"field,omitempty"`
	Params    map[string]any `json:"params,omitempty"`
	RequestID string         `json:"requestId,omitempty"`
}

// WriteJSON writes a stable JSON response shape.
func WriteJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

// WriteError writes the project's public error contract.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	WritePublicError(w, status, PublicError{Code: code, Message: message})
}

// WritePublicError writes a structured public error with optional safe
// metadata. Callers must never put secrets or raw upstream payloads in it.
func WritePublicError(w http.ResponseWriter, status int, publicError PublicError) {
	WriteJSON(w, status, map[string]any{"error": publicError})
}
