import { useId, useMemo, useState } from 'react'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import { buildField, dayKey, type FieldDay } from '../domain/field'
import { PixelSprite } from '../sprites/PixelSprite'
import { fieldTiles } from '../sprites/sprites'
import type { Workout } from '../types'
import { formatDay, formatDuration, formatMonth, formatTime, formatWeekday } from './format'

type TrainingFieldProps = {
  workouts: ReadonlyArray<Workout>
  pending: string | null
  onDelete: (id: number) => void
}

const legendKeys = ['fitness.field.level0', 'fitness.field.level1', 'fitness.field.level2', 'fitness.field.level3', 'fitness.field.level4'] as const

/** Workout history drawn as a 12-week plot of land; each day grows by minutes. */
export function TrainingField({ workouts, pending, onDelete }: TrainingFieldProps) {
  const { locale, t } = useI18n()
  const id = useId()
  const [page, setPage] = useState(0)
  const [selectedKey, setSelectedKey] = useState(() => dayKey(new Date()))
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const weeks = useMemo(() => buildField(workouts, new Date(), page), [workouts, page])
  const days = weeks.flat()
  const selected = days.find((day) => day.key === selectedKey)
  const activeDays = days.filter((day) => day.minutes > 0)
  const periodMinutes = activeDays.reduce((sum, day) => sum + day.minutes, 0)
  const hasEarlier = workouts.some((workout) => new Date(workout.endedAt) < days[0].date)

  function dayLabel(day: FieldDay): string {
    const date = formatDay(day.date, locale)
    return day.minutes > 0 ? t('fitness.field.dayLabel', { date, duration: formatDuration(day.minutes, t) }) : t('fitness.field.dayRest', { date })
  }

  function select(day: FieldDay) {
    setSelectedKey(day.key)
    setConfirmId(null)
  }

  return (
    <section className="fit-panel fit-field-panel" aria-labelledby={`${id}-title`}>
      <div className="fit-panel__head">
        <h2 className="fit-panel__title" id={`${id}-title`}>
          <span className="fit-panel__badge fit-panel__badge--grass" aria-hidden="true">*</span>
          {t('fitness.field.title')}
        </h2>
        <div className="fit-field-nav">
          <button className="fit-btn fit-btn--ghost fit-btn--small" disabled={!hasEarlier} onClick={() => setPage(page + 1)} type="button">
            ◀ {t('fitness.field.prev')}
          </button>
          <button className="fit-btn fit-btn--ghost fit-btn--small" disabled={page === 0} onClick={() => setPage(page - 1)} type="button">
            {t('fitness.field.next')} ▶
          </button>
        </div>
      </div>
      <p className="fit-hint">{t('fitness.field.subtitle')}</p>

      <div className="fit-field-layout">
        <div className="fit-field-board">
          <div className="fit-plot" role="group" aria-labelledby={`${id}-title`}>
            <div className="fit-plot__col fit-plot__labels" aria-hidden="true">
              <span className="fit-plot__month" />
              {weeks[0].map((day, index) => (
                <span className="fit-plot__weekday" key={day.key}>
                  {index % 2 === 0 ? formatWeekday(day.date, locale) : ''}
                </span>
              ))}
            </div>
            {weeks.map((week, weekIndex) => {
              const first = week[0].date
              // Label a column when its month starts; skip the leading partial month if the next label would collide.
              const showMonth =
                weekIndex === 0 ? first.getMonth() === weeks[1][0].date.getMonth() : first.getMonth() !== weeks[weekIndex - 1][0].date.getMonth()
              return (
                <div className="fit-plot__col" key={week[0].key}>
                  <span className="fit-plot__month" aria-hidden="true">
                    {showMonth ? formatMonth(first, locale) : ''}
                  </span>
                  {week.map((day) => (
                    <button
                      aria-label={dayLabel(day)}
                      aria-pressed={day.key === selectedKey}
                      className={`fit-tile fit-tile--${day.level}${day.isToday ? ' is-today' : ''}${day.key === selectedKey ? ' is-selected' : ''}`}
                      disabled={day.isFuture}
                      key={day.key}
                      onClick={() => select(day)}
                      type="button"
                    >
                      {day.isFuture ? null : <PixelSprite className="fit-tile__sprite" scale={4} sprite={fieldTiles[day.level]} />}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>

          <ul aria-label={t('fitness.field.legend')} className="fit-legend">
            {legendKeys.map((key, level) => (
              <li key={key}>
                <span className={`fit-legend__tile fit-tile--${level}`}>
                  <PixelSprite scale={2.4} sprite={fieldTiles[level]} />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
          <p className="fit-hint">{t('fitness.field.periodStats', { days: activeDays.length, duration: formatDuration(periodMinutes, t) })}</p>
        </div>

        <div aria-live="polite" className="fit-day">
          {selected ? (
            <>
              <h3 className="fit-day__title">
                {formatDay(selected.date, locale)}
                {selected.minutes > 0 ? <span className="fit-day__total fit-num">{formatDuration(selected.minutes, t)}</span> : null}
              </h3>
              {selected.workouts.length === 0 ? (
                <p className="fit-hint fit-day__empty">{selected.isFuture ? t('fitness.field.dayFuture') : t('fitness.field.dayEmpty')}</p>
              ) : (
                <ol className="fit-day__list">
                  {selected.workouts.map((workout) => {
                    const time = formatTime(workout.endedAt, locale)
                    return (
                      <li className="fit-scroll" key={workout.id}>
                        <div className="fit-scroll__head">
                          <span className="fit-num">{t('fitness.field.workoutTime', { time, duration: formatDuration(workout.durationMinutes, t) })}</span>
                          {confirmId === workout.id ? null : (
                            <button aria-label={t('fitness.field.deleteLabel', { time })} className="fit-icon-btn" onClick={() => setConfirmId(workout.id)} type="button">
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                        <p className={workout.note ? 'fit-scroll__note' : 'fit-scroll__note is-empty'}>{workout.note || t('fitness.field.noNote')}</p>
                        {confirmId === workout.id ? (
                          <div className="fit-confirm" role="group" aria-label={t('fitness.field.deleteConfirm')}>
                            <span>{t('fitness.field.deleteConfirm')}</span>
                            <button className="fit-btn fit-btn--pink fit-btn--small" disabled={pending !== null} onClick={() => onDelete(workout.id)} type="button">
                              {t('fitness.field.deleteYes')}
                            </button>
                            <button className="fit-btn fit-btn--ghost fit-btn--small" onClick={() => setConfirmId(null)} type="button">
                              {t('fitness.field.deleteNo')}
                            </button>
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ol>
              )}
            </>
          ) : (
            <p className="fit-hint fit-day__empty">{t('fitness.field.dayEmpty')}</p>
          )}
        </div>
      </div>
    </section>
  )
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" height="16" shapeRendering="crispEdges" viewBox="0 0 8 8" width="16">
      <path d="M2 0h4v1h2v1H0V1h2zM1 3h6v5H1zM2 4v3h1V4zm3 0v3h1V4z" fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}
