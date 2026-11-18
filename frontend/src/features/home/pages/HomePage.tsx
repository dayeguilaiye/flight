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
  {
    path: '/fitness',
    titleKey: 'home.fitness.title',
    descriptionKey: 'home.fitness.description',
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
    <main className="min-h-[100dvh] bg-paper text-ink" lang={locale}>
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-5 py-5 sm:px-10 sm:py-8 lg:px-14">
        <header className="pb-5 sm:pb-10">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display text-5xl leading-none tracking-[-0.03em] sm:text-7xl">{t('home.title')}</h1>
            <LanguageSwitcher />
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/62 sm:mt-6 sm:text-base sm:leading-7">{t('home.intro')}</p>
        </header>

        <nav aria-label={t('home.toolsLabel')} className="border-b border-ink/20">
          {tools.map((tool) => {
            const title = t(tool.titleKey)
            return (
              <Link
                aria-label={t('home.openTool', { name: title })}
                className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-t border-ink/20 py-3 transition-colors hover:bg-white/30 focus-visible:bg-white/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal sm:grid-cols-[minmax(12rem,0.8fr)_minmax(18rem,1.2fr)_auto] sm:gap-x-6 sm:px-4 sm:py-6 lg:px-6"
                key={tool.path}
                to={tool.path}
              >
                <h2 className="font-display text-2xl tracking-[-0.02em] sm:text-3xl">{title}</h2>
                <span className="row-span-2 flex h-10 w-10 items-center justify-center rounded-full border border-ink/25 transition group-hover:translate-x-1 group-hover:border-ink group-focus-visible:translate-x-1 sm:order-last sm:row-span-1" aria-hidden="true">
                  <ArrowIcon />
                </span>
                <p className="max-w-2xl text-sm leading-6 text-ink/60 sm:text-base sm:leading-7">{t(tool.descriptionKey)}</p>
              </Link>
            )
          })}
        </nav>

        <footer className="mt-auto pt-3 text-xs text-ink/60">
          <div className="flex justify-between gap-4">
            <span>flight / {new Date().getFullYear()}</span>
            <span>{t('home.toolsCount', { count: tools.length })}</span>
          </div>
          <a
            className="mx-auto flex min-h-10 w-fit items-center underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
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
