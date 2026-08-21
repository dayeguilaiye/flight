import { z } from 'zod'
import type { Capability, EphemeralTarget, Provider, TestRunRequest, TestRunResults } from '../types'

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

export async function deleteProvider(id: number): Promise<void> {
  const response = await fetch(`/api/v1/llm-api-tester/providers/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Unable to delete provider')
}

export async function createModel(providerId: number, input: { name: string; interfaceType: string; maxConcurrency?: number }): Promise<void> {
  await requestJSON(`/api/v1/llm-api-tester/providers/${providerId}/models`, { method: 'POST', body: JSON.stringify(input) }, modelSchema)
}

export async function runCapabilities(target: { modelId: number } | EphemeralTarget, selected: Capability[]): Promise<TestRunResults> {
  const body: TestRunRequest = { targets: [target], capabilities: selected }
  return runSchema.parse(await requestJSON('/api/v1/llm-api-tester/test-runs', { method: 'POST', body: JSON.stringify(body) }, runSchema)).results as TestRunResults
}
