import { describe, expect, it } from 'vitest'
import { defaultLocale, localeStorageKey, readSavedLocale, saveLocale } from './locale'

describe('locale persistence', () => {
  it('defaults to Simplified Chinese when no preference exists', () => {
    expect(readSavedLocale({ getItem: () => null, setItem: () => undefined })).toBe(defaultLocale)
  })

  it('restores a supported saved locale', () => {
    expect(readSavedLocale({ getItem: () => 'en', setItem: () => undefined })).toBe('en')
  })

  it('falls back when the saved value is invalid or storage is blocked', () => {
    expect(readSavedLocale({ getItem: () => 'fr', setItem: () => undefined })).toBe('zh-CN')
    expect(readSavedLocale({ getItem: () => { throw new Error('blocked') }, setItem: () => undefined })).toBe('zh-CN')
  })

  it('persists an explicit choice without failing when storage is blocked', () => {
    let saved: [string, string] | undefined
    saveLocale({ getItem: () => null, setItem: (key, value) => { saved = [key, value] } }, 'en')
    expect(saved).toEqual([localeStorageKey, 'en'])
    expect(() => saveLocale({ getItem: () => null, setItem: () => { throw new Error('blocked') } }, 'en')).not.toThrow()
  })
})
