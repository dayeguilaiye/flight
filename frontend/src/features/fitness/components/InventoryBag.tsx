import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import type { FitnessEvent } from '../hooks/useFitness'
import { sortInventory } from '../domain/field'
import { PixelSprite } from '../sprites/PixelSprite'
import type { InventoryItem } from '../types'
import { formatDateTime } from './format'
import { rewardSprites } from './rewardSprites'

const minimumSlots = 8

type InventoryBagProps = {
  items: ReadonlyArray<InventoryItem>
  pending: string | null
  event: FitnessEvent | null
  onEat: (itemId: number) => void
}

export function InventoryBag({ items, pending, event, onEat }: InventoryBagProps) {
  const { locale, t } = useI18n()
  const id = useId()
  const rootRef = useRef<HTMLElement>(null)
  /** The fresh item whose eat prompt is open, or the eaten item whose time is revealed. */
  const [openId, setOpenId] = useState<number | null>(null)

  const sorted = sortInventory(items)
  const fresh = sorted.filter((item) => !item.eatenAt).length
  const slots = Math.max(minimumSlots, Math.ceil((sorted.length + 1) / 4) * 4)
  const newestId = event?.kind === 'redeemed' ? sorted.find((item) => !item.eatenAt)?.id : undefined
  const eatenId = event?.kind === 'eaten' ? event.itemId : undefined
  const choosing = sorted.find((item) => item.id === openId && !item.eatenAt)

  useEffect(() => {
    if (openId === null) return
    function close(nativeEvent: PointerEvent | KeyboardEvent) {
      if (nativeEvent instanceof KeyboardEvent ? nativeEvent.key === 'Escape' : !(nativeEvent.target instanceof Node && rootRef.current?.contains(nativeEvent.target))) setOpenId(null)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [openId])

  return (
    <section className="fit-panel fit-bag" aria-labelledby={`${id}-title`} ref={rootRef}>
      <div className="fit-panel__head">
        <h2 className="fit-panel__title" id={`${id}-title`}>
          <span className="fit-panel__badge fit-panel__badge--sky" aria-hidden="true">#</span>
          {t('fitness.bag.title')}
        </h2>
        <span className="fit-hint fit-num">{t('fitness.bag.counts', { fresh, eaten: sorted.length - fresh })}</span>
      </div>
      {sorted.length === 0 ? <p className="fit-hint fit-bag__empty">{t('fitness.bag.empty')}</p> : null}
      <ul className="fit-bag__grid">
        {sorted.map((item) => {
          const name = t(`fitness.reward.${item.kind}`)
          const open = openId === item.id
          const tipId = `${id}-tip-${item.id}`
          const classes = ['fit-slot', item.eatenAt ? 'is-eaten' : 'is-fresh', item.id === newestId ? 'is-new' : '', item.id === eatenId ? 'is-munched' : '', open ? 'is-open' : '']
          return (
            <li className={classes.filter(Boolean).join(' ')} key={item.id}>
              <button
                aria-describedby={tipId}
                aria-expanded={item.eatenAt ? undefined : open}
                aria-label={
                  item.eatenAt
                    ? t('fitness.bag.eatenLabel', { name, date: formatDateTime(item.eatenAt, locale) })
                    : t('fitness.bag.freshLabel', { name, date: formatDateTime(item.redeemedAt, locale) })
                }
                className="fit-slot__button"
                onClick={() => setOpenId(open ? null : item.id)}
                type="button"
              >
                <PixelSprite scale={3} sprite={rewardSprites[item.kind]} />
              </button>
              <span className="fit-tip" id={tipId} role="tooltip">
                <strong>{name}</strong>
                <span>
                  {item.eatenAt
                    ? t('fitness.bag.eatenAt', { date: formatDateTime(item.eatenAt, locale) })
                    : t('fitness.bag.redeemedAt', { date: formatDateTime(item.redeemedAt, locale) })}
                </span>
              </span>
            </li>
          )
        })}
        {Array.from({ length: slots - sorted.length }, (_, index) => (
          <li aria-hidden="true" className="fit-slot is-empty" key={`empty-${index}`} />
        ))}
      </ul>
      {choosing ? (
        <div aria-label={t(`fitness.reward.${choosing.kind}`)} className="fit-bag__action" role="group">
          <PixelSprite scale={2} sprite={rewardSprites[choosing.kind]} />
          <span className="fit-bag__action-text">
            <strong>{t(`fitness.reward.${choosing.kind}`)}</strong>
            <span>{t('fitness.bag.redeemedAt', { date: formatDateTime(choosing.redeemedAt, locale) })}</span>
          </span>
          <span className="fit-bag__action-buttons">
            <button
              className="fit-btn fit-btn--pink fit-btn--small"
              disabled={pending !== null}
              onClick={() => {
                setOpenId(null)
                onEat(choosing.id)
              }}
              type="button"
            >
              {t('fitness.bag.eat')}
            </button>
            <button className="fit-btn fit-btn--ghost fit-btn--small" onClick={() => setOpenId(null)} type="button">
              {t('fitness.bag.cancel')}
            </button>
          </span>
        </div>
      ) : null}
    </section>
  )
}
