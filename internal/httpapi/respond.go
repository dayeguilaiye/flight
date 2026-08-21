package httpapi

import (
	"encoding/json"
	"net/http"
)

// WriteJSON writes a stable JSON response shape.
func WriteJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

// WriteError writes the project's public error contract.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	WriteJSON(w, status, map[string]any{"error": map[string]any{"code": code, "message": message}})
}
