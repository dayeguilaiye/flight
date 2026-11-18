import { useI18n } from '../../../shared/i18n/I18nProvider'
import type { FitnessEvent } from '../hooks/useFitness'
import { PixelSprite } from '../sprites/PixelSprite'
import { coin, heroSquat, heroStand, sparkle } from '../sprites/sprites'
import type { FitnessState } from '../types'
import { formatDuration } from './format'

type GymStageProps = {
  summary: FitnessState['summary']
  event: FitnessEvent | null
}

function eventMessage(event: FitnessEvent, t: ReturnType<typeof useI18n>['t']): string {
  switch (event.kind) {
    case 'coins':
      return t('fitness.event.coins', { count: event.amount })
    case 'logged':
      return t('fitness.event.logged')
    case 'redeemed':
      return t('fitness.event.redeemed', { name: t(`fitness.reward.${event.reward}`) })
    case 'eaten':
      return t('fitness.event.eaten')
  }
}

/** The hero scene plus the coin HUD. */
export function GymStage({ summary, event }: GymStageProps) {
  const { t } = useI18n()
  const progress = summary.minutesTowardNextCoin / summary.minutesPerCoin
  const burst = event?.kind === 'coins' ? Math.min(event.amount, 6) : 0

  return (
    <section className="fit-stage" aria-label={t('fitness.hud.coins')}>
      <div className="fit-scene">
        <span className="fit-cloud fit-cloud--a" aria-hidden="true" />
        <span className="fit-cloud fit-cloud--b" aria-hidden="true" />
        <div className="fit-hero" aria-hidden="true">
          <PixelSprite className="fit-hero__frame fit-hero__frame--a" scale={6} sprite={heroStand} />
          <PixelSprite className="fit-hero__frame fit-hero__frame--b" scale={6} sprite={heroSquat} />
          {event ? (
            <span className="fit-bubble" key={event.id}>
              {eventMessage(event, t)}
            </span>
          ) : null}
          {Array.from({ length: burst }, (_, index) => (
            <span className="fit-burst" key={`${event?.id}-${index}`}>
              <PixelSprite scale={2} sprite={coin} />
            </span>
          ))}
          {event && event.kind !== 'logged' ? (
            <span className="fit-sparkle" key={`s-${event.id}`}>
              <PixelSprite scale={3} sprite={sparkle} />
            </span>
          ) : null}
        </div>
        <div className="fit-ground" aria-hidden="true" />
      </div>

      <div className="fit-hud">
        <div className="fit-hud__coins" aria-label={t('fitness.hud.coinsLabel', { count: summary.coinBalance })} role="group">
          <PixelSprite className="fit-coin-spin" scale={4} sprite={coin} />
          <span className="fit-hud__value" key={summary.coinBalance}>
            {summary.coinBalance}
          </span>
          <span className="fit-hud__label">{t('fitness.hud.coins')}</span>
        </div>

        <div className="fit-hud__next">
          <div className="fit-hud__row">
            <span className="fit-hud__label">{t('fitness.hud.nextCoin')}</span>
            <span className="fit-num">{t('fitness.hud.progress', { current: summary.minutesTowardNextCoin, total: summary.minutesPerCoin })}</span>
          </div>
          <div
            aria-label={t('fitness.hud.nextCoin')}
            aria-valuemax={summary.minutesPerCoin}
            aria-valuemin={0}
            aria-valuenow={summary.minutesTowardNextCoin}
            className="fit-bar"
            role="progressbar"
          >
            <span className="fit-bar__fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <div className="fit-hud__total">
          <span className="fit-hud__label">{t('fitness.hud.total')}</span>
          <span className="fit-hud__total-value fit-num">{formatDuration(summary.totalMinutes, t)}</span>
          <span className="fit-hud__meta">{t('fitness.hud.earned', { earned: summary.coinsEarned, spent: summary.coinsSpent })}</span>
        </div>
      </div>

      <p aria-live="polite" className="fit-sr-only">
        {event ? eventMessage(event, t) : ''}
      </p>
    </section>
  )
}
