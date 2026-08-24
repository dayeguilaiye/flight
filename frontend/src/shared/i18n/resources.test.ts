import { describe, expect, it } from 'vitest'
import { translate, zhCN, en } from './resources'

describe('translation resources', () => {
  it('keeps both dictionaries structurally complete', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zhCN).sort())
    expect(Object.values(en).join('')).not.toMatch(/[\u3400-\u9fff]/)
  })

  it('renders representative interface and error copy in the active language', () => {
    expect(translate('zh-CN', 'llm.title')).toBe('LLM API 测试器')
    expect(translate('en', 'llm.title')).toBe('LLM API tester')
    expect(translate('zh-CN', 'error.invalid_credentials')).toBe('密码不正确。')
    expect(translate('en', 'error.invalid_credentials')).toBe('The password is incorrect.')
  })

  it('interpolates safe error parameters', () => {
    expect(translate('zh-CN', 'error.max_concurrency_invalid', { min: 1 })).toContain('1')
    expect(translate('en', 'llm.configuration.selectedCount', { count: 3 })).toBe('3 selected')
  })
})
