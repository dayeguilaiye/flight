package auth

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/ziyuanhe/flight/internal/httpapi"
)

// Handler exposes the public login/session endpoints for the single owner.
type Handler struct {
	manager *SessionManager
	now     func() time.Time
}

// NewHandler creates an auth HTTP handler.
func NewHandler(manager *SessionManager) *Handler {
	return &Handler{manager: manager, now: time.Now}
}

// ServeHTTP handles /api/v1/auth/* routes.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/api/v1/auth/login":
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			httpapi.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed.")
			return
		}
		h.login(w, r)
	case "/api/v1/auth/logout":
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			httpapi.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed.")
			return
		}
		h.manager.ClearCookie(w)
		httpapi.WriteJSON(w, http.StatusOK, map[string]bool{"authenticated": false})
	case "/api/v1/auth/session":
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			httpapi.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed.")
			return
		}
		httpapi.WriteJSON(w, http.StatusOK, map[string]bool{"authenticated": h.manager.IsOwner(r, h.now())})
	default:
		http.NotFound(w, r)
	}
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Password string `json:"password"`
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		httpapi.WriteError(w, http.StatusBadRequest, "invalid_json", "The request is invalid.")
		return
	}
	if !h.manager.CheckPassword(request.Password) {
		httpapi.WriteError(w, http.StatusUnauthorized, "invalid_credentials", "The credentials are invalid.")
		return
	}
	h.manager.SetOwnerCookie(w, h.now())
	httpapi.WriteJSON(w, http.StatusOK, map[string]bool{"authenticated": true})
}
