import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from 'react'
import { midiToPitchClass, noteNameForMidi, type MidiNote } from '../domain/notes'
import type { ActiveNote } from '../hooks/useMusicTheoryWorkbench'

type PianoKeyboardProps = {
  activeNotes: ReadonlyArray<ActiveNote>
  baseMidi: MidiNote
  computerKeyboard?: boolean
  keyboardHints: boolean
  label: string
  onNoteEnd?: (midi: MidiNote) => void
  onNoteStart: (midi: MidiNote) => void
  rangeSemitones?: 12 | 24
}

const blackPitchClasses = new Set([1, 3, 6, 8, 10])
const computerKeys = ['A', 'W', 'S', 'E', 'D', 'F', 'T', 'G', 'Y', 'H', 'U', 'J', 'K', 'O', 'L', 'P', ';'] as const

export function PianoKeyboard({
  activeNotes,
  baseMidi,
  computerKeyboard = false,
  keyboardHints,
  label,
  onNoteEnd,
  onNoteStart,
  rangeSemitones,
}: PianoKeyboardProps) {
  const compact = useCompactPiano()
  const [heldNotes, setHeldNotes] = useState<ReadonlySet<MidiNote>>(() => new Set())
  const heldSources = useRef(new Map<string, MidiNote>())
  const holdCounts = useRef(new Map<MidiNote, number>())
  const visibleSemitones = rangeSemitones ?? (compact ? 12 : 24)
  const notes = Array.from({ length: visibleSemitones + 1 }, (_, index) => baseMidi + index)
  const whiteNotes = notes.filter((midi) => !blackPitchClasses.has(midiToPitchClass(midi)))
  const blackNotes = notes.filter((midi) => blackPitchClasses.has(midiToPitchClass(midi)))
  const activeByMidi = new Map(fitNotesToRange(activeNotes, baseMidi, baseMidi + visibleSemitones).map((note) => [note.midi, note]))

  const pressSource = useCallback((source: string, midi: MidiNote) => {
    if (heldSources.current.has(source)) return
    heldSources.current.set(source, midi)
    const previousCount = holdCounts.current.get(midi) ?? 0
    holdCounts.current.set(midi, previousCount + 1)
    if (previousCount > 0) return
    setHeldNotes((current) => new Set(current).add(midi))
    onNoteStart(midi)
  }, [onNoteStart])

  const releaseSource = useCallback((source: string) => {
    const midi = heldSources.current.get(source)
    if (midi === undefined) return
    heldSources.current.delete(source)
    const nextCount = (holdCounts.current.get(midi) ?? 1) - 1
    if (nextCount > 0) {
      holdCounts.current.set(midi, nextCount)
      return
    }
    holdCounts.current.delete(midi)
    setHeldNotes((current) => {
      const next = new Set(current)
      next.delete(midi)
      return next
    })
    onNoteEnd?.(midi)
  }, [onNoteEnd])

  const releaseAll = useCallback(() => {
    const soundingNotes = [...holdCounts.current.keys()]
    if (soundingNotes.length === 0) return
    heldSources.current.clear()
    holdCounts.current.clear()
    setHeldNotes(new Set())
    soundingNotes.forEach((midi) => onNoteEnd?.(midi))
  }, [onNoteEnd])

  useEffect(() => {
    if (!onNoteEnd) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return
      const index = computerKeys.findIndex((key) => key.toLowerCase() === event.key.toLowerCase())
      if (index < 0) return
      event.preventDefault()
      pressSource(`computer:${event.code || event.key}`, baseMidi + index)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const source = `computer:${event.code || event.key}`
      if (!heldSources.current.has(source)) return
      event.preventDefault()
      releaseSource(source)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') releaseAll()
    }
    if (computerKeyboard) {
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)
    }
    window.addEventListener('blur', releaseAll)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      if (computerKeyboard) {
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('keyup', onKeyUp)
      }
      window.removeEventListener('blur', releaseAll)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      releaseAll()
    }
  }, [baseMidi, computerKeyboard, onNoteEnd, pressSource, releaseAll, releaseSource])

  const noteHandlers = (midi: MidiNote): ButtonHTMLAttributes<HTMLButtonElement> => {
    if (!onNoteEnd) return { onClick: () => onNoteStart(midi) }
    return {
      onKeyDown: (event) => {
        if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return
        event.preventDefault()
        pressSource(`button:${midi}:${event.key}`, midi)
      },
      onKeyUp: (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        releaseSource(`button:${midi}:${event.key}`)
      },
      onPointerCancel: (event) => releaseSource(`pointer:${event.pointerId}`),
      onPointerDown: (event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        pressSource(`pointer:${event.pointerId}`, midi)
      },
      onPointerUp: (event) => releaseSource(`pointer:${event.pointerId}`),
    }
  }

  return (
    <div aria-label={label} className="piano-keyboard" role="group">
      <div className="piano-white-keys">
        {whiteNotes.map((midi) => {
          const active = activeByMidi.get(midi)
          const held = heldNotes.has(midi)
          const computerKey = computerKeys[midi - baseMidi]
          return (
            <button
              aria-label={noteNameForMidi(midi)}
              aria-pressed={Boolean(active || held)}
              className={`piano-key piano-white-key ${active ? `is-active role-${active.role}` : ''} ${held ? 'is-held' : ''}`}
              key={midi}
              type="button"
              {...noteHandlers(midi)}
            >
              {active?.marker && <span className="piano-role-marker">{active.marker}</span>}
              <span className="piano-note-name">{noteNameForMidi(midi)}</span>
              {keyboardHints && computerKey && <kbd>{computerKey}</kbd>}
            </button>
          )
        })}
      </div>
      <div className="piano-black-keys">
        {blackNotes.map((midi) => {
          const precedingWhiteCount = notes.filter((candidate) => candidate < midi && !blackPitchClasses.has(midiToPitchClass(candidate))).length
          const active = activeByMidi.get(midi)
          const held = heldNotes.has(midi)
          const computerKey = computerKeys[midi - baseMidi]
          return (
            <button
              aria-label={noteNameForMidi(midi)}
              aria-pressed={Boolean(active || held)}
              className={`piano-key piano-black-key ${active ? `is-active role-${active.role}` : ''} ${held ? 'is-held' : ''}`}
              key={midi}
              style={{ left: `${(precedingWhiteCount / whiteNotes.length) * 100}%` }}
              type="button"
              {...noteHandlers(midi)}
            >
              {active?.marker && <span className="piano-role-marker">{active.marker}</span>}
              {keyboardHints && computerKey && <kbd>{computerKey}</kbd>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function useCompactPiano(): boolean {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 700px)').matches === true)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia('(max-width: 700px)')
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return compact
}

export function fitNotesToRange(activeNotes: ReadonlyArray<ActiveNote>, minimum: MidiNote, maximum: MidiNote): ReadonlyArray<ActiveNote> {
  if (activeNotes.length === 0) return []
  const lowest = Math.min(...activeNotes.map((note) => note.midi))
  const highest = Math.max(...activeNotes.map((note) => note.midi))
  const shifts = [-48, -36, -24, -12, 0, 12, 24, 36, 48]
  const groupShift = shifts
    .filter((shift) => lowest + shift >= minimum && highest + shift <= maximum)
    .sort((left, right) => Math.abs(left) - Math.abs(right))[0]

  if (groupShift !== undefined) {
    return activeNotes.map((note) => ({ ...note, midi: note.midi + groupShift }))
  }

  return activeNotes.map((note) => {
    let midi = note.midi
    while (midi < minimum) midi += 12
    while (midi > maximum) midi -= 12
    return { ...note, midi }
  })
}
