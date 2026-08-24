import { z } from 'zod'

export const localeSchema = z.enum(['zh-CN', 'en'])
export type Locale = z.infer<typeof localeSchema>

export const defaultLocale: Locale = 'zh-CN'
export const localeStorageKey = 'flight.locale'

type LocaleStorage = Pick<Storage, 'getItem' | 'setItem'>

export function readSavedLocale(storage?: LocaleStorage): Locale {
  if (!storage) return defaultLocale
  try {
    const result = localeSchema.safeParse(storage.getItem(localeStorageKey))
    return result.success ? result.data : defaultLocale
  } catch {
    return defaultLocale
  }
}

export function saveLocale(storage: LocaleStorage | undefined, locale: Locale): void {
  if (!storage) return
  try {
    storage.setItem(localeStorageKey, locale)
  } catch {
    // The in-memory locale still changes when storage is unavailable.
  }
}
