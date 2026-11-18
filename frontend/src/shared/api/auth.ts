import { z } from 'zod'
import { ApiError, publicErrorSchema } from './errors'

const errorEnvelopeSchema = z.object({ error: publicErrorSchema })

async function requestAuth<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } })
  const payload: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const decoded = errorEnvelopeSchema.safeParse(payload)
    throw new ApiError(decoded.success ? decoded.data.error : { code: 'request_failed' })
  }
  return schema.parse(payload)
}

/** Reports whether the browser holds a valid instance-owner session. */
export async function getSession(): Promise<boolean> {
  const payload = await requestAuth('/api/v1/auth/session', { method: 'GET' }, z.object({ authenticated: z.boolean() }))
  return payload.authenticated
}

/** Signs in as the instance owner. Rejects with an ApiError on bad credentials. */
export async function login(password: string): Promise<void> {
  await requestAuth('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ password }) }, z.object({ authenticated: z.literal(true) }))
}

/** Clears the instance-owner session cookie. */
export async function logout(): Promise<void> {
  await requestAuth('/api/v1/auth/logout', { method: 'POST', body: '{}' }, z.object({ authenticated: z.literal(false) }))
}
