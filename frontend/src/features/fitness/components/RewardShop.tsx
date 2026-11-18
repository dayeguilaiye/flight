import { useId } from 'react'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import { PixelSprite } from '../sprites/PixelSprite'
import { coin } from '../sprites/sprites'
import type { Reward } from '../types'
import { rewardSprites } from './rewardSprites'

type RewardShopProps = {
  rewards: ReadonlyArray<Reward>
  balance: number
  pending: string | null
  onRedeem: (reward: Reward['kind']) => void
}

export function RewardShop({ rewards, balance, pending, onRedeem }: RewardShopProps) {
  const { t } = useI18n()
  const id = useId()

  return (
    <section className="fit-panel fit-shop" aria-labelledby={`${id}-title`}>
      <h2 className="fit-panel__title" id={`${id}-title`}>
        <span className="fit-panel__badge fit-panel__badge--pink" aria-hidden="true">$</span>
        {t('fitness.shop.title')}
      </h2>
      <ul className="fit-shop__list">
        {rewards.map((reward) => {
          const name = t(`fitness.reward.${reward.kind}`)
          const affordable = balance >= reward.cost
          const busy = pending === `redeem-${reward.kind}`
          return (
            <li className={`fit-shop__card${affordable ? ' is-affordable' : ''}`} key={reward.kind}>
              <span className="fit-shop__art">
                <PixelSprite scale={5} sprite={rewardSprites[reward.kind]} />
              </span>
              <span className="fit-shop__name">{name}</span>
              <span className="fit-shop__price">
                <PixelSprite scale={2} sprite={coin} />
                <span className="fit-num">{t('fitness.shop.price', { cost: reward.cost })}</span>
              </span>
              <button
                aria-label={t('fitness.shop.redeemLabel', { name, cost: reward.cost })}
                className="fit-btn fit-btn--gold fit-btn--small"
                disabled={!affordable || pending !== null}
                onClick={() => onRedeem(reward.kind)}
                type="button"
              >
                {busy ? '…' : t('fitness.shop.redeem')}
              </button>
              {affordable ? null : <span className="fit-shop__short">{t('fitness.shop.short', { count: reward.cost - balance })}</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
