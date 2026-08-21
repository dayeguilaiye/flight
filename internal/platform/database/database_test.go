package database

import (
	"context"
	"testing"
)

func TestOpenAndApplyMigrations(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	db, err := Open(ctx, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })

	migrations := []Migration{{Name: "0001_test", SQL: "CREATE TABLE test_values (value TEXT NOT NULL)"}}
	if err := ApplyMigrations(ctx, db, migrations); err != nil {
		t.Fatal(err)
	}
	if err := ApplyMigrations(ctx, db, migrations); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, "INSERT INTO test_values (value) VALUES (?)", "ok"); err != nil {
		t.Fatal(err)
	}

	var value string
	if err := db.QueryRowContext(ctx, "SELECT value FROM test_values").Scan(&value); err != nil {
		t.Fatal(err)
	}
	if value != "ok" {
		t.Fatalf("value = %q", value)
	}
}
