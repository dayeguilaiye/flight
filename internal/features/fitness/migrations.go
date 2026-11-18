package fitness

import "github.com/ziyuanhe/flight/internal/platform/database"

// Migrations returns this feature's schema changes for the application-level
// migration coordinator.
func Migrations() []database.Migration {
	return []database.Migration{{
		Name: "fitness.0001_initial",
		SQL: `
CREATE TABLE fitness_workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    ended_at TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX fitness_workouts_ended_at_idx ON fitness_workouts(ended_at);

CREATE TABLE fitness_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    cost INTEGER NOT NULL CHECK (cost > 0),
    redeemed_at TEXT NOT NULL,
    eaten_at TEXT
);
`,
	}}
}
