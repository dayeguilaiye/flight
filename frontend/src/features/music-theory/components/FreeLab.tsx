import { useI18n } from '../../../shared/i18n/I18nProvider'
import { pitchClassName } from '../domain/notes'
import type { MusicTheoryWorkbench } from '../hooks/useMusicTheoryWorkbench'
import { NoteStructure } from './NoteStructure'
import { InversionControl, ScaleKindControl, TonicControl, TriadQualityControl } from './TheoryControls'

export function FreeLab({ workbench }: { workbench: MusicTheoryWorkbench }) {
  const { t } = useI18n()
  const { state, dispatch } = workbench

  return (
    <article className="lesson-article free-lab">
      <h1>{t('music.lab.title')}</h1>
      <p className="lesson-summary">{t('music.lab.summary')}</p>

      <section className="lesson-experiment">
        <fieldset className="theory-choice-field theory-choice-field-wide lab-mode-field">
          <legend>{t('music.lab.mode')}</legend>
          <div className="theory-choice-row">
            {(['notes', 'scale', 'triad'] as const).map((mode) => (
              <button aria-pressed={state.labMode === mode} key={mode} onClick={() => dispatch({ type: 'labModeChanged', mode })} type="button">
                {t(`music.lab.mode.${mode}`)}
              </button>
            ))}
          </div>
        </fieldset>

        {state.labMode === 'notes' && (
          <section className="free-note-picker">
            <div className="free-note-heading">
              <h2>{t('music.lab.chooseNotes')}</h2>
              <button disabled={state.freePitchClasses.length === 0} onClick={() => dispatch({ type: 'freePitchesCleared' })} type="button">{t('music.action.clear')}</button>
            </div>
            <div className="pitch-class-grid">
              {workbench.pitchClasses.map((pitchClass) => (
                <button
                  aria-pressed={state.freePitchClasses.includes(pitchClass)}
                  key={pitchClass}
                  onClick={() => dispatch({ type: 'freePitchToggled', pitchClass })}
                  type="button"
                >
                  {pitchClassName(pitchClass)}
                </button>
              ))}
            </div>
            <p>{t('music.lab.selectionCount', { count: state.freePitchClasses.length })}</p>
          </section>
        )}

        {state.labMode === 'scale' && (
          <div className="theory-controls-grid">
            <TonicControl onChange={(tonicId) => dispatch({ type: 'tonicChanged', tonicId })} value={state.tonicId} />
            <ScaleKindControl onChange={(scaleKind) => dispatch({ type: 'scaleKindChanged', scaleKind })} value={state.scaleKind} />
          </div>
        )}

        {state.labMode === 'triad' && (
          <div className="theory-controls-grid">
            <TonicControl onChange={(tonicId) => dispatch({ type: 'tonicChanged', tonicId })} value={state.tonicId} />
            <TriadQualityControl onChange={(quality) => dispatch({ type: 'triadQualityChanged', quality })} value={state.triadQuality} />
            <InversionControl onChange={(inversion) => dispatch({ type: 'inversionChanged', inversion })} value={state.inversion} />
          </div>
        )}

        <NoteStructure notes={workbench.activeNotes} />
      </section>
    </article>
  )
}
