package llm_api_tester

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ziyuanhe/flight/internal/httpapi"
	"github.com/ziyuanhe/flight/internal/platform/auth"
)

// Handler exposes owner-scoped configuration APIs. Test-run endpoints are
// added separately so guest requests cannot accidentally reach this handler.
type Handler struct {
	service *Service
	auth    *auth.SessionManager
}

// NewHandler creates the owner configuration handler.
func NewHandler(service *Service, manager *auth.SessionManager) *Handler {
	return &Handler{service: service, auth: manager}
}

// ServeHTTP handles provider/model CRUD routes.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !h.auth.IsOwner(r, nowUTC()) {
		httpapi.WriteError(w, http.StatusUnauthorized, "owner_required", "Owner authentication is required.")
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/llm-api-tester")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	switch {
	case path == "/providers" && r.Method == http.MethodGet:
		h.listProviders(w, r)
	case path == "/providers" && r.Method == http.MethodPost:
		h.createProvider(w, r)
	case len(parts) == 2 && parts[0] == "providers" && r.Method == http.MethodPatch:
		h.updateProvider(w, r, parts[1])
	case len(parts) == 2 && parts[0] == "providers" && r.Method == http.MethodDelete:
		h.deleteProvider(w, r, parts[1])
	case len(parts) == 3 && parts[0] == "providers" && parts[2] == "models" && r.Method == http.MethodPost:
		h.createModel(w, r, parts[1])
	case len(parts) == 2 && parts[0] == "models" && r.Method == http.MethodPatch:
		h.updateModel(w, r, parts[1])
	case len(parts) == 2 && parts[0] == "models" && r.Method == http.MethodDelete:
		h.deleteModel(w, r, parts[1])
	default:
		http.NotFound(w, r)
	}
}

func (h *Handler) listProviders(w http.ResponseWriter, r *http.Request) {
	providers, err := h.service.ListProviders(r.Context())
	if err != nil {
		httpapi.WriteError(w, http.StatusInternalServerError, "internal_error", "Unable to load providers.")
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, map[string]any{"providers": providers})
}

func (h *Handler) createProvider(w http.ResponseWriter, r *http.Request) {
	var request providerRequest
	if !decodeJSON(w, r, &request) {
		return
	}
	provider, err := h.service.CreateProvider(r.Context(), request.input())
	if err != nil {
		writeDomainError(w, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusCreated, provider)
}

func (h *Handler) updateProvider(w http.ResponseWriter, r *http.Request, rawID string) {
	id, ok := parseID(w, rawID)
	if !ok {
		return
	}
	var request providerRequest
	if !decodeJSON(w, r, &request) {
		return
	}
	provider, err := h.service.UpdateProvider(r.Context(), id, request.input())
	if err != nil {
		writeDomainError(w, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, provider)
}

func (h *Handler) deleteProvider(w http.ResponseWriter, r *http.Request, rawID string) {
	id, ok := parseID(w, rawID)
	if !ok {
		return
	}
	if err := h.service.DeleteProvider(r.Context(), id); err != nil {
		writeDomainError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) createModel(w http.ResponseWriter, r *http.Request, rawProviderID string) {
	providerID, ok := parseID(w, rawProviderID)
	if !ok {
		return
	}
	var request modelRequest
	if !decodeJSON(w, r, &request) {
		return
	}
	model, err := h.service.CreateModel(r.Context(), providerID, request.input())
	if err != nil {
		writeDomainError(w, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusCreated, model)
}

func (h *Handler) updateModel(w http.ResponseWriter, r *http.Request, rawID string) {
	id, ok := parseID(w, rawID)
	if !ok {
		return
	}
	var request modelRequest
	if !decodeJSON(w, r, &request) {
		return
	}
	model, err := h.service.UpdateModel(r.Context(), id, request.input())
	if err != nil {
		writeDomainError(w, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, model)
}

func (h *Handler) deleteModel(w http.ResponseWriter, r *http.Request, rawID string) {
	id, ok := parseID(w, rawID)
	if !ok {
		return
	}
	if err := h.service.DeleteModel(r.Context(), id); err != nil {
		writeDomainError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type providerRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	BaseURL     string  `json:"baseUrl"`
	Token       *string `json:"token"`
}

func (r providerRequest) input() ProviderInput {
	return ProviderInput{Name: r.Name, Description: r.Description, BaseURL: r.BaseURL, Token: r.Token}
}

type modelRequest struct {
	Name           string        `json:"name"`
	InterfaceType  InterfaceType `json:"interfaceType"`
	MaxConcurrency *int          `json:"maxConcurrency"`
}

func (r modelRequest) input() ModelInput {
	return ModelInput{Name: r.Name, InterfaceType: r.InterfaceType, MaxConcurrency: r.MaxConcurrency}
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		httpapi.WriteError(w, http.StatusBadRequest, "invalid_json", "The request is invalid.")
		return false
	}
	return true
}

func parseID(w http.ResponseWriter, value string) (int64, bool) {
	id, err := strconv.ParseInt(value, 10, 64)
	if err != nil || id < 1 {
		httpapi.WriteError(w, http.StatusBadRequest, "invalid_id", "The resource id is invalid.")
		return 0, false
	}
	return id, true
}

func writeDomainError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, sql.ErrNoRows):
		httpapi.WriteError(w, http.StatusNotFound, "not_found", "The resource was not found.")
	default:
		httpapi.WriteError(w, http.StatusBadRequest, "invalid_input", "The request is invalid.")
	}
}

func nowUTC() time.Time { return time.Now().UTC() }
