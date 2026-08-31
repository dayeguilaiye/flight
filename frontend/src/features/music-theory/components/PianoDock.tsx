import { useState } from 'react'
import { useI18n } from '../../../shared/i18n/I18nProvider'
import type { AudioStatus } from '../audio/AudioEngine'
import { noteNameForMidi, type MidiNote } from '../domain/notes'
import type { ActiveNote } from '../hooks/useMusicTheoryWorkbench'
import { PianoIcon } from './Icons'
import { PianoKeyboard } from './PianoKeyboard'

type PianoDockProps = {
  activeNotes: ReadonlyArray<ActiveNote>
  audioStatus: AudioStatus
  baseMidi: MidiNote
  lastPlayedMidi?: MidiNote
  onNoteEnd: (midi: MidiNote) => void
  onNoteStart: (midi: MidiNote) => void
  onShift: (semitones: -12 | 12) => void
}

export function PianoDock({ activeNotes, audioStatus, baseMidi, lastPlayedMidi, onNoteEnd, onNoteStart, onShift }: PianoDockProps) {
  const { t } = useI18n()
  const [collapsed, setCollapsed] = useState(false)
  const [keyboardHints, setKeyboardHints] = useState(false)

  return (
    <section className={`piano-dock ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="piano-dock-toolbar">
        <button aria-label={t(collapsed ? 'music.piano.expand' : 'music.piano.collapse')} className="piano-collapse-button" onClick={() => setCollapsed((value) => !value)} type="button">
          <PianoIcon />
          <span>{t(collapsed ? 'music.piano.expand' : 'music.piano.collapse')}</span>
        </button>
        <p aria-live="polite" className={`audio-status status-${audioStatus}`}>
          <span className="audio-status-dot" />
          {t(`music.audio.${audioStatus}`)}
        </p>
        {lastPlayedMidi !== undefined && <p className="last-played">{t('music.piano.lastPlayed', { note: noteNameForMidi(lastPlayedMidi) })}</p>}
        <label className="keyboard-hint-toggle">
          <input checked={keyboardHints} onChange={(event) => setKeyboardHints(event.target.checked)} type="checkbox" />
          <span>{t('music.piano.keyboardHints')}</span>
        </label>
      </div>
      <div className="piano-body">
        <button aria-label={t('music.piano.octaveDown')} className="piano-shift-button" disabled={baseMidi <= 36} onClick={() => onShift(-12)} type="button">−8</button>
        <PianoKeyboard
          activeNotes={activeNotes}
          baseMidi={baseMidi}
          computerKeyboard
          keyboardHints={keyboardHints}
          label={t('music.piano.label')}
          onNoteEnd={onNoteEnd}
          onNoteStart={onNoteStart}
        />
        <button aria-label={t('music.piano.octaveUp')} className="piano-shift-button" disabled={baseMidi >= 60} onClick={() => onShift(12)} type="button">+8</button>
      </div>
    </section>
  )
}
