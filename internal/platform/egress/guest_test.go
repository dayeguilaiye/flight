package egress

import (
	"context"
	"net"
	"testing"
)

func TestBlockedIP(t *testing.T) {
	for _, value := range []string{"127.0.0.1", "10.0.0.1", "192.168.1.1", "169.254.169.254", "::1"} {
		if !blockedIP(net.ParseIP(value)) {
			t.Errorf("%s was not blocked", value)
		}
	}
	if err := ValidateGuestURL(context.Background(), "http://example.com"); err == nil {
		t.Fatal("non-HTTPS URL accepted")
	}
}
