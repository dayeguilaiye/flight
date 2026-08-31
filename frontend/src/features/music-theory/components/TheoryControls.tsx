import { useI18n } from '../../../shared/i18n/I18nProvider'
import type { TranslationKey } from '../../../shared/i18n/resources'
import { INVERSIONS, TRIAD_QUALITIES, type Inversion, type TriadQuality } from '../domain/chords'
import { INTERVALS } from '../domain/intervals'
import { TONIC_OPTIONS, formatSpelledNote } from '../domain/notes'
import { SCALE_KINDS, type ScaleKind } from '../domain/scales'

const intervalKeys: Record<string, TranslationKey> = {
  unison: 'music.interval.unison',
  'minor-second': 'music.interval.minor-second',
  'major-second': 'music.interval.major-second',
  'minor-third': 'music.interval.minor-third',
  'major-third': 'music.interval.major-third',
  'perfect-fourth': 'music.interval.perfect-fourth',
  tritone: 'music.interval.tritone',
  'perfect-fifth': 'music.interval.perfect-fifth',
  'minor-sixth': 'music.interval.minor-sixth',
  'major-sixth': 'music.interval.major-sixth',
  'minor-seventh': 'music.interval.minor-seventh',
  'major-seventh': 'music.interval.major-seventh',
  octave: 'music.interval.octave',
}

export function TonicControl({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n()
  return (
    <label className="theory-field">
      <span>{t('music.control.tonic')}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {TONIC_OPTIONS.map((tonic) => <option key={tonic.id} value={tonic.id}>{formatSpelledNote(tonic)}</option>)}
      </select>
    </label>
  )
}

export function ScaleKindControl({ value, onChange }: { value: ScaleKind; onChange: (value: ScaleKind) => void }) {
  const { t } = useI18n()
  return (
    <fieldset className="theory-choice-field">
      <legend>{t('music.control.scaleKind')}</legend>
      <div className="theory-choice-row">
        {SCALE_KINDS.map((kind) => (
          <button aria-pressed={value === kind} key={kind} onClick={() => onChange(kind)} type="button">
            {t(kind === 'major' ? 'music.control.major' : 'music.control.naturalMinor')}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function IntervalControl({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n()
  return (
    <label className="theory-field theory-field-wide">
      <span>{t('music.control.interval')}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {INTERVALS.map((interval) => (
          <option key={interval.id} value={interval.id}>{t(intervalKeys[interval.id])}</option>
        ))}
      </select>
    </label>
  )
}

export function TriadQualityControl({ value, onChange }: { value: TriadQuality; onChange: (value: TriadQuality) => void }) {
  const { t } = useI18n()
  return (
    <fieldset className="theory-choice-field theory-choice-field-wide">
      <legend>{t('music.control.quality')}</legend>
      <div className="theory-choice-row">
        {TRIAD_QUALITIES.map((quality) => (
          <button aria-pressed={value === quality} key={quality} onClick={() => onChange(quality)} type="button">
            {t(`music.quality.${quality}`)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function InversionControl({ value, onChange }: { value: Inversion; onChange: (value: Inversion) => void }) {
  const { t } = useI18n()
  const inversionKeys: Record<Inversion, TranslationKey> = {
    0: 'music.inversion.root',
    1: 'music.inversion.first',
    2: 'music.inversion.second',
  }
  return (
    <fieldset className="theory-choice-field">
      <legend>{t('music.control.inversion')}</legend>
      <div className="theory-choice-row">
        {INVERSIONS.map((inversion) => (
          <button aria-pressed={value === inversion} key={inversion} onClick={() => onChange(inversion)} type="button">
            {t(inversionKeys[inversion])}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
