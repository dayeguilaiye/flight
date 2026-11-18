import { describe, expect, it } from 'vitest'
import type { InventoryItem, Workout } from '../types'
import { buildField, dayKey, fieldWeeks, fromLocalInputValue, sortInventory, tileLevel, toLocalInputValue, weekStart } from './field'

function workout(id: number, endedAt: Date, durationMinutes: number): Workout {
  return { id, durationMinutes, endedAt: endedAt.toISOString(), note: '', createdAt: endedAt.toISOString() }
}

describe('fitness field', () => {
  it.each([
    [0, 0],
    [1, 1],
    [30, 1],
    [31, 2],
    [45, 2],
    [46, 3],
    [60, 3],
    [61, 4],
    [600, 4],
  ])('maps %i minutes to level %i', (minutes, level) => {
    expect(tileLevel(minutes)).toBe(level)
  })

  it('starts weeks on Monday', () => {
    expect(dayKey(weekStart(new Date(2026, 10, 18)))).toBe('2026-11-16')
    expect(dayKey(weekStart(new Date(2026, 10, 22)))).toBe('2026-11-16')
  })

  it('builds Monday-first columns ending with the current week and sums each day', () => {
    const today = new Date(2026, 10, 18, 21, 0)
    const workouts = [workout(1, new Date(2026, 10, 18, 8, 0), 20), workout(2, new Date(2026, 10, 18, 19, 0), 45), workout(3, new Date(2026, 10, 2, 7, 0), 30)]
    const field = buildField(workouts, today)

    expect(field).toHaveLength(fieldWeeks)
    const lastWeek = field[fieldWeeks - 1]
    expect(lastWeek[0].key).toBe('2026-11-16')
    const todayCell = lastWeek[2]
    expect(todayCell).toMatchObject({ key: '2026-11-18', minutes: 65, level: 4, isToday: true, isFuture: false })
    expect(todayCell.workouts.map((item) => item.id)).toEqual([1, 2])
    expect(lastWeek[3].isFuture).toBe(true)
    expect(field.flat().find((day) => day.key === '2026-11-02')?.minutes).toBe(30)
  })

  it('pages back by whole field widths', () => {
    const today = new Date(2026, 10, 18)
    const current = buildField([], today, 0)
    const previous = buildField([], today, 1)
    const previousLast = previous[fieldWeeks - 1][6].date
    expect(dayKey(new Date(previousLast.getFullYear(), previousLast.getMonth(), previousLast.getDate() + 1))).toBe(current[0][0].key)
  })

  it('round-trips datetime-local values', () => {
    const date = new Date(2026, 10, 18, 7, 5)
    expect(toLocalInputValue(date)).toBe('2026-11-18T07:05')
    expect(fromLocalInputValue('2026-11-18T07:05')).toBe(date.toISOString())
    expect(fromLocalInputValue('nope')).toBeUndefined()
  })

  it('orders fresh items before eaten ones', () => {
    const items: InventoryItem[] = [
      { id: 1, kind: 'ice_cream', cost: 5, redeemedAt: '2026-11-01T00:00:00Z', eatenAt: '2026-11-02T00:00:00Z' },
      { id: 2, kind: 'sausage', cost: 7, redeemedAt: '2026-11-03T00:00:00Z' },
      { id: 3, kind: 'ice_cream', cost: 5, redeemedAt: '2026-11-04T00:00:00Z' },
      { id: 4, kind: 'sausage', cost: 7, redeemedAt: '2026-10-01T00:00:00Z', eatenAt: '2026-11-05T00:00:00Z' },
    ]
    expect(sortInventory(items).map((item) => item.id)).toEqual([3, 2, 4, 1])
  })
})
