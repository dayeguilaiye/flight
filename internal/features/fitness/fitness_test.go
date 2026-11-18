package fitness

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ziyuanhe/flight/internal/httpapi"
	"github.com/ziyuanhe/flight/internal/platform/auth"
	"github.com/ziyuanhe/flight/internal/platform/database"
)

var fixedNow = time.Date(2026, 11, 18, 20, 0, 0, 0, time.UTC)

func TestSummarize(t *testing.T) {
	cases := []struct {
		name            string
		minutes, spent  int
		earned, balance int
		towardNext      int
	}{
		{name: "empty", minutes: 0, spent: 0, earned: 0, balance: 0, towardNext: 0},
		{name: "just short", minutes: 29, spent: 0, earned: 0, balance: 0, towardNext: 29},
		{name: "exact coin", minutes: 30, spent: 0, earned: 1, balance: 1, towardNext: 0},
		{name: "spent some", minutes: 245, spent: 5, earned: 8, balance: 3, towardNext: 5},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := Summarize(tc.minutes, tc.spent)
			if got.CoinsEarned != tc.earned || got.CoinBalance != tc.balance || got.MinutesTowardNextCoin != tc.towardNext || got.MinutesPerCoin != 30 {
				t.Fatalf("Summarize(%d, %d) = %#v", tc.minutes, tc.spent, got)
			}
		})
	}
}

func TestWorkoutInputValidation(t *testing.T) {
	future := fixedNow.Add(10 * time.Minute)
	nearFuture := fixedNow.Add(2 * time.Minute)
	longNote := string(bytes.Repeat([]byte("动"), MaxNoteLength+1))
	cases := []struct {
		name  string
		input WorkoutInput
		want  error
	}{
		{name: "zero duration", input: WorkoutInput{DurationMinutes: 0}, want: errDurationInvalid},
		{name: "too long", input: WorkoutInput{DurationMinutes: MaxWorkoutMinutes + 1}, want: errDurationInvalid},
		{name: "future end", input: WorkoutInput{DurationMinutes: 30, EndedAt: &future}, want: errEndInFuture},
		{name: "clock skew allowed", input: WorkoutInput{DurationMinutes: 30, EndedAt: &nearFuture}},
		{name: "note too long", input: WorkoutInput{DurationMinutes: 30, Note: longNote}, want: errNoteTooLong},
		{name: "defaults end to now", input: WorkoutInput{DurationMinutes: 30, Note: "  深蹲  "}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			workout, err := tc.input.toWorkout(fixedNow)
			if !errors.Is(err, tc.want) {
				t.Fatalf("error = %v, want %v", err, tc.want)
			}
			if tc.want == nil && tc.input.EndedAt == nil && (!workout.EndedAt.Equal(fixedNow) || workout.Note != "深蹲") {
				t.Fatalf("workout = %#v", workout)
			}
		})
	}
}

func newTestService(t *testing.T) *Service {
	t.Helper()
	ctx := context.Background()
	db, err := database.Open(ctx, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := database.ApplyMigrations(ctx, db, Migrations()); err != nil {
		t.Fatal(err)
	}
	service := NewService(NewSQLiteRepository(db))
	service.now = func() time.Time { return fixedNow }
	return service
}

func TestServiceLedgerFlow(t *testing.T) {
	ctx := context.Background()
	service := newTestService(t)

	state, err := service.AddWorkout(ctx, WorkoutInput{DurationMinutes: 140, Note: "跑步"})
	if err != nil {
		t.Fatal(err)
	}
	if state.Summary.CoinBalance != 4 || state.Summary.MinutesTowardNextCoin != 20 {
		t.Fatalf("summary = %#v", state.Summary)
	}
	if _, err := service.Redeem(ctx, RewardIceCream); !errors.Is(err, errCoinsInsufficient) {
		t.Fatalf("redeem with 4 coins error = %v", err)
	}
	state, err = service.AddWorkout(ctx, WorkoutInput{DurationMinutes: 10})
	if err != nil {
		t.Fatal(err)
	}
	state, err = service.Redeem(ctx, RewardIceCream)
	if err != nil {
		t.Fatal(err)
	}
	if state.Summary.CoinBalance != 0 || state.Summary.CoinsSpent != 5 || len(state.Items) != 1 {
		t.Fatalf("after redeem = %#v", state)
	}
	if _, err := service.Redeem(ctx, RewardKind("cake")); !errors.Is(err, errRewardKindUnknown) {
		t.Fatalf("unknown reward error = %v", err)
	}

	// Removing the 140-minute workout would leave 0 coins earned against 5 spent.
	big := state.Workouts[len(state.Workouts)-1]
	if big.DurationMinutes != 140 {
		big = state.Workouts[0]
	}
	if _, err := service.DeleteWorkout(ctx, big.ID); !errors.Is(err, errDeleteWouldOverdraw) {
		t.Fatalf("overdraw delete error = %v", err)
	}
	if _, err := service.DeleteWorkout(ctx, 999); !errors.Is(err, errNotFound) {
		t.Fatalf("missing delete error = %v", err)
	}

	itemID := state.Items[0].ID
	state, err = service.EatItem(ctx, itemID)
	if err != nil {
		t.Fatal(err)
	}
	if state.Items[0].EatenAt == nil || !state.Items[0].EatenAt.Equal(fixedNow) {
		t.Fatalf("eaten item = %#v", state.Items[0])
	}
	if _, err := service.EatItem(ctx, itemID); !errors.Is(err, errItemAlreadyEaten) {
		t.Fatalf("second eat error = %v", err)
	}
}

func newTestHandler(t *testing.T) (*Handler, *http.Cookie) {
	t.Helper()
	manager := auth.NewSessionManager("password", "master-key-for-tests")
	handler := NewHandler(newTestService(t), manager)
	recorder := httptest.NewRecorder()
	manager.SetOwnerCookieSecure(recorder, time.Now(), false)
	cookies := recorder.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatal("owner cookie was not set")
	}
	return handler, cookies[0]
}

func serve(handler http.Handler, cookie *http.Cookie, method, path, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	if cookie != nil {
		request.AddCookie(cookie)
	}
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	return recorder
}

func decodePublicError(t *testing.T, recorder *httptest.ResponseRecorder) httpapi.PublicError {
	t.Helper()
	var payload struct {
		Error httpapi.PublicError `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	return payload.Error
}

func TestHandlerRequiresOwner(t *testing.T) {
	handler, _ := newTestHandler(t)
	recorder := serve(handler, nil, http.MethodGet, "/api/v1/fitness/state", "")
	if recorder.Code != http.StatusUnauthorized || decodePublicError(t, recorder).Code != "owner_required" {
		t.Fatalf("status = %d body = %s", recorder.Code, recorder.Body)
	}
}

func TestHandlerContract(t *testing.T) {
	handler, cookie := newTestHandler(t)

	recorder := serve(handler, cookie, http.MethodPost, "/api/v1/fitness/workouts", `{"durationMinutes":65,"endedAt":"2026-11-18T19:30:00+08:00","note":"卧推"}`)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("create status = %d body = %s", recorder.Code, recorder.Body)
	}
	var state State
	if err := json.Unmarshal(recorder.Body.Bytes(), &state); err != nil {
		t.Fatal(err)
	}
	if state.Summary.CoinBalance != 2 || len(state.Workouts) != 1 || state.Workouts[0].EndedAt.Format(time.RFC3339) != "2026-11-18T11:30:00Z" || len(state.Rewards) != 2 {
		t.Fatalf("state = %#v", state)
	}

	recorder = serve(handler, cookie, http.MethodPost, "/api/v1/fitness/workouts", `{"durationMinutes":0,"note":""}`)
	publicError := decodePublicError(t, recorder)
	if recorder.Code != http.StatusBadRequest || publicError.Code != "workout_duration_invalid" || publicError.Field != "durationMinutes" || publicError.Params["max"].(float64) != MaxWorkoutMinutes {
		t.Fatalf("invalid duration = %d %#v", recorder.Code, publicError)
	}

	recorder = serve(handler, cookie, http.MethodPost, "/api/v1/fitness/workouts", `{"durationMinutes":30,"endedAt":"yesterday"}`)
	if recorder.Code != http.StatusBadRequest || decodePublicError(t, recorder).Code != "workout_end_invalid" {
		t.Fatalf("invalid end = %d %s", recorder.Code, recorder.Body)
	}

	recorder = serve(handler, cookie, http.MethodPost, "/api/v1/fitness/redemptions", `{"kind":"sausage"}`)
	if recorder.Code != http.StatusConflict || decodePublicError(t, recorder).Code != "coins_insufficient" {
		t.Fatalf("insufficient = %d %s", recorder.Code, recorder.Body)
	}

	recorder = serve(handler, cookie, http.MethodPost, "/api/v1/fitness/items/abc/eat", `{}`)
	if recorder.Code != http.StatusBadRequest || decodePublicError(t, recorder).Code != "invalid_id" {
		t.Fatalf("invalid id = %d %s", recorder.Code, recorder.Body)
	}

	recorder = serve(handler, cookie, http.MethodPost, "/api/v1/fitness/items/42/eat", `{}`)
	if recorder.Code != http.StatusNotFound || decodePublicError(t, recorder).Code != "not_found" {
		t.Fatalf("missing item = %d %s", recorder.Code, recorder.Body)
	}

	recorder = serve(handler, cookie, http.MethodGet, "/api/v1/fitness/state", "")
	if recorder.Code != http.StatusOK {
		t.Fatalf("state status = %d", recorder.Code)
	}
}
