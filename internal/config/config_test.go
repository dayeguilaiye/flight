package config

import "testing"

func TestSecureCookiesConfiguration(t *testing.T) {
	t.Setenv("FLIGHT_ADMIN_PASSWORD", "password")
	t.Setenv("FLIGHT_MASTER_KEY", "a-master-key-that-is-long-enough")
	for _, test := range []struct {
		value   string
		want    bool
		invalid bool
	}{{"", false, false}, {"true", true, false}, {"false", false, false}, {"invalid", false, true}} {
		t.Run(test.value, func(t *testing.T) {
			t.Setenv("FLIGHT_SECURE_COOKIES", test.value)
			cfg, err := Load()
			if (err != nil) != test.invalid || cfg.SecureCookies != test.want {
				t.Fatalf("Load() secure=%v, error=%v", cfg.SecureCookies, err)
			}
		})
	}
}
