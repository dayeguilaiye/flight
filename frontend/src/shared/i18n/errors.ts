import type { DisplayError } from '../api/errors'
import type { TranslationKey, TranslationParams } from './resources'

const errorKeys: Record<string, TranslationKey> = {
  method_not_allowed: 'error.method_not_allowed',
  invalid_json: 'error.invalid_json',
  invalid_credentials: 'error.invalid_credentials',
  owner_required: 'error.owner_required',
  internal_error: 'error.internal_error',
  invalid_id: 'error.invalid_id',
  not_found: 'error.not_found',
  invalid_input: 'error.invalid_input',
  provider_name_required: 'error.provider_name_required',
  provider_base_url_invalid: 'error.provider_base_url_invalid',
  provider_token_required: 'error.provider_token_required',
  model_name_required: 'error.model_name_required',
  interface_type_unsupported: 'error.interface_type_unsupported',
  max_concurrency_invalid: 'error.max_concurrency_invalid',
  test_target_required: 'error.test_target_required',
  capability_required: 'error.capability_required',
  guest_request_limit_exceeded: 'error.guest_request_limit_exceeded',
  capability_unknown: 'error.capability_unknown',
  capability_duplicate: 'error.capability_duplicate',
  test_target_invalid: 'error.test_target_invalid',
  model_id_invalid: 'error.model_id_invalid',
  ephemeral_target_incomplete: 'error.ephemeral_target_incomplete',
  test_run_failed: 'error.test_run_failed',
  streaming_unavailable: 'error.streaming_unavailable',
  guest_url_blocked: 'error.guest_url_blocked',
  request_failed: 'error.request_failed',
  unable_to_load_workspace: 'error.unable_to_load_workspace',
  selected_model_missing: 'error.selected_model_missing',
  configuration_failed: 'error.configuration_failed',
  login_failed: 'error.login_failed',
}

export function translateDisplayError(
  error: DisplayError,
  t: (key: TranslationKey, params?: TranslationParams) => string,
): string {
  return t(errorKeys[error.code] ?? 'error.generic', error.params)
}
