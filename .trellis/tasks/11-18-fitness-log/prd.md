# Pixel fitness log

## Goal

A personal, owner-only fitness log at `/fitness`. The owner records workouts by hand, earns coins from accumulated exercise time, redeems coins for snack rewards, and eats rewards from an inventory. The page uses a lively pixel-game style and works on phones and desktops.

## Requirements

### Workouts

- The owner adds a workout with a duration in whole minutes (1–720).
- End time defaults to the moment the record is submitted; the owner may change it. End time may not be in the future (5-minute tolerance for clock skew).
- An optional free-text note (≤ 500 characters) describes what was done.
- The owner may delete a workout to fix a mistake, unless the deletion would make the coin balance negative (409 `workout_delete_would_overdraw`).

### Coins and rewards

- Every accumulated 30 minutes of total workout time earns one coin. Coins earned = `floor(totalMinutes / 30)`; balance = earned − spent.
- Ice cream costs 5 coins; grilled sausage costs 7 coins.
- Redeeming with an insufficient balance fails (409 `coins_insufficient`).
- A redeemed reward appears in the inventory. The owner can eat an uneaten reward; eating twice fails (409 `item_already_eaten`).
- Eaten rewards stay in the inventory, greyed out; the eaten time appears only on hover / tap / focus.

### Presentation

- History is not laid out as tables: workouts appear as a pixel "training field" calendar (one tile per day, a flower that grows by daily minutes: sprout 1–30, plant 31–45, bud 46–60, bloom 61+). Selecting a day reveals that day's workouts.
- A HUD shows the coin balance and progress toward the next coin.
- Pixel art is generated in code (pixel maps rendered as crisp SVG). No runtime font or image fetches from third parties.
- Motion (coin pop, reward pop, eat animation, idle bob) has a `prefers-reduced-motion` fallback.
- Responsive: single column below 768px, two columns on desktop. Bilingual (zh-CN / en) through the shared i18n resources.

### Access

- All fitness APIs require the owner session (401 `owner_required`). Unauthenticated visitors see a login panel only.
- The page is not listed on the home page.

## Surface brief

```yaml
mode: operate
job: "Log a workout and spend earned coins on rewards"
primary_action: "Add a workout"
density: comfortable
motion: subtle
variance: medium
theme: light
accent: feature-owned (pixel palette, local to the feature)
required_states: [login, loading, empty, invalid, success, error]
responsive_fallback: "Single-column flow below 768px; calendar tiles scale with width"
```

## API contract

All routes are under `/api/v1/fitness`, owner-only, and every success returns the full `State`:

| Method | Path | Body | Success |
|---|---|---|---|
| GET | `/state` | – | 200 State |
| POST | `/workouts` | `{durationMinutes, endedAt?, note}` | 201 State |
| DELETE | `/workouts/{id}` | – | 200 State |
| POST | `/redemptions` | `{kind: "ice_cream" \| "sausage"}` | 201 State |
| POST | `/items/{id}/eat` | `{}` | 200 State |

```ts
State = {
  summary: { totalMinutes, minutesPerCoin, coinsEarned, coinsSpent, coinBalance, minutesTowardNextCoin },
  rewards: [{ kind, cost }],
  workouts: [{ id, durationMinutes, endedAt, note, createdAt }], // newest end time first
  items: [{ id, kind, cost, redeemedAt, eatenAt? }],             // newest redemption first
}
```

Error codes: `owner_required`, `invalid_json`, `invalid_id`, `not_found`, `workout_duration_invalid` (field `durationMinutes`, params `min`/`max`), `workout_end_invalid` (field `endedAt`), `workout_end_in_future` (field `endedAt`), `workout_note_too_long` (field `note`, param `max`), `reward_kind_unknown` (field `kind`), `coins_insufficient`, `workout_delete_would_overdraw`, `item_already_eaten`, `internal_error`.

## Acceptance criteria

- [x] Adding 30+30 minutes yields 2 coins; 29 minutes yields 0 coins and 29/30 progress.
- [x] Redeeming ice cream with 4 coins fails; with 5 coins succeeds and balance drops to 0.
- [x] Eating an item records the time and greys it out; the time is visible on hover/tap only.
- [x] Unauthenticated API calls return 401 `owner_required`.
- [x] Layout is usable at 375px and desktop widths, in both languages.
- [x] `go test ./...`, `pnpm --dir frontend test`, `pnpm --dir frontend typecheck` pass.
