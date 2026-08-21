package httpapi

import (
	"encoding/json"
	"net/http"
	"time"
)

// Server is the application HTTP handler. Feature routes are registered by
// the composition root; the fallback serves the embedded frontend.
type Server struct {
	frontend http.Handler
}

// NewServer creates an HTTP server handler around the frontend fallback.
func NewServer(frontend http.Handler) *Server {
	return &Server{frontend: frontend}
}

// ServeHTTP routes health checks and delegates all other paths.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/api/health" {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "ok",
			"time":   time.Now().UTC().Format(time.RFC3339Nano),
		})
		return
	}
	if s.frontend != nil {
		s.frontend.ServeHTTP(w, r)
		return
	}
	http.NotFound(w, r)
}
