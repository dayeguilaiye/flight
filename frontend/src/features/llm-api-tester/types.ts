export const capabilities = ['tool_use', 'reasoning', 'stream', 'tool_choice', 'structured_output'] as const
export type Capability = (typeof capabilities)[number]

export type CapabilityStatus = 'never_run' | 'passed' | 'failed' | 'unsupported' | 'not_run'

export interface CapabilityResult {
  status: CapabilityStatus
  response?: unknown
  error?: unknown
  durationMs?: number
  ttftMs?: number
  inputTokens?: number
  outputTokens?: number
  outputTokensPerSecond?: number
}

export interface Model {
  id: number
  providerId: number
  name: string
  interfaceType: InterfaceType
  maxConcurrency?: number
  results: Record<Capability, CapabilityResult>
}

export interface Provider {
  id: number
  name: string
  description: string
  baseUrl: string
  hasToken: boolean
  tokenMasked: string
  models: Model[]
}

export type InterfaceType = 'openai_chat' | 'openai_responses' | 'anthropic_messages'

export interface EphemeralTarget {
  baseUrl: string
  token: string
  modelName: string
  interfaceType: InterfaceType
  maxConcurrency?: number
}

export interface TestRunRequest {
  targets: Array<{ modelId: number } | EphemeralTarget>
  capabilities: Capability[]
}

export type TestRunResults = Record<string, Record<Capability, CapabilityResult>>
