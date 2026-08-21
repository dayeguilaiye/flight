import { z } from 'zod'
import type { Capability, CapabilityResult, EphemeralTarget, Provider, TestRunRequest, TestRunResults } from '../types'

const resultSchema = z.object({
  status: z.enum(['never_run', 'passed', 'failed', 'unsupported', 'not_run']),
  response: z.unknown().optional(),
  error: z.unknown().optional(),
  durationMs: z.number().optional(),
  ttftMs: z.number().optional(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  outputTokensPerSecond: z.number().optional(),
})

const modelSchema = z.object({
  id: z.number(),
  providerId: z.number(),
  name: z.string(),
  interfaceType: z.enum(['openai_chat', 'openai_responses', 'anthropic_messages']),
  maxConcurrency: z.number().optional(),
  results: z.record(z.string(), resultSchema),
})

const providerSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  baseUrl: z.string(),
  hasToken: z.boolean(),
  tokenMasked: z.string(),
  models: z.array(modelSchema),
})

const providersSchema = z.object({ providers: z.array(providerSchema) })
const runSchema = z.object({ results: z.record(z.string(), z.record(z.string(), resultSchema)) })

async function requestJSON<T>(input: RequestInfo, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(input, { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } })
  const payload: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'error' in payload
      ? String((payload as { error?: { message?: unknown } }).error?.message ?? 'Request failed')
      : 'Request failed'
    throw new Error(message)
  }
  return schema.parse(payload)
}

export async function getSession(): Promise<boolean> {
  const payload = await requestJSON('/api/v1/auth/session', { method: 'GET' }, z.object({ authenticated: z.boolean() }))
  return payload.authenticated
}

export async function login(password: string): Promise<void> {
  await requestJSON('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ password }) }, z.object({ authenticated: z.literal(true) }))
}

export async function logout(): Promise<void> {
  await requestJSON('/api/v1/auth/logout', { method: 'POST', body: '{}' }, z.object({ authenticated: z.literal(false) }))
}

export async function listProviders(): Promise<Provider[]> {
  return providersSchema.parse(await requestJSON('/api/v1/llm-api-tester/providers', { method: 'GET' }, providersSchema)).providers
}

export async function createProvider(input: { name: string; description: string; baseUrl: string; token: string }): Promise<Provider> {
  return providerSchema.parse(await requestJSON('/api/v1/llm-api-tester/providers', { method: 'POST', body: JSON.stringify(input) }, providerSchema))
}

export async function updateProvider(id: number, input: { name: string; description: string; baseUrl: string; token?: string }): Promise<Provider> {
  return providerSchema.parse(await requestJSON(`/api/v1/llm-api-tester/providers/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, providerSchema))
}

export async function deleteProvider(id: number): Promise<void> {
  const response = await fetch(`/api/v1/llm-api-tester/providers/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Unable to delete provider')
}

export async function createModel(providerId: number, input: { name: string; interfaceType: string; maxConcurrency?: number }): Promise<void> {
  await requestJSON(`/api/v1/llm-api-tester/providers/${providerId}/models`, { method: 'POST', body: JSON.stringify(input) }, modelSchema)
}

export async function updateModel(id: number, input: { name: string; interfaceType: string; maxConcurrency?: number }): Promise<void> {
  await requestJSON(`/api/v1/llm-api-tester/models/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, modelSchema)
}

export async function deleteModel(id: number): Promise<void> {
  const response = await fetch(`/api/v1/llm-api-tester/models/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Unable to delete model')
}

export async function runCapabilities(target: { modelId: number } | EphemeralTarget, selected: Capability[]): Promise<TestRunResults> {
  const body: TestRunRequest = { targets: [target], capabilities: selected }
  return runSchema.parse(await requestJSON('/api/v1/llm-api-tester/test-runs', { method: 'POST', body: JSON.stringify(body) }, runSchema)).results as TestRunResults
}

export async function runCapabilitiesStream(
  target: { modelId: number } | EphemeralTarget,
  selected: Capability[],
  onResult: (modelRef: string, capability: Capability, result: CapabilityResult) => void,
): Promise<TestRunResults> {
  const body: TestRunRequest = { targets: [target], capabilities: selected }
  const response = await fetch('/api/v1/llm-api-tester/test-runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
  })
  if (!response.ok || !response.body) {
    const payload: unknown = await response.json().catch(() => undefined)
    const message = typeof payload === 'object' && payload !== null && 'error' in payload
      ? String((payload as { error?: { message?: unknown } }).error?.message ?? 'Request failed')
      : 'Request failed'
    throw new Error(message)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let complete: TestRunResults | undefined
  const consume = (frame: string) => {
    const data = frame.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n')
    if (!data) return
    const payload: unknown = JSON.parse(data)
    if (typeof payload !== 'object' || payload === null) return
    const event = payload as { kind?: string; modelRef?: string; capability?: Capability; result?: CapabilityResult; results?: TestRunResults; error?: string }
    if (event.kind === 'result' && event.modelRef && event.capability && event.result) onResult(event.modelRef, event.capability, event.result)
    if (event.kind === 'complete' && event.results) complete = runSchema.parse({ results: event.results }).results as TestRunResults
    if (event.kind === 'error') throw new Error(event.error ?? 'Test run failed')
  }
  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
    let boundary = buffer.indexOf('\n\n')
    while (boundary >= 0) {
      consume(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf('\n\n')
    }
    if (done) break
  }
  if (buffer.trim()) consume(buffer)
  return complete ?? {}
}
