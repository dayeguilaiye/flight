import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import type { TranslationKey } from '../../../shared/i18n/resources'
import { LanguageSwitcher } from '../../../shared/ui/LanguageSwitcher'

type ToolEntry = {
  path: string
  titleKey: TranslationKey
  descriptionKey: TranslationKey
}

const icpRegistration = '蜀ICP备20006375号-1'

const tools: ReadonlyArray<ToolEntry> = [
  {
    path: '/gorm-vs-sqlc',
    titleKey: 'home.database.title',
    descriptionKey: 'home.database.description',
  },
  {
    path: '/music-theory',
    titleKey: 'home.music.title',
    descriptionKey: 'home.music.description',
  },
]

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  )
}

export function HomePage() {
  const { locale, t } = useI18n()

  useEffect(() => {
    document.title = t('home.documentTitle')
  }, [locale, t])

  return (
    <main className="min-h-screen bg-paper text-ink" lang={locale}>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-7 sm:px-10 sm:py-10 lg:px-14">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        <header className="max-w-4xl pb-16 pt-12 sm:pb-24 sm:pt-20">
          <h1 className="font-display text-6xl leading-none tracking-[-0.03em] sm:text-8xl lg:text-9xl">{t('home.title')}</h1>
          <p className="mt-8 max-w-2xl text-base leading-8 text-ink/62 sm:text-lg">{t('home.intro')}</p>
        </header>

        <nav aria-label={t('home.toolsLabel')} className="mt-auto border-b border-ink/20">
          {tools.map((tool) => {
            const title = t(tool.titleKey)
            return (
              <Link
                aria-label={t('home.openTool', { name: title })}
                className="group grid min-h-36 items-center gap-5 border-t border-ink/20 py-7 transition-colors hover:bg-white/30 focus-visible:bg-white/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal sm:grid-cols-[minmax(13rem,0.8fr)_minmax(18rem,1.2fr)_auto] sm:px-4 lg:min-h-40 lg:px-6"
                key={tool.path}
                to={tool.path}
              >
                <h2 className="font-display text-3xl tracking-[-0.02em] sm:text-4xl">{title}</h2>
                <p className="max-w-2xl text-sm leading-7 text-ink/60 sm:text-base">{t(tool.descriptionKey)}</p>
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/25 transition group-hover:translate-x-1 group-hover:border-ink group-focus-visible:translate-x-1" aria-hidden="true">
                  <ArrowIcon />
                </span>
              </Link>
            )
          })}
        </nav>

        <footer className="py-6 text-xs text-ink/60">
          <div className="flex justify-between gap-4">
            <span>flight / {new Date().getFullYear()}</span>
            <span>{t('home.toolsCount', { count: tools.length })}</span>
          </div>
          <a
            className="mx-auto mt-4 flex min-h-11 w-fit items-center underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
            href="https://beian.miit.gov.cn/"
            lang="zh-CN"
            rel="noopener noreferrer"
            target="_blank"
          >
            {icpRegistration}
          </a>
        </footer>
      </div>
    </main>
  )
}
