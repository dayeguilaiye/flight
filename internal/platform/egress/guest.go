package egress

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/url"
	"strings"
)

// ValidateGuestURL enforces the public-HTTPS boundary for visitor requests.
// DNS is resolved before allowing a request so hostnames cannot point at
// loopback, private, link-local or cloud metadata addresses.
func ValidateGuestURL(ctx context.Context, raw string) error {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" || parsed.User != nil {
		return errors.New("guest requests require a public HTTPS URL")
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "localhost" || strings.HasSuffix(host, ".localhost") || host == "metadata.google.internal" {
		return errors.New("guest requests cannot target local or metadata hosts")
	}
	addresses, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil || len(addresses) == 0 {
		return errors.New("guest request host could not be resolved")
	}
	for _, address := range addresses {
		if blockedIP(address.IP) {
			return fmt.Errorf("guest request host resolves to a private address")
		}
	}
	return nil
}

func blockedIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() || ip.Equal(net.ParseIP("169.254.169.254"))
}
