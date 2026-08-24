import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/errors'
import { getSession, runCapabilitiesStream } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LLM API client errors', () => {
  it('preserves the structured JSON error contract', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: {
        code: 'invalid_credentials',
        message: 'The credentials are invalid.',
        field: 'password',
      },
    }), { status: 401, headers: { 'Content-Type': 'application/json' } })))

    const error = await getSession().catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(ApiError)
    if (!(error instanceof ApiError)) throw new Error('expected ApiError')
    expect(error.publicError).toMatchObject({ code: 'invalid_credentials', field: 'password' })
  })

  it('decodes the same structured error from an SSE event', async () => {
    const body = 'event: error\ndata: {"kind":"error","error":{"code":"test_run_failed","message":"The test run could not be completed."}}\n\n'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })))

    const error = await runCapabilitiesStream(
      [{ baseUrl: 'https://api.example.com', token: 'secret', modelName: 'model', interfaceType: 'openai_chat' }],
      ['stream'],
      () => undefined,
    ).catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiError)
    if (!(error instanceof ApiError)) throw new Error('expected ApiError')
    expect(error.publicError.code).toBe('test_run_failed')
  })
})
