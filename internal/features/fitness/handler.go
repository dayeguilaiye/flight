package fitness

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ziyuanhe/flight/internal/httpapi"
	"github.com/ziyuanhe/flight/internal/platform/auth"
)

const routePrefix = "/api/v1/fitness"

// Handler exposes the owner-only fitness API under /api/v1/fitness.
type Handler struct {
	service *Service
	auth    *auth.SessionManager
	now     func() time.Time
}

// NewHandler creates the fitness HTTP handler.
func NewHandler(service *Service, manager *auth.SessionManager) *Handler {
	return &Handler{service: service, auth: manager, now: time.Now}
}

// ServeHTTP routes fitness requests. Every route requires the owner session.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !h.auth.IsOwner(r, h.now()) {
		httpapi.WriteError(w, http.StatusUnauthorized, "owner_required", "Owner authentication is required.")
		return
	}
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, routePrefix), "/")
	parts := strings.Split(path, "/")
	switch {
	case path == "state" && r.Method == http.MethodGet:
		h.respond(w, r, http.StatusOK, func() (State, error) { return h.service.State(r.Context()) })
	case path == "workouts" && r.Method == http.MethodPost:
		h.addWorkout(w, r)
	case len(parts) == 2 && parts[0] == "workouts" && r.Method == http.MethodDelete:
		id, ok := parseID(w, parts[1])
		if !ok {
			return
		}
		h.respond(w, r, http.StatusOK, func() (State, error) { return h.service.DeleteWorkout(r.Context(), id) })
	case path == "redemptions" && r.Method == http.MethodPost:
		var request struct {
			Kind RewardKind `json:"kind"`
		}
		if !decodeJSON(w, r, &request) {
			return
		}
		h.respond(w, r, http.StatusCreated, func() (State, error) { return h.service.Redeem(r.Context(), request.Kind) })
	case len(parts) == 3 && parts[0] == "items" && parts[2] == "eat" && r.Method == http.MethodPost:
		id, ok := parseID(w, parts[1])
		if !ok {
			return
		}
		h.respond(w, r, http.StatusOK, func() (State, error) { return h.service.EatItem(r.Context(), id) })
	default:
		http.NotFound(w, r)
	}
}

func (h *Handler) addWorkout(w http.ResponseWriter, r *http.Request) {
	var request struct {
		DurationMinutes int     `json:"durationMinutes"`
		EndedAt         *string `json:"endedAt"`
		Note            string  `json:"note"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	input := WorkoutInput{DurationMinutes: request.DurationMinutes, Note: request.Note}
	if request.EndedAt != nil && *request.EndedAt != "" {
		endedAt, err := time.Parse(time.RFC3339, *request.EndedAt)
		if err != nil {
			httpapi.WritePublicError(w, http.StatusBadRequest, httpapi.PublicError{Code: "workout_end_invalid", Message: "End time must be an RFC 3339 timestamp.", Field: "endedAt"})
			return
		}
		input.EndedAt = &endedAt
	}
	h.respond(w, r, http.StatusCreated, func() (State, error) { return h.service.AddWorkout(r.Context(), input) })
}

func (h *Handler) respond(w http.ResponseWriter, r *http.Request, status int, run func() (State, error)) {
	state, err := run()
	if err != nil {
		writeDomainError(w, r, err)
		return
	}
	httpapi.WriteJSON(w, status, state)
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
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

func writeDomainError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, errNotFound):
		httpapi.WriteError(w, http.StatusNotFound, "not_found", "The resource was not found.")
	case errors.Is(err, errDurationInvalid):
		httpapi.WritePublicError(w, http.StatusBadRequest, httpapi.PublicError{
			Code: "workout_duration_invalid", Message: "Workout duration is out of range.", Field: "durationMinutes",
			Params: map[string]any{"min": MinWorkoutMinutes, "max": MaxWorkoutMinutes},
		})
	case errors.Is(err, errEndInFuture):
		httpapi.WritePublicError(w, http.StatusBadRequest, httpapi.PublicError{Code: "workout_end_in_future", Message: "End time cannot be in the future.", Field: "endedAt"})
	case errors.Is(err, errNoteTooLong):
		httpapi.WritePublicError(w, http.StatusBadRequest, httpapi.PublicError{
			Code: "workout_note_too_long", Message: "Workout note is too long.", Field: "note",
			Params: map[string]any{"max": MaxNoteLength},
		})
	case errors.Is(err, errRewardKindUnknown):
		httpapi.WritePublicError(w, http.StatusBadRequest, httpapi.PublicError{Code: "reward_kind_unknown", Message: "Reward kind is unknown.", Field: "kind"})
	case errors.Is(err, errCoinsInsufficient):
		httpapi.WriteError(w, http.StatusConflict, "coins_insufficient", "The coin balance is insufficient.")
	case errors.Is(err, errDeleteWouldOverdraw):
		httpapi.WriteError(w, http.StatusConflict, "workout_delete_would_overdraw", "Deleting this workout would make the coin balance negative.")
	case errors.Is(err, errItemAlreadyEaten):
		httpapi.WriteError(w, http.StatusConflict, "item_already_eaten", "The item has already been eaten.")
	default:
		slog.ErrorContext(r.Context(), "fitness request failed", "method", r.Method, "path", r.URL.Path, "error", err)
		httpapi.WriteError(w, http.StatusInternalServerError, "internal_error", "The request could not be completed.")
	}
}
