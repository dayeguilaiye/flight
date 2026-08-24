import { describe, expect, it } from 'vitest'
import { translateDisplayError } from './errors'
import { translate } from './resources'

describe('localized errors', () => {
  it('renders the same stored error descriptor in the active locale', () => {
    const error = { code: 'invalid_credentials' }
    expect(translateDisplayError(error, (key, params) => translate('zh-CN', key, params))).toBe('密码不正确。')
    expect(translateDisplayError(error, (key, params) => translate('en', key, params))).toBe('The password is incorrect.')
  })

  it('uses a localized safe fallback for unknown backend codes', () => {
    const error = { code: 'future_backend_error' }
    expect(translateDisplayError(error, (key, params) => translate('zh-CN', key, params))).toBe('操作未能完成，请稍后重试。')
    expect(translateDisplayError(error, (key, params) => translate('en', key, params))).toBe('The operation could not be completed. Try again later.')
  })
})
