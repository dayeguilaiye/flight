import '@fontsource/noto-serif-sc/chinese-simplified-400.css'
import '@fontsource/noto-serif-sc/chinese-simplified-600.css'
import '@fontsource/noto-serif-sc/latin-400.css'
import '@fontsource/noto-serif-sc/latin-600.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import { LanguageSwitcher } from '../../../shared/ui/LanguageSwitcher'
import { CourseNavigator } from '../components/CourseNavigator'
import { FreeLab } from '../components/FreeLab'
import { HomeIcon, MenuIcon } from '../components/Icons'
import { LessonArticle } from '../components/LessonArticle'
import { LessonInspector, type PlaybackCommand } from '../components/LessonInspector'
import { MobileCourseDialog } from '../components/MobileCourseDialog'
import { PianoDock } from '../components/PianoDock'
import { findLesson, firstLessonLocation, lessonPath } from '../course/catalog'
import { formatSpelledNote, type MidiNote } from '../domain/notes'
import {
  arpeggioPlan,
  harmonicPlan,
  melodicPlan,
  progressionPlan,
  singleNotePlan,
  type PlaybackPlan,
} from '../domain/playback'
import { useAudioEngine } from '../hooks/useAudioEngine'
import { useMusicTheoryWorkbench } from '../hooks/useMusicTheoryWorkbench'
import './musicTheory.css'

export function MusicTheoryPage() {
  const { chapterSlug, lessonSlug } = useParams()
  const route = useLocation()
  const { locale, t } = useI18n()
  const isLab = route.pathname === '/music-theory/lab'
  const requestedLesson = chapterSlug !== undefined || lessonSlug !== undefined
  const location = useMemo(
    () => isLab ? undefined : requestedLesson ? findLesson(chapterSlug, lessonSlug) : firstLessonLocation(),
    [chapterSlug, isLab, lessonSlug, requestedLesson],
  )
  const invalidRoute = !isLab && requestedLesson && location === undefined
  const workbench = useMusicTheoryWorkbench(location?.lesson, isLab)
  const audio = useAudioEngine()
  const [lastPlayedMidi, setLastPlayedMidi] = useState<MidiNote | undefined>(undefined)
  const [courseOpen, setCourseOpen] = useState(false)

  useEffect(() => {
    const currentTitle = invalidRoute
      ? t('music.invalid.title')
      : isLab
        ? t('music.lab.title')
        : location
          ? t(location.lesson.titleKey)
          : t('music.title')
    document.title = `${currentTitle} · ${t('music.title')} · Flight`
  }, [invalidRoute, isLab, locale, location, t])

  useEffect(() => {
    audio.stop()
    setLastPlayedMidi(undefined)
    setCourseOpen(false)
  }, [audio.stop, route.pathname])

  const playPlan = useCallback(async (plan: PlaybackPlan) => {
    if (plan.length === 0) return
    setLastPlayedMidi(plan[0].midi)
    await audio.play(plan)
  }, [audio.play])

  const auditionNotes = useCallback((notes: ReadonlyArray<MidiNote>) => {
    void playPlan(notes.length === 1 ? singleNotePlan(notes[0]) : harmonicPlan(notes))
  }, [playPlan])

  const playCommand = useCallback((command: PlaybackCommand) => {
    const activeMidis = workbench.activeNotes.map((note) => note.midi)
    let plan: PlaybackPlan

    switch (command) {
      case 'primary':
        plan = location?.lesson.kind === 'scale' || (isLab && workbench.state.labMode === 'scale')
          ? melodicPlan(activeMidis)
          : activeMidis.length === 1
            ? singleNotePlan(activeMidis[0])
            : harmonicPlan(activeMidis)
        break
      case 'together':
        plan = harmonicPlan(activeMidis)
        break
      case 'melodic':
        plan = melodicPlan(activeMidis)
        break
      case 'arpeggioUp':
        plan = location?.lesson.kind === 'progression'
          ? progressionPlan(workbench.progressionVoicings, 'arpeggioAscending')
          : arpeggioPlan(activeMidis, 'ascending')
        break
      case 'arpeggioDown':
        plan = location?.lesson.kind === 'progression'
          ? progressionPlan(workbench.progressionVoicings, 'arpeggioDescending')
          : arpeggioPlan(activeMidis, 'descending')
        break
      case 'progression':
        plan = progressionPlan(workbench.progressionVoicings, 'block')
        break
    }

    void playPlan(plan)
  }, [isLab, location?.lesson.kind, playPlan, workbench.activeNotes, workbench.progressionVoicings, workbench.state.labMode])

  const startLiveNote = useCallback((midi: MidiNote) => {
    setLastPlayedMidi(midi)
    void audio.noteOn(midi)
  }, [audio.noteOn])

  const endLiveNote = useCallback((midi: MidiNote) => {
    audio.noteOff(midi)
  }, [audio.noteOff])

  const currentLessonId = location?.lesson.id

  return (
    <main className="music-theory-page" lang={locale}>
      <a className="music-skip-link" href="#music-lesson-content">{t('music.currentLesson')}</a>

      <aside className="music-course-rail">
        <CourseNavigator currentLessonId={currentLessonId} isLab={isLab} />
      </aside>

      <header className="music-mobile-header">
        <Link aria-label={t('common.home')} className="music-mobile-home" to="/">
          <HomeIcon />
          <span>{t('music.title')}</span>
        </Link>
        <div className="music-mobile-actions">
          <LanguageSwitcher />
          <button aria-expanded={courseOpen} aria-label={t('music.openCourseNav')} className="music-course-open" onClick={() => setCourseOpen(true)} type="button">
            <MenuIcon />
            <span>{t('music.courseNav')}</span>
          </button>
        </div>
      </header>

      <section className="music-lesson-region" id="music-lesson-content" tabIndex={-1}>
        {invalidRoute ? (
          <InvalidLesson onOpenCourse={() => setCourseOpen(true)} />
        ) : isLab ? (
          <FreeLab workbench={workbench} />
        ) : location ? (
          <LessonArticle location={location} onAudition={auditionNotes} workbench={workbench} />
        ) : null}
      </section>

      {!invalidRoute && (
        <LessonInspector
          audioStatus={audio.status}
          isLab={isLab}
          lesson={location?.lesson}
          onPlay={playCommand}
          onStop={audio.stop}
          tonicLabel={formatSpelledNote(workbench.tonic)}
        />
      )}

      <PianoDock
        activeNotes={workbench.activeNotes}
        audioStatus={audio.status}
        baseMidi={workbench.state.pianoBaseMidi}
        lastPlayedMidi={lastPlayedMidi}
        onNoteEnd={endLiveNote}
        onNoteStart={startLiveNote}
        onShift={(semitones) => workbench.dispatch({ type: 'pianoShifted', semitones })}
      />

      {courseOpen && (
        <MobileCourseDialog
          currentLessonId={currentLessonId}
          isLab={isLab}
          onClose={() => setCourseOpen(false)}
        />
      )}
    </main>
  )
}

function InvalidLesson({ onOpenCourse }: { onOpenCourse: () => void }) {
  const { t } = useI18n()
  const first = firstLessonLocation()

  return (
    <article className="lesson-article invalid-lesson">
      <h1>{t('music.invalid.title')}</h1>
      <p className="lesson-summary">{t('music.invalid.body')}</p>
      <div className="invalid-lesson-actions">
        <Link className="inline-audition" to={lessonPath(first)}>{t('music.invalid.first')}</Link>
        <button className="invalid-course-button" onClick={onOpenCourse} type="button">{t('music.openCourseNav')}</button>
      </div>
    </article>
  )
}
