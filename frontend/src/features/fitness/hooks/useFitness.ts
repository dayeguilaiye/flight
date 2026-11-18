import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, toDisplayError, type DisplayError } from '../../../shared/api/errors'
import * as api from '../api/client'
import type { FitnessState, RewardKind, WorkoutDraft } from '../types'

export type FitnessPhase = 'checking' | 'login' | 'ready' | 'unavailable'

type EventPayload =
  | { kind: 'coins'; amount: number }
  | { kind: 'redeemed'; reward: RewardKind }
  | { kind: 'eaten'; itemId: number }
  | { kind: 'logged' }

/** A short-lived event that drives a celebration animation. */
export type FitnessEvent = EventPayload & { id: number }

export function useFitness() {
  const [phase, setPhase] = useState<FitnessPhase>('checking')
  const [state, setState] = useState<FitnessState | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<DisplayError | null>(null)
  const [event, setEvent] = useState<FitnessEvent | null>(null)
  const eventId = useRef(0)

  const emit = useCallback((payload: EventPayload) => {
    eventId.current += 1
    setEvent({ ...payload, id: eventId.current })
  }, [])

  const load = useCallback(async () => {
    setPhase('checking')
    setError(null)
    try {
      if (!(await api.getSession())) {
        setPhase('login')
        return
      }
      setState(await api.getState())
      setPhase('ready')
    } catch (cause) {
      setError(toDisplayError(cause, 'fitness_load_failed'))
      setPhase('unavailable')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** Runs a mutation; returns the new state, or undefined after a handled error. */
  const mutate = useCallback(async (name: string, run: () => Promise<FitnessState>) => {
    setPending(name)
    setError(null)
    try {
      const next = await run()
      setState(next)
      return next
    } catch (cause) {
      if (cause instanceof ApiError && cause.publicError.code === 'owner_required') setPhase('login')
      setError(toDisplayError(cause, 'fitness_action_failed'))
      return undefined
    } finally {
      setPending(null)
    }
  }, [])

  const signIn = useCallback(async (password: string) => {
    setPending('login')
    setError(null)
    try {
      await api.login(password)
      setPending(null)
      await load()
    } catch (cause) {
      setError(toDisplayError(cause, 'login_failed'))
      setPending(null)
    }
  }, [load])

  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined)
    setState(null)
    setPhase('login')
  }, [])

  const addWorkout = useCallback(async (draft: WorkoutDraft) => {
    const before = state?.summary.coinsEarned ?? 0
    const next = await mutate('workout', () => api.addWorkout(draft))
    if (!next) return false
    const gained = next.summary.coinsEarned - before
    emit(gained > 0 ? { kind: 'coins', amount: gained } : { kind: 'logged' })
    return true
  }, [emit, mutate, state])

  const deleteWorkout = useCallback(async (id: number) => {
    await mutate(`delete-${id}`, () => api.deleteWorkout(id))
  }, [mutate])

  const redeem = useCallback(async (reward: RewardKind) => {
    if (await mutate(`redeem-${reward}`, () => api.redeem(reward))) emit({ kind: 'redeemed', reward })
  }, [emit, mutate])

  const eat = useCallback(async (itemId: number) => {
    if (await mutate(`eat-${itemId}`, () => api.eatItem(itemId))) emit({ kind: 'eaten', itemId })
  }, [emit, mutate])

  return { phase, state, pending, error, event, reload: load, signIn, signOut, addWorkout, deleteWorkout, redeem, eat }
}
