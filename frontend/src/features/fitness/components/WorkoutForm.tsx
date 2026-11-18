import { useId, useState, type FormEvent } from 'react'
import type { DisplayError } from '../../../shared/api/errors'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import { translateDisplayError } from '../../../shared/i18n/errors'
import { fromLocalInputValue, toLocalInputValue } from '../domain/field'
import { workoutLimits, type FitnessState, type WorkoutDraft } from '../types'

const quickDurations = [15, 30, 45, 60, 90]

type WorkoutFormProps = {
  summary: FitnessState['summary']
  pending: boolean
  /** Server error to show when it belongs to one of this form's fields. */
  error: DisplayError | null
  onSubmit: (draft: WorkoutDraft) => Promise<boolean>
}

type FieldName = 'durationMinutes' | 'endedAt' | 'note'

export function parseDuration(value: string): number | undefined {
  if (!/^\d+$/.test(value.trim())) return undefined
  const minutes = Number(value)
  return minutes >= workoutLimits.minMinutes && minutes <= workoutLimits.maxMinutes ? minutes : undefined
}

export function WorkoutForm({ summary, pending, error, onSubmit }: WorkoutFormProps) {
  const { t } = useI18n()
  const id = useId()
  const [duration, setDuration] = useState('')
  const [customEnd, setCustomEnd] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [invalid, setInvalid] = useState<FieldName | null>(null)

  const minutes = parseDuration(duration)
  const after = summary.minutesTowardNextCoin + (minutes ?? 0)
  const gained = Math.floor(after / summary.minutesPerCoin)
  const remaining = summary.minutesPerCoin - (after % summary.minutesPerCoin)

  function adjust(delta: number) {
    const current = Number.parseInt(duration, 10)
    const next = Math.min(workoutLimits.maxMinutes, Math.max(workoutLimits.minMinutes, (Number.isNaN(current) ? 0 : current) + delta))
    setDuration(String(next))
    setInvalid(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (minutes === undefined) {
      setInvalid('durationMinutes')
      return
    }
    let endedAt: string | undefined
    if (customEnd !== null) {
      endedAt = fromLocalInputValue(customEnd)
      if (!endedAt) {
        setInvalid('endedAt')
        return
      }
    }
    setInvalid(null)
    if (await onSubmit({ durationMinutes: minutes, endedAt, note: note.trim() })) {
      setDuration('')
      setNote('')
      setCustomEnd(null)
    }
  }

  const fieldError = (field: FieldName): string | null => {
    if (invalid === field) return field === 'durationMinutes' ? t('fitness.form.invalidDuration') : field === 'endedAt' ? t('fitness.form.invalidEnd') : null
    if (error?.field === field) return translateDisplayError(error, t)
    return null
  }
  const durationError = fieldError('durationMinutes')
  const endError = fieldError('endedAt')
  const noteError = fieldError('note')

  return (
    <section className="fit-panel fit-log" aria-labelledby={`${id}-title`}>
      <h2 className="fit-panel__title" id={`${id}-title`}>
        <span className="fit-panel__badge fit-panel__badge--grass" aria-hidden="true">+</span>
        {t('fitness.form.title')}
      </h2>
      <form className="fit-form" noValidate onSubmit={submit}>
        <div className="fit-field">
          <label className="fit-label" htmlFor={`${id}-duration`}>
            {t('fitness.form.duration')}
          </label>
          <div className="fit-stepper">
            <button aria-label={t('fitness.form.decrease')} className="fit-btn fit-btn--ghost fit-btn--square" onClick={() => adjust(-5)} type="button">
              −
            </button>
            <input
              aria-describedby={`${id}-duration-hint`}
              aria-invalid={durationError ? true : undefined}
              className="fit-input fit-input--big"
              id={`${id}-duration`}
              inputMode="numeric"
              max={workoutLimits.maxMinutes}
              min={workoutLimits.minMinutes}
              onChange={(event) => {
                setDuration(event.target.value)
                setInvalid(null)
              }}
              placeholder="30"
              type="number"
              value={duration}
            />
            <button aria-label={t('fitness.form.increase')} className="fit-btn fit-btn--ghost fit-btn--square" onClick={() => adjust(5)} type="button">
              +
            </button>
          </div>
          <div aria-label={t('fitness.form.quick')} className="fit-chips" role="group">
            {quickDurations.map((value) => (
              <button
                aria-pressed={minutes === value}
                className="fit-chip"
                key={value}
                onClick={() => {
                  setDuration(String(value))
                  setInvalid(null)
                }}
                type="button"
              >
                {t('fitness.form.quickValue', { minutes: value })}
              </button>
            ))}
          </div>
          <p className="fit-hint" id={`${id}-duration-hint`}>
            {minutes !== undefined
              ? gained > 0
                ? <strong className="fit-hint--gold">{t('fitness.form.previewCoins', { count: gained })}</strong>
                : t('fitness.form.previewNone', { minutes: remaining })
              : t('fitness.form.durationHint')}
          </p>
          {durationError ? <p className="fit-error" role="alert">{durationError}</p> : null}
        </div>

        <div className="fit-field">
          <span className="fit-label" id={`${id}-end-label`}>
            {t('fitness.form.endTime')}
          </span>
          {customEnd === null ? (
            <div className="fit-end">
              <span className="fit-end__now">
                <span className="fit-blink" aria-hidden="true" />
                {t('fitness.form.endNow')}
              </span>
              <button aria-describedby={`${id}-end-label`} className="fit-btn fit-btn--ghost fit-btn--small" onClick={() => setCustomEnd(toLocalInputValue(new Date()))} type="button">
                {t('fitness.form.endEdit')}
              </button>
            </div>
          ) : (
            <div className="fit-end">
              <input
                aria-invalid={endError ? true : undefined}
                aria-labelledby={`${id}-end-label`}
                className="fit-input"
                max={toLocalInputValue(new Date())}
                onChange={(event) => {
                  setCustomEnd(event.target.value)
                  setInvalid(null)
                }}
                type="datetime-local"
                value={customEnd}
              />
              <button className="fit-btn fit-btn--ghost fit-btn--small" onClick={() => setCustomEnd(null)} type="button">
                {t('fitness.form.endReset')}
              </button>
            </div>
          )}
          {endError ? <p className="fit-error" role="alert">{endError}</p> : null}
        </div>

        <div className="fit-field">
          <div className="fit-label-row">
            <label className="fit-label" htmlFor={`${id}-note`}>
              {t('fitness.form.note')}
            </label>
            <span className="fit-hint fit-num">{t('fitness.form.noteCount', { count: note.length, max: workoutLimits.maxNote })}</span>
          </div>
          <textarea
            aria-invalid={noteError ? true : undefined}
            className="fit-input fit-textarea"
            id={`${id}-note`}
            maxLength={workoutLimits.maxNote}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('fitness.form.notePlaceholder')}
            rows={3}
            value={note}
          />
          {noteError ? <p className="fit-error" role="alert">{noteError}</p> : null}
        </div>

        <button className="fit-btn fit-btn--grass fit-btn--block" disabled={pending} type="submit">
          {pending ? t('fitness.form.submitting') : t('fitness.form.submit')}
        </button>
      </form>
    </section>
  )
}
