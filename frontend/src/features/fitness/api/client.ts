import { z } from 'zod'
import { ApiError, publicErrorSchema } from '../../../shared/api/errors'
import { fitnessStateSchema, type FitnessState, type RewardKind, type WorkoutDraft } from '../types'

export { getSession, login, logout } from '../../../shared/api/auth'

const errorEnvelopeSchema = z.object({ error: publicErrorSchema })
const base = '/api/v1/fitness'

async function requestState(path: string, init: RequestInit): Promise<FitnessState> {
  const response = await fetch(`${base}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } })
  const payload: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const decoded = errorEnvelopeSchema.safeParse(payload)
    throw new ApiError(decoded.success ? decoded.data.error : { code: 'request_failed' })
  }
  return fitnessStateSchema.parse(payload)
}

export function getState(): Promise<FitnessState> {
  return requestState('/state', { method: 'GET' })
}

export function addWorkout(draft: WorkoutDraft): Promise<FitnessState> {
  return requestState('/workouts', { method: 'POST', body: JSON.stringify(draft) })
}

export function deleteWorkout(id: number): Promise<FitnessState> {
  return requestState(`/workouts/${id}`, { method: 'DELETE' })
}

export function redeem(kind: RewardKind): Promise<FitnessState> {
  return requestState('/redemptions', { method: 'POST', body: JSON.stringify({ kind }) })
}

export function eatItem(id: number): Promise<FitnessState> {
  return requestState(`/items/${id}/eat`, { method: 'POST', body: '{}' })
}
