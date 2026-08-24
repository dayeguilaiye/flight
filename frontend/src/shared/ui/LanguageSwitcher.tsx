import { useI18n } from '../i18n/I18nProvider'
import type { Locale } from '../i18n/locale'

const options: Array<{ locale: Locale; labelKey: 'language.zhCN' | 'language.en' }> = [
  { locale: 'zh-CN', labelKey: 'language.zhCN' },
  { locale: 'en', labelKey: 'language.en' },
]

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div aria-label={t('language.label')} className="inline-flex rounded-full border border-ink/20 bg-white/35 p-1" role="group">
      {options.map((option) => (
        <button
          aria-pressed={locale === option.locale}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${locale === option.locale ? 'bg-ink text-paper' : 'text-ink/60 hover:bg-ink/5 hover:text-ink'}`}
          key={option.locale}
          lang={locale}
          onClick={() => setLocale(option.locale)}
          type="button"
        >
          {t(option.labelKey)}
        </button>
      ))}
    </div>
  )
}
