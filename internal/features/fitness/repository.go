package fitness

import (
	"context"
	"time"
)

// Repository persists workouts and inventory items. Operations that guard the
// coin balance check and write inside one transaction.
type Repository interface {
	ListWorkouts(ctx context.Context) ([]Workout, error)
	ListItems(ctx context.Context) ([]Item, error)
	CreateWorkout(ctx context.Context, workout Workout) error
	// DeleteWorkout returns errNotFound or errDeleteWouldOverdraw.
	DeleteWorkout(ctx context.Context, id int64) error
	// Redeem returns errCoinsInsufficient when the balance cannot cover cost.
	Redeem(ctx context.Context, kind RewardKind, cost int, at time.Time) error
	// EatItem returns errNotFound or errItemAlreadyEaten.
	EatItem(ctx context.Context, id int64, at time.Time) error
}
