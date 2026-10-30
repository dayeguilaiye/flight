export type UserValues = { name: string; age: number; active: boolean }
export type UpdateMode = 'struct' | 'map'

export const originalUser: UserValues = { name: 'Lin', age: 28, active: true }

export function simulateUpdate(input: UserValues, mode: UpdateMode) {
  const fields = (['name', 'age', 'active'] as const).filter((field) => mode === 'map' || Boolean(input[field]))
  const skipped = (['name', 'age', 'active'] as const).filter((field) => !fields.includes(field))
  const result = { ...originalUser }
  if (fields.includes('name')) result.name = input.name
  if (fields.includes('age')) result.age = input.age
  if (fields.includes('active')) result.active = input.active
  return {
    fields,
    skipped,
    result,
    sql: fields.length ? `UPDATE "users"\nSET ${fields.map((field, index) => `"${field}" = $${index + 1}`).join(', ')}\nWHERE "id" = $${fields.length + 1};` : null,
    args: fields.length ? [...fields.map((field) => input[field]), 10] : [],
  }
}

export function renameDetection(renamed: boolean, covered: boolean) {
  return { sqlc: renamed ? 'generate' : 'ok', gorm: renamed ? (covered ? 'test' : 'runtime') : 'ok' } as const
}

export const preloadSizes = [3, 50, 1000, 20000, 65535, 65536, 100000] as const

export function simulatePreload(users: number, batch: boolean) {
  const parameters = batch ? Math.min(users, 1000) : users
  const placeholders = parameters <= 3 ? Array.from({ length: parameters }, (_, index) => `$${index + 1}`).join(', ') : `$1, $2, …, $${parameters}`
  return {
    parameters,
    queries: 1 + (batch ? Math.ceil(users / 1000) : 1),
    exceedsLimit: parameters > 65535,
    sql: `SELECT * FROM "users";\n\nSELECT * FROM "orders"\nWHERE "user_id" IN (${placeholders});`,
  }
}

export type OrderFilters = { status: '' | 'paid' | 'shipped'; userId: string; sort: 'created_at' | 'amount' }

export const staticOrderSQL = `-- name: ListOrders :many
SELECT id, user_id, status, amount, created_at
FROM orders
WHERE (sqlc.narg('status')::text IS NULL
       OR status = sqlc.narg('status'))
  AND (sqlc.narg('user_id')::bigint IS NULL
       OR user_id = sqlc.narg('user_id'))
ORDER BY
  CASE WHEN sqlc.arg('sort')::text = 'amount'
       THEN amount END DESC,
  created_at DESC, id DESC
LIMIT 50;`

export function buildOrderQuery(filters: OrderFilters) {
  const userId = filters.userId.trim()
  if (userId && (!/^[1-9]\d*$/.test(userId) || BigInt(userId) > 9223372036854775807n)) {
    return { valid: false } as const
  }
  const args: string[] = []
  const conditions: string[] = []
  if (filters.status) {
    args.push(filters.status)
    conditions.push(`status = $${args.length}`)
  }
  if (userId) {
    args.push(userId)
    conditions.push(`user_id = $${args.length}`)
  }
  const order = filters.sort === 'amount' ? 'amount DESC, created_at DESC, id DESC' : 'created_at DESC, id DESC'
  return {
    valid: true,
    sql: `SELECT id, user_id, status, amount, created_at\nFROM orders${conditions.length ? `\nWHERE ${conditions.join('\n  AND ')}` : ''}\nORDER BY ${order}\nLIMIT 50;`,
    args,
    staticArgs: { status: filters.status || null, user_id: userId || null, sort: filters.sort },
  } as const
}
