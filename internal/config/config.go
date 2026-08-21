package config

import (
	"errors"
	"fmt"
	"os"
)

// Config contains process-wide runtime configuration.
type Config struct {
	DataDir        string
	AdminPassword  string
	MasterKey      string
	HTTPListenAddr string
}

// Load reads configuration from the environment. Secrets are validated here
// so the application cannot start in a mode that would make secret handling
// ambiguous.
func Load() (Config, error) {
	dataDir := os.Getenv("FLIGHT_DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}

	listenAddr := os.Getenv("FLIGHT_HTTP_ADDR")
	if listenAddr == "" {
		listenAddr = ":8080"
	}

	cfg := Config{
		DataDir:        dataDir,
		AdminPassword:  os.Getenv("FLIGHT_ADMIN_PASSWORD"),
		MasterKey:      os.Getenv("FLIGHT_MASTER_KEY"),
		HTTPListenAddr: listenAddr,
	}
	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

// Validate checks configuration required for safe owner data and token access.
func (c Config) Validate() error {
	if c.DataDir == "" {
		return errors.New("FLIGHT_DATA_DIR must not be empty")
	}
	if c.AdminPassword == "" {
		return errors.New("FLIGHT_ADMIN_PASSWORD is required")
	}
	if len(c.MasterKey) < 16 {
		return fmt.Errorf("FLIGHT_MASTER_KEY must be at least 16 characters")
	}
	if c.HTTPListenAddr == "" {
		return errors.New("FLIGHT_HTTP_ADDR must not be empty")
	}
	return nil
}
