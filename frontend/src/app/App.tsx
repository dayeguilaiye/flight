import { useEffect } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { HomePage } from '../features/home/pages/HomePage'
import { LlmApiTesterPage } from '../features/llm-api-tester/pages/LlmApiTesterPage'
import { MusicTheoryPage } from '../features/music-theory/pages/MusicTheoryPage'
import { DatabaseComparePage } from '../features/database-compare/pages/DatabaseComparePage'
import { useI18n } from '../shared/i18n/I18nProvider'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<DatabaseComparePage />} path="/gorm-vs-sqlc" />
      <Route element={<LlmApiTesterPage />} path="/llm-api-tester" />
      <Route element={<MusicTheoryPage />} path="/music-theory" />
      <Route element={<MusicTheoryPage />} path="/music-theory/lab" />
      <Route element={<MusicTheoryPage />} path="/music-theory/:chapterSlug/:lessonSlug" />
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  )
}

function NotFoundPage() {
  const { locale, t } = useI18n()

  useEffect(() => {
    document.title = t('document.title')
  }, [locale, t])

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-6 text-ink">
      <section className="max-w-xl border-y border-ink/15 py-12 text-center" lang={locale}>
        <h1 className="font-display text-4xl">{t('common.notFoundTitle')}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-ink/60">{t('common.notFoundBody')}</p>
        <Link className="mt-8 inline-flex min-h-11 items-center border-b border-ink pb-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal" to="/">
          {t('common.returnHome')}
        </Link>
      </section>
    </main>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
