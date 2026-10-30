package auth

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestLoginCookieTransport(t *testing.T) {
	for _, test := range []struct {
		name        string
		url         string
		forceSecure bool
		wantSecure  bool
	}{
		{"local HTTP", "http://localhost/api/v1/auth/login", false, false},
		{"direct HTTPS", "https://www.hitnrun.cn/api/v1/auth/login", false, true},
		{"TLS proxy", "http://flight/api/v1/auth/login", true, true},
	} {
		t.Run(test.name, func(t *testing.T) {
			h := NewHandler(NewSessionManager("password", "a-master-key-that-is-long-enough"))
			if test.forceSecure {
				h.RequireSecureCookies()
			}
			request := httptest.NewRequest(http.MethodPost, test.url, strings.NewReader(`{"password":"password"}`))
			response := httptest.NewRecorder()
			h.ServeHTTP(response, request)
			cookies := response.Result().Cookies()
			if response.Code != http.StatusOK || response.Body.String() != "{\"authenticated\":true}\n" || len(cookies) != 1 {
				t.Fatalf("login failed: %d %s", response.Code, response.Body.String())
			}
			if cookies[0].Secure != test.wantSecure || !cookies[0].HttpOnly {
				t.Fatalf("unexpected cookie flags: %+v", cookies[0])
			}
		})
	}
}
