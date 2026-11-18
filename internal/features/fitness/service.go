package fitness

import (
	"context"
	"fmt"
	"time"
)

// Service orchestrates fitness use cases and always answers with the full
// owner state so the client never recomputes the coin ledger.
type Service struct {
	repository Repository
	now        func() time.Time
}

// NewService creates a fitness service.
func NewService(repository Repository) *Service {
	return &Service{repository: repository, now: time.Now}
}

// State loads workouts, inventory and the derived coin summary.
func (s *Service) State(ctx context.Context) (State, error) {
	workouts, err := s.repository.ListWorkouts(ctx)
	if err != nil {
		return State{}, fmt.Errorf("load state: %w", err)
	}
	items, err := s.repository.ListItems(ctx)
	if err != nil {
		return State{}, fmt.Errorf("load state: %w", err)
	}
	totalMinutes := 0
	for _, workout := range workouts {
		totalMinutes += workout.DurationMinutes
	}
	coinsSpent := 0
	for _, item := range items {
		coinsSpent += item.Cost
	}
	return State{
		Summary:  Summarize(totalMinutes, coinsSpent),
		Rewards:  Rewards(),
		Workouts: workouts,
		Items:    items,
	}, nil
}

// AddWorkout validates and records a workout.
func (s *Service) AddWorkout(ctx context.Context, input WorkoutInput) (State, error) {
	workout, err := input.toWorkout(s.now())
	if err != nil {
		return State{}, err
	}
	if err := s.repository.CreateWorkout(ctx, workout); err != nil {
		return State{}, err
	}
	return s.State(ctx)
}

// DeleteWorkout removes a workout if the balance stays non-negative.
func (s *Service) DeleteWorkout(ctx context.Context, id int64) (State, error) {
	if err := s.repository.DeleteWorkout(ctx, id); err != nil {
		return State{}, err
	}
	return s.State(ctx)
}

// Redeem exchanges coins for a reward.
func (s *Service) Redeem(ctx context.Context, kind RewardKind) (State, error) {
	cost, ok := rewardCost(kind)
	if !ok {
		return State{}, errRewardKindUnknown
	}
	if err := s.repository.Redeem(ctx, kind, cost, s.now().UTC()); err != nil {
		return State{}, err
	}
	return s.State(ctx)
}

// EatItem records that an inventory item was eaten.
func (s *Service) EatItem(ctx context.Context, id int64) (State, error) {
	if err := s.repository.EatItem(ctx, id, s.now().UTC()); err != nil {
		return State{}, err
	}
	return s.State(ctx)
}
