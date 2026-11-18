// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../../shared/i18n/I18nProvider'
import type { FitnessState } from '../types'
import { FitnessPage } from './FitnessPage'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function baseState(overrides: Partial<FitnessState['summary']> = {}): FitnessState {
  return {
    summary: { totalMinutes: 150, minutesPerCoin: 30, coinsEarned: 5, coinsSpent: 0, coinBalance: 5, minutesTowardNextCoin: 0, ...overrides },
    rewards: [
      { kind: 'ice_cream', cost: 5 },
      { kind: 'sausage', cost: 7 },
    ],
    workouts: [],
    items: [],
  }
}

/** A tiny in-memory stand-in for the owner-only fitness API. */
function stubBackend(options: { authenticated: boolean; state: FitnessState }) {
  let authenticated = options.authenticated
  let state = options.state
  const calls: Array<{ method: string; url: string; body?: unknown }> = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
      calls.push({ method, url, body })
      if (url === '/api/v1/auth/session') return json({ authenticated })
      if (url === '/api/v1/auth/login') {
        if (body.password !== 'secret') return json({ error: { code: 'invalid_credentials', message: 'x' } }, 401)
        authenticated = true
        return json({ authenticated: true })
      }
      if (url === '/api/v1/fitness/state') return json(state)
      if (url === '/api/v1/fitness/workouts') {
        const minutes = state.summary.totalMinutes + body.durationMinutes
        state = {
          ...state,
          summary: { ...state.summary, totalMinutes: minutes, coinsEarned: Math.floor(minutes / 30), coinBalance: Math.floor(minutes / 30) - state.summary.coinsSpent, minutesTowardNextCoin: minutes % 30 },
          workouts: [{ id: 1, durationMinutes: body.durationMinutes, endedAt: new Date().toISOString(), note: body.note, createdAt: new Date().toISOString() }, ...state.workouts],
        }
        return json(state, 201)
      }
      if (url === '/api/v1/fitness/redemptions') {
        state = {
          ...state,
          summary: { ...state.summary, coinsSpent: state.summary.coinsSpent + 5, coinBalance: state.summary.coinBalance - 5 },
          items: [{ id: 7, kind: 'ice_cream', cost: 5, redeemedAt: '2026-11-18T10:00:00Z' }],
        }
        return json(state, 201)
      }
      if (url === '/api/v1/fitness/items/7/eat') {
        state = { ...state, items: state.items.map((item) => ({ ...item, eatenAt: '2026-11-18T12:30:00Z' })) }
        return json(state)
      }
      return json({ error: { code: 'not_found', message: 'x' } }, 404)
    }),
  )
  return calls
}

function renderPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <FitnessPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('FitnessPage', () => {
  it('asks visitors to sign in and shows a translated error for a wrong password', async () => {
    stubBackend({ authenticated: false, state: baseState() })
    const user = userEvent.setup()
    renderPage()

    const password = await screen.findByLabelText('密码')
    await user.type(password, 'nope')
    await user.click(screen.getByRole('button', { name: '进入健身房' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', '密码不正确。')

    await user.clear(password)
    await user.type(password, 'secret')
    await user.click(screen.getByRole('button', { name: '进入健身房' }))
    expect(await screen.findByRole('group', { name: '当前有 5 枚金币' })).toBeTruthy()
  })

  it('logs a workout without an end time so the server records "now"', async () => {
    const calls = stubBackend({ authenticated: true, state: baseState({ totalMinutes: 20, coinsEarned: 0, coinBalance: 0, minutesTowardNextCoin: 20 }) })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: '45 分' }))
    expect(screen.getByText('记录后 +2 金币')).toBeTruthy()
    await user.type(screen.getByLabelText('做了什么（选填）'), '深蹲')
    await user.click(screen.getByRole('button', { name: '记录！' }))

    await screen.findByRole('group', { name: '当前有 2 枚金币' })
    expect(calls.find((call) => call.url === '/api/v1/fitness/workouts')?.body).toEqual({ durationMinutes: 45, note: '深蹲' })
  })

  it('rejects an invalid duration before calling the API', async () => {
    const calls = stubBackend({ authenticated: true, state: baseState() })
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('运动时长（分钟）'), '0')
    await user.click(screen.getByRole('button', { name: '记录！' }))
    expect(screen.getByText('请输入 1–720 之间的整数分钟。')).toBeTruthy()
    expect(calls.some((call) => call.url === '/api/v1/fitness/workouts')).toBe(false)
  })

  it('redeems an affordable reward, eats it, and keeps it greyed with the eaten time', async () => {
    stubBackend({ authenticated: true, state: baseState() })
    const user = userEvent.setup()
    renderPage()

    expect((await screen.findByRole('button', { name: '用 7 枚金币兑换烤肠' })).hasAttribute('disabled')).toBe(true)
    await user.click(screen.getByRole('button', { name: '用 5 枚金币兑换冰淇淋' }))

    const fresh = await screen.findByRole('button', { name: /^冰淇淋，.*选择后可以吃掉$/ })
    await user.click(fresh)
    await user.click(within(screen.getByRole('group', { name: '冰淇淋' })).getByRole('button', { name: '吃掉！' }))

    const eaten = await screen.findByRole('button', { name: /^冰淇淋，已于 .* 吃掉$/ })
    await waitFor(() => expect(eaten.closest('li')?.className).toContain('is-eaten'))
    expect(screen.getByText('待吃 0 · 已吃 1')).toBeTruthy()
  })
})
