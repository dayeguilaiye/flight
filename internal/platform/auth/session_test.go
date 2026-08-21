package auth

import (
	"net/http/httptest"
	"testing"
	"time"
)

func TestSessionManager(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	manager := NewSessionManager("password", "a-master-key-that-is-long-enough")
	if !manager.CheckPassword("password") || manager.CheckPassword("wrong") {
		t.Fatal("password comparison failed")
	}
	recorder := httptest.NewRecorder()
	manager.SetOwnerCookie(recorder, now)
	request := httptest.NewRequest("GET", "/", nil)
	for _, cookie := range recorder.Result().Cookies() {
		request.AddCookie(cookie)
	}
	if !manager.IsOwner(request, now.Add(time.Minute)) {
		t.Fatal("expected owner session")
	}
	if manager.IsOwner(request, now.Add(25*time.Hour)) {
		t.Fatal("expired session accepted")
	}
}
