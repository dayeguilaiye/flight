// Package fitness implements the owner's personal workout log: workouts earn
// coins, coins are redeemed for snack rewards, and rewards are eaten from an
// inventory.
package fitness

import (
	"errors"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	// MinutesPerCoin is the accumulated workout time that earns one coin.
	MinutesPerCoin = 30
	// MinWorkoutMinutes and MaxWorkoutMinutes bound one workout's duration.
	MinWorkoutMinutes = 1
	MaxWorkoutMinutes = 720
	// MaxNoteLength is the maximum note length in characters (runes).
	MaxNoteLength = 500
	// futureTolerance absorbs small clock differences between browser and server.
	futureTolerance = 5 * time.Minute
)

// RewardKind identifies a redeemable snack.
type RewardKind string

const (
	RewardIceCream RewardKind = "ice_cream"
	RewardSausage  RewardKind = "sausage"
)

// Reward is one entry in the redemption catalog.
type Reward struct {
	Kind RewardKind `json:"kind"`
	Cost int        `json:"cost"`
}

// Rewards returns the redemption catalog in display order.
func Rewards() []Reward {
	return []Reward{
		{Kind: RewardIceCream, Cost: 5},
		{Kind: RewardSausage, Cost: 7},
	}
}

func rewardCost(kind RewardKind) (int, bool) {
	for _, reward := range Rewards() {
		if reward.Kind == kind {
			return reward.Cost, true
		}
	}
	return 0, false
}

// Workout is one recorded exercise session.
type Workout struct {
	ID              int64     `json:"id"`
	DurationMinutes int       `json:"durationMinutes"`
	EndedAt         time.Time `json:"endedAt"`
	Note            string    `json:"note"`
	CreatedAt       time.Time `json:"createdAt"`
}

// Item is a redeemed reward in the inventory. EatenAt is nil until eaten.
type Item struct {
	ID         int64      `json:"id"`
	Kind       RewardKind `json:"kind"`
	Cost       int        `json:"cost"`
	RedeemedAt time.Time  `json:"redeemedAt"`
	EatenAt    *time.Time `json:"eatenAt,omitempty"`
}

// Summary is the coin ledger derived from workouts and redemptions.
type Summary struct {
	TotalMinutes          int `json:"totalMinutes"`
	MinutesPerCoin        int `json:"minutesPerCoin"`
	CoinsEarned           int `json:"coinsEarned"`
	CoinsSpent            int `json:"coinsSpent"`
	CoinBalance           int `json:"coinBalance"`
	MinutesTowardNextCoin int `json:"minutesTowardNextCoin"`
}

// Summarize derives the coin ledger from total workout minutes and coins spent.
func Summarize(totalMinutes, coinsSpent int) Summary {
	earned := totalMinutes / MinutesPerCoin
	return Summary{
		TotalMinutes:          totalMinutes,
		MinutesPerCoin:        MinutesPerCoin,
		CoinsEarned:           earned,
		CoinsSpent:            coinsSpent,
		CoinBalance:           earned - coinsSpent,
		MinutesTowardNextCoin: totalMinutes % MinutesPerCoin,
	}
}

// State is the complete owner view returned by every fitness endpoint.
type State struct {
	Summary  Summary   `json:"summary"`
	Rewards  []Reward  `json:"rewards"`
	Workouts []Workout `json:"workouts"`
	Items    []Item    `json:"items"`
}

// WorkoutInput is a validated-at-the-boundary request to add a workout.
// A nil EndedAt means "now".
type WorkoutInput struct {
	DurationMinutes int
	EndedAt         *time.Time
	Note            string
}

func (input WorkoutInput) toWorkout(now time.Time) (Workout, error) {
	if input.DurationMinutes < MinWorkoutMinutes || input.DurationMinutes > MaxWorkoutMinutes {
		return Workout{}, errDurationInvalid
	}
	endedAt := now
	if input.EndedAt != nil {
		endedAt = *input.EndedAt
	}
	if endedAt.After(now.Add(futureTolerance)) {
		return Workout{}, errEndInFuture
	}
	note := strings.TrimSpace(input.Note)
	if utf8.RuneCountInString(note) > MaxNoteLength {
		return Workout{}, errNoteTooLong
	}
	return Workout{
		DurationMinutes: input.DurationMinutes,
		EndedAt:         endedAt.UTC(),
		Note:            note,
		CreatedAt:       now.UTC(),
	}, nil
}

// Domain errors. The handler maps each to a stable public error code.
var (
	errDurationInvalid     = errors.New("workout duration is out of range")
	errEndInFuture         = errors.New("workout end time is in the future")
	errNoteTooLong         = errors.New("workout note is too long")
	errRewardKindUnknown   = errors.New("reward kind is unknown")
	errCoinsInsufficient   = errors.New("coin balance is insufficient")
	errDeleteWouldOverdraw = errors.New("deleting the workout would make the coin balance negative")
	errItemAlreadyEaten    = errors.New("item has already been eaten")
	errNotFound            = errors.New("resource not found")
)
