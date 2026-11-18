import { useId, useState, type FormEvent } from 'react'
import type { DisplayError } from '../../../shared/api/errors'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import { translateDisplayError } from '../../../shared/i18n/errors'
import { PixelSprite } from '../sprites/PixelSprite'
import { heroStand } from '../sprites/sprites'

type LoginPanelProps = {
  pending: boolean
  error: DisplayError | null
  onSubmit: (password: string) => void
}

export function LoginPanel({ pending, error, onSubmit }: LoginPanelProps) {
  const { t } = useI18n()
  const id = useId()
  const [password, setPassword] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password) onSubmit(password)
  }

  return (
    <section className="fit-panel fit-login" aria-labelledby={`${id}-title`}>
      <PixelSprite className="fit-login__hero" scale={6} sprite={heroStand} />
      <h2 className="fit-panel__title" id={`${id}-title`}>
        {t('fitness.login.title')}
      </h2>
      <p className="fit-hint">{t('fitness.login.body')}</p>
      <form className="fit-form" onSubmit={submit}>
        <div className="fit-field">
          <label className="fit-label" htmlFor={`${id}-password`}>
            {t('fitness.login.password')}
          </label>
          <input
            autoComplete="current-password"
            className="fit-input"
            id={`${id}-password`}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          {error ? <p className="fit-error" role="alert">{translateDisplayError(error, t)}</p> : null}
        </div>
        <button className="fit-btn fit-btn--grass fit-btn--block" disabled={pending || !password} type="submit">
          {pending ? t('fitness.login.submitting') : t('fitness.login.submit')}
        </button>
      </form>
    </section>
  )
}
