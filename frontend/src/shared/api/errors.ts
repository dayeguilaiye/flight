import { z } from 'zod'

const errorParamSchema = z.union([z.string(), z.number(), z.boolean()])

export const publicErrorSchema = z.object({
  code: z.string(),
  message: z.string().optional(),
  field: z.string().optional(),
  params: z.record(z.string(), errorParamSchema).optional(),
  requestId: z.string().optional(),
})

export type PublicError = z.infer<typeof publicErrorSchema>

export class ApiError extends Error {
  readonly publicError: PublicError

  constructor(publicError: PublicError) {
    super(publicError.message ?? publicError.code)
    this.name = 'ApiError'
    this.publicError = publicError
  }
}

export type DisplayError = Pick<PublicError, 'code' | 'field' | 'params' | 'requestId'>

export function toDisplayError(cause: unknown, fallbackCode: string): DisplayError {
  if (cause instanceof ApiError) return cause.publicError
  return { code: fallbackCode }
}
