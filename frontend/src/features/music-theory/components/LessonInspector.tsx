import { useI18n } from '../../../shared/i18n/I18nProvider'
import type { AudioStatus } from '../audio/AudioEngine'
import type { CourseLesson } from '../course/types'
import { PlayIcon, StopIcon } from './Icons'

export type PlaybackCommand = 'primary' | 'together' | 'melodic' | 'arpeggioUp' | 'arpeggioDown' | 'progression'

type LessonInspectorProps = {
  audioStatus: AudioStatus
  isLab: boolean
  lesson?: CourseLesson
  onPlay: (command: PlaybackCommand) => void
  onStop: () => void
  tonicLabel: string
}

export function LessonInspector({ audioStatus, isLab, lesson, onPlay, onStop, tonicLabel }: LessonInspectorProps) {
  const { t } = useI18n()
  const kind = isLab ? 'lab' : lesson?.kind

  return (
    <aside className="lesson-inspector">
      <section className="inspector-context">
        <h2>{t('music.context.title', { tonic: tonicLabel })}</h2>
        <p>{t('music.context.body', { tonic: tonicLabel })}</p>
      </section>

      {lesson && (
        <section className="inspector-observation">
          <h2>{t('music.observation')}</h2>
          <p>{t(lesson.observationKey)}</p>
        </section>
      )}

      <section className="inspector-playback">
        <h2>{t('music.control.playbackMode')}</h2>
        <div className="inspector-button-list">
          {(kind === 'keyboard' || kind === 'scale' || kind === 'lab') && (
            <PlaybackButton label={t('music.action.play')} onClick={() => onPlay('primary')} />
          )}
          {kind === 'interval' && (
            <>
              <PlaybackButton label={t('music.action.playTogether')} onClick={() => onPlay('together')} />
              <PlaybackButton label={t('music.action.playMelodic')} onClick={() => onPlay('melodic')} />
            </>
          )}
          {(kind === 'triad' || kind === 'harmony' || kind === 'lab') && (
            <>
              <PlaybackButton label={t('music.action.playTogether')} onClick={() => onPlay('together')} />
              <PlaybackButton label={t('music.action.arpeggioUp')} onClick={() => onPlay('arpeggioUp')} />
              <PlaybackButton label={t('music.action.arpeggioDown')} onClick={() => onPlay('arpeggioDown')} />
            </>
          )}
          {kind === 'progression' && (
            <>
              <PlaybackButton label={t('music.action.playProgression')} onClick={() => onPlay('progression')} />
              <PlaybackButton label={t('music.action.arpeggioUp')} onClick={() => onPlay('arpeggioUp')} />
              <PlaybackButton label={t('music.action.arpeggioDown')} onClick={() => onPlay('arpeggioDown')} />
            </>
          )}
          <button className="playback-stop-button" disabled={audioStatus === 'idle' || audioStatus === 'unavailable'} onClick={onStop} type="button">
            <StopIcon />
            {t('music.action.stop')}
          </button>
        </div>
        <p aria-live="polite" className={`inspector-audio-note status-${audioStatus}`}>{t(`music.audio.${audioStatus}`)}</p>
      </section>
    </aside>
  )
}

function PlaybackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="playback-mode-button" onClick={onClick} type="button">
      <PlayIcon />
      {label}
    </button>
  )
}
