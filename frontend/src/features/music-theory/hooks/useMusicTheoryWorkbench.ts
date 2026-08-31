import { useEffect, useMemo, useReducer } from 'react'
import type { CourseLesson } from '../course/types'
import { buildTriad, type Inversion, type TriadQuality } from '../domain/chords'
import { buildDiatonicTriads, closePositionVoicings, progressionById, resolveProgression } from '../domain/harmony'
import { buildInterval, intervalById } from '../domain/intervals'
import {
  PITCH_CLASSES,
  formatSpelledNote,
  midiForPitchClassAtOrAbove,
  noteNameForMidi,
  tonicById,
  type MidiNote,
  type PitchClass,
} from '../domain/notes'
import type { ChordPlaybackMode } from '../domain/playback'
import { buildScale, type ScaleKind } from '../domain/scales'

export type ActiveNote = {
  midi: MidiNote
  label: string
  marker?: string
  role: 'root' | 'third' | 'fifth' | 'tonic' | 'member'
}

export type WorkbenchState = {
  tonicId: string
  scaleKind: ScaleKind
  intervalId: string
  triadQuality: TriadQuality
  inversion: Inversion
  selectedDegree: number
  progressionId: string
  progressionChordIndex: number
  playbackMode: ChordPlaybackMode
  closeVoicing: boolean
  freePitchClasses: ReadonlyArray<PitchClass>
  labMode: 'notes' | 'scale' | 'triad'
  pianoBaseMidi: MidiNote
}

export type WorkbenchAction =
  | { type: 'lessonChanged'; lessonId?: string }
  | { type: 'tonicChanged'; tonicId: string }
  | { type: 'scaleKindChanged'; scaleKind: ScaleKind }
  | { type: 'intervalChanged'; intervalId: string }
  | { type: 'triadQualityChanged'; quality: TriadQuality }
  | { type: 'inversionChanged'; inversion: Inversion }
  | { type: 'degreeChanged'; degree: number }
  | { type: 'progressionChanged'; progressionId: string }
  | { type: 'progressionChordChanged'; index: number }
  | { type: 'playbackModeChanged'; mode: ChordPlaybackMode }
  | { type: 'closeVoicingChanged'; enabled: boolean }
  | { type: 'freePitchToggled'; pitchClass: PitchClass }
  | { type: 'freePitchesCleared' }
  | { type: 'labModeChanged'; mode: 'notes' | 'scale' | 'triad' }
  | { type: 'pianoShifted'; semitones: -12 | 12 }

export const initialWorkbenchState: WorkbenchState = {
  tonicId: 'c',
  scaleKind: 'major',
  intervalId: 'major-third',
  triadQuality: 'major',
  inversion: 0,
  selectedDegree: 1,
  progressionId: 'pop',
  progressionChordIndex: 0,
  playbackMode: 'block',
  closeVoicing: false,
  freePitchClasses: [0, 4, 7],
  labMode: 'notes',
  pianoBaseMidi: 48,
}

export function workbenchReducer(state: WorkbenchState, action: WorkbenchAction): WorkbenchState {
  switch (action.type) {
    case 'lessonChanged': {
      const minorLesson = action.lessonId === 'scales.natural-minor' || action.lessonId === 'harmony.minor-key-chords'
      const cadenceLesson = action.lessonId === 'progressions.cadences'
      return {
        ...state,
        scaleKind: minorLesson ? 'naturalMinor' : state.scaleKind,
        progressionId: cadenceLesson ? 'authentic' : state.progressionId,
        progressionChordIndex: 0,
      }
    }
    case 'tonicChanged':
      return { ...state, tonicId: action.tonicId, selectedDegree: 1, progressionChordIndex: 0 }
    case 'scaleKindChanged':
      return { ...state, scaleKind: action.scaleKind, selectedDegree: 1, progressionChordIndex: 0 }
    case 'intervalChanged':
      return { ...state, intervalId: action.intervalId }
    case 'triadQualityChanged':
      return { ...state, triadQuality: action.quality }
    case 'inversionChanged':
      return { ...state, inversion: action.inversion }
    case 'degreeChanged':
      return { ...state, selectedDegree: Math.min(7, Math.max(1, action.degree)) }
    case 'progressionChanged':
      return { ...state, progressionId: action.progressionId, progressionChordIndex: 0 }
    case 'progressionChordChanged':
      return { ...state, progressionChordIndex: Math.max(0, action.index) }
    case 'playbackModeChanged':
      return { ...state, playbackMode: action.mode }
    case 'closeVoicingChanged':
      return { ...state, closeVoicing: action.enabled }
    case 'freePitchToggled':
      return {
        ...state,
        freePitchClasses: state.freePitchClasses.includes(action.pitchClass)
          ? state.freePitchClasses.filter((pitchClass) => pitchClass !== action.pitchClass)
          : [...state.freePitchClasses, action.pitchClass].sort((left, right) => left - right),
      }
    case 'freePitchesCleared':
      return { ...state, freePitchClasses: [] }
    case 'labModeChanged':
      return { ...state, labMode: action.mode }
    case 'pianoShifted':
      return { ...state, pianoBaseMidi: Math.min(60, Math.max(36, state.pianoBaseMidi + action.semitones)) }
  }
}

function roleMarker(role: ActiveNote['role']): string | undefined {
  switch (role) {
    case 'root':
      return 'R'
    case 'third':
      return '3'
    case 'fifth':
      return '5'
    case 'tonic':
      return 'T'
    case 'member':
      return undefined
  }
}

export function useMusicTheoryWorkbench(lesson?: CourseLesson, isLab = false) {
  const [state, dispatch] = useReducer(workbenchReducer, initialWorkbenchState)

  useEffect(() => {
    dispatch({ type: 'lessonChanged', lessonId: lesson?.id })
  }, [lesson?.id])

  const derived = useMemo(() => {
    const tonic = tonicById(state.tonicId)
    const scale = buildScale(tonic, state.scaleKind)
    const interval = buildInterval(tonic, midiForPitchClassAtOrAbove(tonic.pitchClass, 60), intervalById(state.intervalId))
    const triad = buildTriad(tonic, state.triadQuality, state.inversion)
    const diatonicChords = buildDiatonicTriads(scale)
    const selectedChord = diatonicChords[state.selectedDegree - 1]
    const progression = progressionById(state.progressionId)
    const progressionChords = resolveProgression(scale, progression)
    const rootVoicings = progressionChords.map((chord) => chord.triad.notes.map((note) => note.midi))
    const progressionVoicings = state.closeVoicing ? closePositionVoicings(progressionChords) : rootVoicings
    const selectedProgressionIndex = Math.min(state.progressionChordIndex, progressionChords.length - 1)

    let activeNotes: ReadonlyArray<ActiveNote>
    if (isLab) {
      if (state.labMode === 'scale') {
        activeNotes = scale.notes.map((note, index) => ({
          midi: note.midi,
          label: formatSpelledNote(note.spelled),
          role: index === 0 ? 'tonic' : 'member',
          marker: index === 0 ? 'T' : String(note.degree),
        }))
      } else if (state.labMode === 'triad') {
        activeNotes = triad.notes.map((note) => ({
          midi: note.midi,
          label: formatSpelledNote(note.spelled),
          role: note.role,
          marker: roleMarker(note.role),
        }))
      } else {
        activeNotes = state.freePitchClasses.map((pitchClass, index) => {
          const midi = midiForPitchClassAtOrAbove(pitchClass, 60)
          return { midi, label: noteNameForMidi(midi), role: index === 0 ? 'root' : 'member', marker: index === 0 ? 'R' : undefined }
        })
      }
    } else {
      switch (lesson?.kind) {
        case 'keyboard': {
          const keyboardNotes = lesson.id === 'keyboard.octaves'
            ? [48, 60]
            : lesson.id === 'keyboard.steps-accidentals'
              ? [64, 65]
              : [60]
          activeNotes = keyboardNotes.map((midi, index) => ({
            midi,
            label: noteNameForMidi(midi),
            role: index === 0 ? 'root' : 'member',
            marker: index === 0 ? 'R' : undefined,
          }))
          break
        }
        case 'interval':
          activeNotes = [
            { midi: interval.rootMidi, label: formatSpelledNote(interval.root), role: 'root', marker: 'R' },
            { midi: interval.targetMidi, label: formatSpelledNote(interval.target), role: 'member' },
          ]
          break
        case 'scale':
          activeNotes = scale.notes.map((note, index) => ({
            midi: note.midi,
            label: formatSpelledNote(note.spelled),
            role: index === 0 ? 'tonic' : 'member',
            marker: index === 0 ? 'T' : String(note.degree),
          }))
          break
        case 'triad':
          activeNotes = triad.notes.map((note) => ({
            midi: note.midi,
            label: formatSpelledNote(note.spelled),
            role: note.role,
            marker: roleMarker(note.role),
          }))
          break
        case 'harmony':
          activeNotes = selectedChord.triad.notes.map((note) => ({
            midi: note.midi,
            label: formatSpelledNote(note.spelled),
            role: note.role,
            marker: roleMarker(note.role),
          }))
          break
        case 'progression': {
          const chord = progressionChords[selectedProgressionIndex]
          const voicing = progressionVoicings[selectedProgressionIndex]
          activeNotes = chord.triad.notes.map((note, index) => ({
            midi: voicing[index],
            label: formatSpelledNote(note.spelled),
            role: note.role,
            marker: roleMarker(note.role),
          }))
          break
        }
        default:
          activeNotes = []
      }
    }

    return {
      tonic,
      scale,
      interval,
      triad,
      diatonicChords,
      selectedChord,
      progression,
      progressionChords,
      progressionVoicings,
      selectedProgressionIndex,
      activeNotes,
    }
  }, [isLab, lesson, state])

  return {
    state,
    dispatch,
    ...derived,
    pitchClasses: PITCH_CLASSES,
  }
}

export type MusicTheoryWorkbench = ReturnType<typeof useMusicTheoryWorkbench>
