import type { TranslationKey, TranslationParams } from '../../../shared/i18n/resources'
import type { Locale } from '../../../shared/i18n/locale'

type Translate = (key: TranslationKey, params?: TranslationParams) => string

export function formatDuration(totalMinutes: number, t: Translate): string {
  if (totalMinutes < 60) return t('fitness.duration.minutes', { minutes: totalMinutes })
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? t('fitness.duration.hoursOnly', { hours }) : t('fitness.duration.hours', { hours, minutes })
}

/** Short date and time, e.g. "11月18日 20:31" / "Nov 18, 20:31". */
export function formatDateTime(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}

export function formatTime(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}

/** Day heading, e.g. "11月18日 星期三" / "Wed, Nov 18". */
export function formatDay(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', weekday: 'short' }).format(date)
}

export function formatMonth(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)
}

export function formatWeekday(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(date)
}
