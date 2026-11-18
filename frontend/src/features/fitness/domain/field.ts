import type { InventoryItem, Workout } from '../types'

export const fieldWeeks = 12

export type FieldDay = {
  key: string
  date: Date
  minutes: number
  workouts: Workout[]
  level: number
  isToday: boolean
  isFuture: boolean
}

/** Local calendar day key, e.g. 2026-11-18. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Flower stage for a day's total minutes: bare soil, sprout (1–30), plant (31–45), bud (46–60), bloom (61+). */
export function tileLevel(minutes: number): number {
  if (minutes <= 0) return 0
  if (minutes <= 30) return 1
  if (minutes <= 45) return 2
  if (minutes <= 60) return 3
  return 4
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** Monday of the week containing `date`. */
export function weekStart(date: Date): Date {
  const day = startOfDay(date)
  const mondayOffset = (day.getDay() + 6) % 7
  return addDays(day, -mondayOffset)
}

/**
 * Builds `fieldWeeks` columns of Monday-first days. `pageOffset` 0 ends with
 * the current week; 1 shows the previous `fieldWeeks` weeks, and so on.
 */
export function buildField(workouts: ReadonlyArray<Workout>, today: Date, pageOffset = 0): FieldDay[][] {
  const byDay = new Map<string, Workout[]>()
  for (const workout of workouts) {
    const key = dayKey(new Date(workout.endedAt))
    const list = byDay.get(key) ?? []
    list.push(workout)
    byDay.set(key, list)
  }
  const todayKey = dayKey(today)
  const todayStart = startOfDay(today)
  const firstMonday = addDays(weekStart(today), -7 * (fieldWeeks * (pageOffset + 1) - 1))

  return Array.from({ length: fieldWeeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = addDays(firstMonday, week * 7 + weekday)
      const key = dayKey(date)
      const dayWorkouts = (byDay.get(key) ?? []).slice().sort((a, b) => a.endedAt.localeCompare(b.endedAt))
      const minutes = dayWorkouts.reduce((sum, workout) => sum + workout.durationMinutes, 0)
      return {
        key,
        date,
        minutes,
        workouts: dayWorkouts,
        level: tileLevel(minutes),
        isToday: key === todayKey,
        isFuture: date > todayStart,
      }
    }),
  )
}

/** Value for an `<input type="datetime-local">` in the browser's time zone. */
export function toLocalInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${dayKey(date)}T${hours}:${minutes}`
}

/** Converts a datetime-local value to an RFC 3339 timestamp, or undefined if invalid. */
export function fromLocalInputValue(value: string): string | undefined {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/** Uneaten items first (newest redemption first), then eaten items (latest eaten first). */
export function sortInventory(items: ReadonlyArray<InventoryItem>): InventoryItem[] {
  const fresh = items.filter((item) => !item.eatenAt).sort((a, b) => b.redeemedAt.localeCompare(a.redeemedAt))
  const eaten = items.filter((item) => item.eatenAt).sort((a, b) => (b.eatenAt ?? '').localeCompare(a.eatenAt ?? ''))
  return [...fresh, ...eaten]
}
