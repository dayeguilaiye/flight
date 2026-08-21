package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const cookieName = "flight_owner_session"

// SessionManager implements the single-owner session cookie. The payload is
// intentionally stateless: ownership is instance-wide, not a user-table row.
type SessionManager struct {
	passwordHash [32]byte
	key          []byte
	ttl          time.Duration
}

// NewSessionManager creates a manager using the configured admin password and
// master key. The master key is used only for signing session material here;
// token encryption has its own platform primitive.
func NewSessionManager(password, masterKey string) *SessionManager {
	key := sha256.Sum256([]byte(masterKey))
	return &SessionManager{
		passwordHash: sha256.Sum256([]byte(password)),
		key:          key[:],
		ttl:          24 * time.Hour,
	}
}

// CheckPassword compares an attempted password without leaking timing data.
func (s *SessionManager) CheckPassword(password string) bool {
	attempted := sha256.Sum256([]byte(password))
	return subtle.ConstantTimeCompare(attempted[:], s.passwordHash[:]) == 1
}

// SetOwnerCookie establishes an authenticated owner session.
func (s *SessionManager) SetOwnerCookie(w http.ResponseWriter, now time.Time) {
	s.SetOwnerCookieSecure(w, now, false)
}

// SetOwnerCookieSecure establishes a session and marks it Secure when the
// request was served over TLS.
func (s *SessionManager) SetOwnerCookieSecure(w http.ResponseWriter, now time.Time, secure bool) {
	expires := now.Add(s.ttl).Unix()
	payload := "owner." + strconv.FormatInt(expires, 10)
	signature := s.sign(payload)
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    base64.RawURLEncoding.EncodeToString([]byte(payload + "." + signature)),
		Path:     "/",
		Expires:  time.Unix(expires, 0),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   secure,
	})
}

// ClearCookie expires the owner session.
func (s *SessionManager) ClearCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{Name: cookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, SameSite: http.SameSiteLaxMode})
}

// IsOwner reports whether the request carries a valid, unexpired owner cookie.
func (s *SessionManager) IsOwner(r *http.Request, now time.Time) bool {
	cookie, err := r.Cookie(cookieName)
	if err != nil {
		return false
	}
	decoded, err := base64.RawURLEncoding.DecodeString(cookie.Value)
	if err != nil {
		return false
	}
	parts := strings.Split(string(decoded), ".")
	if len(parts) != 3 || parts[0] != "owner" {
		return false
	}
	if !hmac.Equal([]byte(parts[2]), []byte(s.sign(parts[0]+"."+parts[1]))) {
		return false
	}
	expires, err := strconv.ParseInt(parts[1], 10, 64)
	return err == nil && now.Unix() < expires
}

func (s *SessionManager) sign(payload string) string {
	mac := hmac.New(sha256.New, s.key)
	_, _ = mac.Write([]byte(payload))
	return fmt.Sprintf("%x", mac.Sum(nil))
}
