import { Link } from 'react-router-dom'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import type { LessonLocation } from '../course/types'
import { adjacentLesson, lessonPath } from '../course/catalog'
import { triadIntervals } from '../domain/chords'
import { PROGRESSIONS } from '../domain/harmony'
import { formatSpelledNote, type MidiNote } from '../domain/notes'
import { scaleStepPatterns } from '../domain/scales'
import type { MusicTheoryWorkbench } from '../hooks/useMusicTheoryWorkbench'
import { ChevronIcon } from './Icons'
import { NoteStructure } from './NoteStructure'
import { PianoKeyboard } from './PianoKeyboard'
import { IntervalControl, InversionControl, ScaleKindControl, TonicControl, TriadQualityControl } from './TheoryControls'

type LessonArticleProps = {
  location: LessonLocation
  workbench: MusicTheoryWorkbench
  onAudition: (notes: ReadonlyArray<MidiNote>) => void
}

export function LessonArticle({ location, workbench, onAudition }: LessonArticleProps) {
  const { t } = useI18n()
  const previous = adjacentLesson(location, -1)
  const next = adjacentLesson(location, 1)

  return (
    <article className="lesson-article">
      <p className="lesson-breadcrumb">{t(location.chapter.titleKey)} / {location.lessonIndex + 1}</p>
      <h1>{t(location.lesson.titleKey)}</h1>
      <p className="lesson-summary">{t(location.lesson.summaryKey)}</p>

      <LessonExperiment lesson={location.lesson} onAudition={onAudition} workbench={workbench} />

      <nav aria-label={t('music.currentLesson')} className="lesson-pagination">
        {previous ? (
          <Link className="lesson-page-link is-previous" to={lessonPath(previous)}>
            <ChevronIcon className="h-4 w-4 rotate-180" />
            <span><small>{t('music.previous')}</small>{t(previous.lesson.titleKey)}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link className="lesson-page-link is-next" to={lessonPath(next)}>
            <span><small>{t('music.next')}</small>{t(next.lesson.titleKey)}</span>
            <ChevronIcon />
          </Link>
        ) : <Link className="lesson-page-link is-next" to="/music-theory/lab"><span><small>{t('music.next')}</small>{t('music.freeLab')}</span><ChevronIcon /></Link>}
      </nav>
    </article>
  )
}

type ExperimentProps = {
  lesson: LessonLocation['lesson']
  workbench: MusicTheoryWorkbench
  onAudition: (notes: ReadonlyArray<MidiNote>) => void
}

function LessonExperiment({ lesson, workbench, onAudition }: ExperimentProps) {
  const { t } = useI18n()
  const { state, dispatch } = workbench
  const activeMidis = workbench.activeNotes.map((note) => note.midi)

  switch (lesson.kind) {
    case 'keyboard':
      return (
        <section className="lesson-experiment">
          <div className="keyboard-concept">
            <span>{workbench.activeNotes[0]?.label ?? 'C3'}</span>
            <div aria-hidden="true" className="keyboard-concept-line" />
            <strong>{lesson.id === 'keyboard.octaves' ? '12' : lesson.id === 'keyboard.steps-accidentals' ? '1' : 'C'}</strong>
            <div aria-hidden="true" className="keyboard-concept-line" />
            <span>{workbench.activeNotes[1]?.label ?? 'C4'}</span>
          </div>
          <NoteStructure notes={workbench.activeNotes} />
          <button className="inline-audition" onClick={() => onAudition(activeMidis)} type="button">{t('music.action.play')}</button>
        </section>
      )
    case 'interval':
      return (
        <section className="lesson-experiment">
          <div className="theory-controls-grid">
            <TonicControl onChange={(tonicId) => dispatch({ type: 'tonicChanged', tonicId })} value={state.tonicId} />
            <IntervalControl onChange={(intervalId) => dispatch({ type: 'intervalChanged', intervalId })} value={state.intervalId} />
          </div>
          <div className="interval-ruler">
            <strong>{formatSpelledNote(workbench.interval.root)}</strong>
            <span><i style={{ width: `${Math.max(4, workbench.interval.semitones) * 7}%` }} />{t('music.structure.halfSteps', { count: workbench.interval.semitones })}</span>
            <strong>{formatSpelledNote(workbench.interval.target)}</strong>
          </div>
          <NoteStructure notes={workbench.activeNotes} />
        </section>
      )
    case 'scale':
      return (
        <section className="lesson-experiment">
          <div className="theory-controls-grid">
            <TonicControl onChange={(tonicId) => dispatch({ type: 'tonicChanged', tonicId })} value={state.tonicId} />
            <ScaleKindControl onChange={(scaleKind) => dispatch({ type: 'scaleKindChanged', scaleKind })} value={state.scaleKind} />
          </div>
          <div className="scale-formula" aria-label={t('music.structure.formula')}>
            {scaleStepPatterns[state.scaleKind].map((step, index) => (
              <span key={`${step}-${index}`}><b>{step}</b><small>{t(`music.scale.step.${step}`)}</small></span>
            ))}
          </div>
          <div className="scale-degree-row">
            {workbench.scale.notes.map((note) => (
              <button key={note.degree} onClick={() => onAudition([note.midi])} type="button">
                <span>{note.degree}</span><strong>{formatSpelledNote(note.spelled)}</strong>
              </button>
            ))}
          </div>
          <NoteStructure notes={workbench.activeNotes} />
        </section>
      )
    case 'triad':
      return (
        <section className="lesson-experiment">
          <div className="theory-controls-grid">
            <TonicControl onChange={(tonicId) => dispatch({ type: 'tonicChanged', tonicId })} value={state.tonicId} />
            <TriadQualityControl onChange={(quality) => dispatch({ type: 'triadQualityChanged', quality })} value={state.triadQuality} />
            <InversionControl onChange={(inversion) => dispatch({ type: 'inversionChanged', inversion })} value={state.inversion} />
          </div>
          <div className="triad-formula" aria-label={t('music.structure.formula')}>
            {triadIntervals[state.triadQuality].map((semitones, index) => (
              <span key={semitones}><b>{index === 0 ? 'R' : index === 1 ? '3' : '5'}</b><small>+{semitones}</small></span>
            ))}
          </div>
          <NoteStructure notes={workbench.activeNotes} />
        </section>
      )
    case 'harmony':
      return (
        <section className="lesson-experiment">
          <div className="theory-controls-grid harmony-controls">
            <TonicControl onChange={(tonicId) => dispatch({ type: 'tonicChanged', tonicId })} value={state.tonicId} />
            <ScaleKindControl onChange={(scaleKind) => dispatch({ type: 'scaleKindChanged', scaleKind })} value={state.scaleKind} />
          </div>
          <div className="harmony-deep-dive">
            <div aria-label={t('music.harmony.chordList')} className="harmony-chord-list" role="group">
              {workbench.diatonicChords.map((chord) => (
                <button
                  aria-label={`${chord.roman}${formatSpelledNote(chord.triad.root)}`}
                  aria-pressed={state.selectedDegree === chord.degree}
                  key={chord.degree}
                  onClick={() => {
                    dispatch({ type: 'degreeChanged', degree: chord.degree })
                    onAudition(chord.triad.notes.map((note) => note.midi))
                  }}
                  type="button"
                >
                  <span className="harmony-chord-degree" aria-hidden="true">{chord.degree}</span>
                  <strong>{chord.roman}</strong>
                  <span className="harmony-chord-root">{formatSpelledNote(chord.triad.root)}</span>
                  <small>{t(`music.quality.${chord.quality}`)}</small>
                  <ChevronIcon />
                </button>
              ))}
            </div>

            <section className="harmony-focus-card">
              <h2>{t('music.harmony.focusTitle', {
                roman: workbench.selectedChord.roman,
                root: formatSpelledNote(workbench.selectedChord.triad.root),
              })}</h2>
              <p>{t('music.harmony.focusBody', {
                notes: workbench.selectedChord.triad.notes.map((note) => formatSpelledNote(note.spelled)).join('、'),
              })}</p>

              <div className="chord-staff" aria-label={t('music.harmony.staffLabel')}>
                <div aria-hidden="true" className="chord-staff-lines">
                  {Array.from({ length: 5 }, (_, index) => <span key={index} />)}
                </div>
                <div className="chord-staff-notes">
                  {[...workbench.activeNotes].reverse().map((note) => (
                    <button key={`${note.midi}-${note.role}`} onClick={() => onAudition([note.midi])} type="button">
                      <i aria-hidden="true" />
                      <strong>{note.label}</strong>
                      <span>{t(`music.role.${note.role}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="harmony-focus-piano">
                <PianoKeyboard
                  activeNotes={workbench.activeNotes}
                  baseMidi={60}
                  keyboardHints={false}
                  label={t('music.harmony.focusPiano')}
                  onNoteStart={(midi) => onAudition([midi])}
                  rangeSemitones={12}
                />
              </div>

              <NoteStructure notes={workbench.activeNotes} />
            </section>
          </div>
        </section>
      )
    case 'progression':
      return (
        <section className="lesson-experiment">
          <div className="theory-controls-grid">
            <TonicControl onChange={(tonicId) => dispatch({ type: 'tonicChanged', tonicId })} value={state.tonicId} />
            <label className="theory-field theory-field-wide">
              <span>{t('music.control.progression')}</span>
              <select onChange={(event) => dispatch({ type: 'progressionChanged', progressionId: event.target.value })} value={state.progressionId}>
                {PROGRESSIONS.map((progression) => <option key={progression.id} value={progression.id}>{t(`music.progression.${progression.id}`)}</option>)}
              </select>
            </label>
            <fieldset className="theory-choice-field theory-choice-field-wide">
              <legend>{t('music.control.voicing')}</legend>
              <div className="theory-choice-row">
                <button aria-pressed={!state.closeVoicing} onClick={() => dispatch({ type: 'closeVoicingChanged', enabled: false })} type="button">{t('music.control.rootPositionVoicing')}</button>
                <button aria-pressed={state.closeVoicing} onClick={() => dispatch({ type: 'closeVoicingChanged', enabled: true })} type="button">{t('music.control.closeVoicing')}</button>
              </div>
            </fieldset>
          </div>
          <div className="progression-route">
            {workbench.progressionChords.map((chord, index) => (
              <button
                aria-pressed={workbench.selectedProgressionIndex === index}
                key={`${chord.degree}-${index}`}
                onClick={() => {
                  dispatch({ type: 'progressionChordChanged', index })
                  onAudition(workbench.progressionVoicings[index])
                }}
                type="button"
              >
                <strong>{chord.roman}</strong><span>{formatSpelledNote(chord.triad.root)}</span>
                {index < workbench.progressionChords.length - 1 && <ChevronIcon />}
              </button>
            ))}
          </div>
          <NoteStructure notes={workbench.activeNotes} />
        </section>
      )
  }
}
