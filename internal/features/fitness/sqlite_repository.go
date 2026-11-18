package fitness

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/ziyuanhe/flight/internal/platform/database"
)

const timeLayout = time.RFC3339Nano

// SQLiteRepository stores fitness data in the shared SQLite database.
type SQLiteRepository struct {
	db *database.DB
}

// NewSQLiteRepository creates a repository on the shared database handle.
func NewSQLiteRepository(db *database.DB) *SQLiteRepository {
	return &SQLiteRepository{db: db}
}

// ListWorkouts returns all workouts, latest end time first.
func (r *SQLiteRepository) ListWorkouts(ctx context.Context) ([]Workout, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, duration_minutes, ended_at, note, created_at
FROM fitness_workouts
ORDER BY ended_at DESC, id DESC`)
	if err != nil {
		return nil, fmt.Errorf("list workouts: %w", err)
	}
	defer rows.Close()

	workouts := []Workout{}
	for rows.Next() {
		var workout Workout
		var endedAt, createdAt string
		if err := rows.Scan(&workout.ID, &workout.DurationMinutes, &endedAt, &workout.Note, &createdAt); err != nil {
			return nil, fmt.Errorf("scan workout: %w", err)
		}
		if workout.EndedAt, err = parseTime(endedAt); err != nil {
			return nil, err
		}
		if workout.CreatedAt, err = parseTime(createdAt); err != nil {
			return nil, err
		}
		workouts = append(workouts, workout)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate workouts: %w", err)
	}
	return workouts, nil
}

// ListItems returns all inventory items, latest redemption first.
func (r *SQLiteRepository) ListItems(ctx context.Context) ([]Item, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, kind, cost, redeemed_at, eaten_at
FROM fitness_items
ORDER BY redeemed_at DESC, id DESC`)
	if err != nil {
		return nil, fmt.Errorf("list items: %w", err)
	}
	defer rows.Close()

	items := []Item{}
	for rows.Next() {
		var item Item
		var kind, redeemedAt string
		var eatenAt sql.NullString
		if err := rows.Scan(&item.ID, &kind, &item.Cost, &redeemedAt, &eatenAt); err != nil {
			return nil, fmt.Errorf("scan item: %w", err)
		}
		item.Kind = RewardKind(kind)
		if item.RedeemedAt, err = parseTime(redeemedAt); err != nil {
			return nil, err
		}
		if eatenAt.Valid {
			parsed, err := parseTime(eatenAt.String)
			if err != nil {
				return nil, err
			}
			item.EatenAt = &parsed
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate items: %w", err)
	}
	return items, nil
}

// CreateWorkout inserts a validated workout.
func (r *SQLiteRepository) CreateWorkout(ctx context.Context, workout Workout) error {
	_, err := r.db.ExecContext(ctx, `
INSERT INTO fitness_workouts (duration_minutes, ended_at, note, created_at)
VALUES (?, ?, ?, ?)`,
		workout.DurationMinutes, formatTime(workout.EndedAt), workout.Note, formatTime(workout.CreatedAt))
	if err != nil {
		return fmt.Errorf("create workout: %w", err)
	}
	return nil
}

// DeleteWorkout removes a workout unless that would overdraw the coin balance.
func (r *SQLiteRepository) DeleteWorkout(ctx context.Context, id int64) error {
	return r.inTx(ctx, func(tx *sql.Tx) error {
		var duration int
		err := tx.QueryRowContext(ctx, `SELECT duration_minutes FROM fitness_workouts WHERE id = ?`, id).Scan(&duration)
		if errors.Is(err, sql.ErrNoRows) {
			return errNotFound
		}
		if err != nil {
			return fmt.Errorf("load workout: %w", err)
		}
		totalMinutes, coinsSpent, err := ledgerTotals(ctx, tx)
		if err != nil {
			return err
		}
		if Summarize(totalMinutes-duration, coinsSpent).CoinBalance < 0 {
			return errDeleteWouldOverdraw
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM fitness_workouts WHERE id = ?`, id); err != nil {
			return fmt.Errorf("delete workout: %w", err)
		}
		return nil
	})
}

// Redeem spends coins on a reward and adds it to the inventory.
func (r *SQLiteRepository) Redeem(ctx context.Context, kind RewardKind, cost int, at time.Time) error {
	return r.inTx(ctx, func(tx *sql.Tx) error {
		totalMinutes, coinsSpent, err := ledgerTotals(ctx, tx)
		if err != nil {
			return err
		}
		if Summarize(totalMinutes, coinsSpent).CoinBalance < cost {
			return errCoinsInsufficient
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO fitness_items (kind, cost, redeemed_at) VALUES (?, ?, ?)`,
			string(kind), cost, formatTime(at)); err != nil {
			return fmt.Errorf("insert item: %w", err)
		}
		return nil
	})
}

// EatItem marks an uneaten item as eaten.
func (r *SQLiteRepository) EatItem(ctx context.Context, id int64, at time.Time) error {
	return r.inTx(ctx, func(tx *sql.Tx) error {
		var eatenAt sql.NullString
		err := tx.QueryRowContext(ctx, `SELECT eaten_at FROM fitness_items WHERE id = ?`, id).Scan(&eatenAt)
		if errors.Is(err, sql.ErrNoRows) {
			return errNotFound
		}
		if err != nil {
			return fmt.Errorf("load item: %w", err)
		}
		if eatenAt.Valid {
			return errItemAlreadyEaten
		}
		if _, err := tx.ExecContext(ctx, `UPDATE fitness_items SET eaten_at = ? WHERE id = ?`, formatTime(at), id); err != nil {
			return fmt.Errorf("eat item: %w", err)
		}
		return nil
	})
}

func (r *SQLiteRepository) inTx(ctx context.Context, fn func(*sql.Tx) error) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	return nil
}

func ledgerTotals(ctx context.Context, tx *sql.Tx) (totalMinutes, coinsSpent int, err error) {
	if err := tx.QueryRowContext(ctx, `SELECT COALESCE(SUM(duration_minutes), 0) FROM fitness_workouts`).Scan(&totalMinutes); err != nil {
		return 0, 0, fmt.Errorf("sum workout minutes: %w", err)
	}
	if err := tx.QueryRowContext(ctx, `SELECT COALESCE(SUM(cost), 0) FROM fitness_items`).Scan(&coinsSpent); err != nil {
		return 0, 0, fmt.Errorf("sum coins spent: %w", err)
	}
	return totalMinutes, coinsSpent, nil
}

func formatTime(value time.Time) string {
	return value.UTC().Format(timeLayout)
}

func parseTime(value string) (time.Time, error) {
	parsed, err := time.Parse(timeLayout, value)
	if err != nil {
		return time.Time{}, fmt.Errorf("parse stored time %q: %w", value, err)
	}
	return parsed, nil
}
