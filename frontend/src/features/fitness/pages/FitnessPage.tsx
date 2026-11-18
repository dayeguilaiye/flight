import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import { translateDisplayError } from '../../../shared/i18n/errors'
import { LanguageSwitcher } from '../../../shared/ui/LanguageSwitcher'
import { GymStage } from '../components/GymStage'
import { InventoryBag } from '../components/InventoryBag'
import { LoginPanel } from '../components/LoginPanel'
import { RewardShop } from '../components/RewardShop'
import { TrainingField } from '../components/TrainingField'
import { WorkoutForm } from '../components/WorkoutForm'
import { useFitness } from '../hooks/useFitness'
import { PixelSprite } from '../sprites/PixelSprite'
import { coin } from '../sprites/sprites'
import './fitness.css'

const formFields = new Set(['durationMinutes', 'endedAt', 'note'])

export function FitnessPage() {
  const { locale, t } = useI18n()
  const fitness = useFitness()
  const { phase, state, pending, error } = fitness

  useEffect(() => {
    document.title = t('fitness.documentTitle')
  }, [locale, t])

  const bannerError = phase === 'ready' && error && !formFields.has(error.field ?? '') ? error : null

  return (
    <main className="fit" lang={locale}>
      <div className="fit-shell">
        <header className="fit-top">
          <Link className="fit-back" to="/">
            <span aria-hidden="true">◀</span> Flight
            <span className="fit-sr-only">{t('common.home')}</span>
          </Link>
          <div className="fit-top__title">
            <PixelSprite scale={3} sprite={coin} />
            <div>
              <h1>{t('fitness.title')}</h1>
              <p>{t('fitness.tagline')}</p>
            </div>
          </div>
          <div className="fit-top__actions">
            <LanguageSwitcher />
            {phase === 'ready' ? (
              <button className="fit-btn fit-btn--ghost fit-btn--small" onClick={() => void fitness.signOut()} type="button">
                {t('fitness.logout')}
              </button>
            ) : null}
          </div>
        </header>

        {phase === 'checking' ? (
          <p className="fit-loading" role="status">
            <PixelSprite className="fit-coin-spin" scale={4} sprite={coin} />
            {t('fitness.loading')}
          </p>
        ) : null}

        {phase === 'login' ? <LoginPanel error={error} onSubmit={(password) => void fitness.signIn(password)} pending={pending === 'login'} /> : null}

        {phase === 'unavailable' ? (
          <section className="fit-panel fit-login" role="alert">
            <h2 className="fit-panel__title">{t('fitness.unavailable.title')}</h2>
            {error ? <p className="fit-hint">{translateDisplayError(error, t)}</p> : null}
            <button className="fit-btn fit-btn--gold" onClick={() => void fitness.reload()} type="button">
              {t('fitness.retry')}
            </button>
          </section>
        ) : null}

        {phase === 'ready' && state ? (
          <>
            <GymStage event={fitness.event} summary={state.summary} />
            {bannerError ? (
              <p className="fit-banner" role="alert">
                {translateDisplayError(bannerError, t)}
              </p>
            ) : null}
            <div className="fit-grid">
              <WorkoutForm error={error} onSubmit={fitness.addWorkout} pending={pending === 'workout'} summary={state.summary} />
              <div className="fit-stack">
                <RewardShop balance={state.summary.coinBalance} onRedeem={(kind) => void fitness.redeem(kind)} pending={pending} rewards={state.rewards} />
                <InventoryBag event={fitness.event} items={state.items} onEat={(itemId) => void fitness.eat(itemId)} pending={pending} />
              </div>
              <TrainingField onDelete={(id) => void fitness.deleteWorkout(id)} pending={pending} workouts={state.workouts} />
            </div>
          </>
        ) : null}
      </div>
    </main>
  )
}
