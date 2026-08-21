package egress

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
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

// GuestTransport resolves and validates the destination at dial time as well
// as during URL preflight. This closes the common DNS-rebinding gap between a
// hostname check and the actual TCP connection.
func GuestTransport(base http.RoundTripper) http.RoundTripper {
	transport, ok := base.(*http.Transport)
	if !ok || transport == nil {
		transport, _ = http.DefaultTransport.(*http.Transport)
	}
	clone := transport.Clone()
	clone.Proxy = nil
	clone.DialContext = func(ctx context.Context, network, address string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(address)
		if err != nil {
			return nil, err
		}
		addresses, err := net.DefaultResolver.LookupIPAddr(ctx, host)
		if err != nil {
			return nil, err
		}
		for _, address := range addresses {
			ip := address.IP
			if blockedIP(ip) {
				continue
			}
			connection, err := (&net.Dialer{}).DialContext(ctx, network, net.JoinHostPort(ip.String(), port))
			if err == nil {
				return connection, nil
			}
		}
		return nil, errors.New("guest request host did not resolve to a reachable public address")
	}
	return clone
}
