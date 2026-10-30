import { describe, expect, it } from 'vitest'
import { buildOrderQuery, renameDetection, simulatePreload, simulateUpdate } from './simulations'

describe('database comparison simulations', () => {
  it('preserves zero fields with struct Updates and saves them with map Updates', () => {
    const input = { name: '', age: 0, active: false }
    const struct = simulateUpdate(input, 'struct')
    expect(struct.result).toEqual({ name: 'Lin', age: 28, active: true })
    expect(struct.sql).toBeNull()
    expect(struct.args).toEqual([])
    const map = simulateUpdate(input, 'map')
    expect(map.result).toEqual(input)
    expect(map.args).toEqual(['', 0, false, 10])
    expect(map.sql).toContain('"active" = $3')
  })

  it('keeps user values out of SQL text', () => {
    const input = { name: "'; DROP TABLE users; --", age: 18, active: true }
    const result = simulateUpdate(input, 'map')
    expect(result.sql).not.toContain(input.name)
    expect(result.args[0]).toBe(input.name)
  })

  it('shows when a renamed column is detected based on integration coverage', () => {
    expect(renameDetection(false, false)).toEqual({ sqlc: 'ok', gorm: 'ok' })
    expect(renameDetection(true, false)).toEqual({ sqlc: 'generate', gorm: 'runtime' })
    expect(renameDetection(true, true)).toEqual({ sqlc: 'generate', gorm: 'test' })
  })

  it('models the PostgreSQL parameter boundary and application-level batching', () => {
    expect(simulatePreload(65535, false).exceedsLimit).toBe(false)
    expect(simulatePreload(65536, false).exceedsLimit).toBe(true)
    expect(simulatePreload(65536, true)).toMatchObject({ queries: 67, parameters: 1000, exceedsLimit: false })
    expect(simulatePreload(3, true)).toMatchObject({ queries: 2, parameters: 3 })
  })

  it('binds optional filters in order and keeps sorting deterministic', () => {
    const result = buildOrderQuery({ status: 'paid', userId: '9223372036854775807', sort: 'amount' })
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.args).toEqual(['paid', '9223372036854775807'])
    expect(result.sql).toContain('status = $1\n  AND user_id = $2')
    expect(result.sql).toContain('ORDER BY amount DESC, created_at DESC, id DESC')
    expect(result.sql).not.toContain('9223372036854775807')
    const empty = buildOrderQuery({ status: '', userId: '', sort: 'created_at' })
    if (!empty.valid) throw new Error('Empty filters should be valid')
    expect(empty.args).toEqual([])
    expect(empty.sql).not.toContain('WHERE')
    expect(empty.staticArgs).toMatchObject({ status: null, user_id: null })
  })

  it.each(['0', '-1', '1.5', '1 OR 1=1', '9223372036854775808'])('rejects invalid bigint ID %s', (userId) => {
    expect(buildOrderQuery({ status: '', userId, sort: 'created_at' })).toEqual({ valid: false })
  })
})
