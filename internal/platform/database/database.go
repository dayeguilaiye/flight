package database

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// DB is the single application-owned SQLite handle. It is safe for concurrent
// use and is injected into feature repositories by the composition root.
type DB struct {
	*sql.DB
}

// Open creates the shared SQLite instance at dataDir/flight.sqlite3.
func Open(ctx context.Context, dataDir string) (*DB, error) {
	if err := os.MkdirAll(dataDir, 0o750); err != nil {
		return nil, fmt.Errorf("create data directory: %w", err)
	}

	path := filepath.Join(dataDir, "flight.sqlite3")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite database: %w", err)
	}

	// SQLite has one writer. A single pooled connection avoids accidental
	// feature-level pools while WAL and busy_timeout keep reads responsive.
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	pragmas := []string{
		"PRAGMA busy_timeout = 5000",
		"PRAGMA foreign_keys = ON",
		"PRAGMA journal_mode = WAL",
	}
	for _, pragma := range pragmas {
		if _, err := db.ExecContext(ctx, pragma); err != nil {
			db.Close()
			return nil, fmt.Errorf("configure sqlite (%s): %w", pragma, err)
		}
	}
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping sqlite database: %w", err)
	}
	return &DB{DB: db}, nil
}

// Close releases the shared database resources.
func (db *DB) Close() error {
	if db == nil || db.DB == nil {
		return nil
	}
	return db.DB.Close()
}

// Migration is a feature-owned schema change applied by the application.
type Migration struct {
	Name string
	SQL  string
}

// ApplyMigrations applies each registered migration once, in registration
// order, using the shared database instance.
func ApplyMigrations(ctx context.Context, db *DB, migrations []Migration) error {
	if _, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			name TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL
		)
	`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	for _, migration := range migrations {
		var exists int
		if err := db.QueryRowContext(ctx, "SELECT 1 FROM schema_migrations WHERE name = ?", migration.Name).Scan(&exists); err != sql.ErrNoRows && err != nil {
			return fmt.Errorf("check migration %q: %w", migration.Name, err)
		}
		if exists == 1 {
			continue
		}

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("begin migration %q: %w", migration.Name, err)
		}
		if _, err := tx.ExecContext(ctx, migration.SQL); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("apply migration %q: %w", migration.Name, err)
		}
		if _, err := tx.ExecContext(ctx, "INSERT INTO schema_migrations (name, applied_at) VALUES (?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))", migration.Name); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record migration %q: %w", migration.Name, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %q: %w", migration.Name, err)
		}
	}
	return nil
}
