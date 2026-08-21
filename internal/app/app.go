package app

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/ziyuanhe/flight/internal/config"
	"github.com/ziyuanhe/flight/internal/httpapi"
	"github.com/ziyuanhe/flight/internal/platform/database"
	"github.com/ziyuanhe/flight/internal/web"
)

// App owns process-level dependencies and lifecycle. Features are wired here,
// rather than constructing their own database or HTTP servers.
type App struct {
	config config.Config
	db     *database.DB
	server *http.Server
}

// New opens shared infrastructure and wires the initial HTTP surface.
func New(ctx context.Context, cfg config.Config, logger *slog.Logger) (*App, error) {
	db, err := database.Open(ctx, cfg.DataDir)
	if err != nil {
		return nil, err
	}
	if err := database.ApplyMigrations(ctx, db, nil); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("apply migrations: %w", err)
	}

	if logger == nil {
		logger = slog.Default()
	}
	handler := httpapi.NewServer(web.Handler())
	return &App{
		config: cfg,
		db:     db,
		server: &http.Server{Addr: cfg.HTTPListenAddr, Handler: handler},
	}, nil
}

// Run serves HTTP until the server returns or the context is cancelled.
func (a *App) Run(ctx context.Context) error {
	serverErr := make(chan error, 1)
	go func() { serverErr <- a.server.ListenAndServe() }()

	select {
	case err := <-serverErr:
		if err == http.ErrServerClosed {
			return nil
		}
		return err
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := a.server.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("shutdown http server: %w", err)
		}
		return nil
	}
}

// Close releases application resources. It is safe to call after a failed run.
func (a *App) Close() error {
	if a == nil || a.db == nil {
		return nil
	}
	return a.db.Close()
}
