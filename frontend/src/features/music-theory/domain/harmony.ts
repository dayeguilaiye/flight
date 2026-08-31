import { inferTriadQuality, type Triad, type TriadNote, type TriadQuality } from './chords'
import type { Scale, ScaleKind, ScaleNote } from './scales'

export type HarmonicFunction = 'tonic' | 'predominant' | 'dominant'

export type DiatonicChord = {
  degree: number
  roman: string
  quality: TriadQuality
  function: HarmonicFunction
  triad: Triad
}

const romanNumbers = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const
const functionByDegree: ReadonlyArray<HarmonicFunction> = [
  'tonic',
  'predominant',
  'tonic',
  'predominant',
  'dominant',
  'tonic',
  'dominant',
]

function scaleNoteAt(scale: Scale, index: number): ScaleNote {
  const note = scale.notes[index % scale.notes.length]
  return { ...note, midi: note.midi + Math.floor(index / scale.notes.length) * 12 }
}

function romanFor(degree: number, quality: TriadQuality): string {
  const base = romanNumbers[degree - 1]
  if (quality === 'major' || quality === 'augmented') return quality === 'augmented' ? `${base}+` : base
  const lower = base.toLowerCase()
  return quality === 'diminished' ? `${lower}°` : lower
}

export function buildDiatonicTriads(scale: Scale): ReadonlyArray<DiatonicChord> {
  return scale.notes.map((root, index): DiatonicChord => {
    const sourceNotes = [scaleNoteAt(scale, index), scaleNoteAt(scale, index + 2), scaleNoteAt(scale, index + 4)]
    const quality = inferTriadQuality(
      sourceNotes[0].spelled.pitchClass,
      sourceNotes[1].spelled.pitchClass,
      sourceNotes[2].spelled.pitchClass,
    )
    const roles = ['root', 'third', 'fifth'] as const
    const notes: ReadonlyArray<TriadNote> = sourceNotes.map((note, toneIndex) => ({
      spelled: note.spelled,
      midi: note.midi,
      role: roles[toneIndex],
    }))
    return {
      degree: index + 1,
      roman: romanFor(index + 1, quality),
      quality,
      function: functionByDegree[index],
      triad: { root: root.spelled, quality, inversion: 0, notes },
    }
  })
}

export type ProgressionDefinition = {
  id: 'pop' | 'two-five-one' | 'classic' | 'authentic' | 'plagal' | 'deceptive'
  degrees: ReadonlyArray<number>
  preferredScale: ScaleKind
}

export const PROGRESSIONS: ReadonlyArray<ProgressionDefinition> = [
  { id: 'pop', degrees: [1, 5, 6, 4], preferredScale: 'major' },
  { id: 'two-five-one', degrees: [2, 5, 1], preferredScale: 'major' },
  { id: 'classic', degrees: [1, 6, 4, 5], preferredScale: 'major' },
  { id: 'authentic', degrees: [5, 1], preferredScale: 'major' },
  { id: 'plagal', degrees: [4, 1], preferredScale: 'major' },
  { id: 'deceptive', degrees: [5, 6], preferredScale: 'major' },
]

export function progressionById(id: string): ProgressionDefinition {
  return PROGRESSIONS.find((progression) => progression.id === id) ?? PROGRESSIONS[0]
}

export function resolveProgression(scale: Scale, definition: ProgressionDefinition): ReadonlyArray<DiatonicChord> {
  const chords = buildDiatonicTriads(scale)
  return definition.degrees.map((degree) => chords[degree - 1])
}

function inversionCandidate(notes: ReadonlyArray<MidiNote>, inversion: 0 | 1 | 2, shift: number): ReadonlyArray<MidiNote> {
  return notes.map((_, index) => {
    const sourceIndex = (index + inversion) % notes.length
    const octave = index + inversion >= notes.length ? 12 : 0
    return notes[sourceIndex] + octave + shift
  })
}

import type { MidiNote } from './notes'

export function closePositionVoicings(chords: ReadonlyArray<DiatonicChord>): ReadonlyArray<ReadonlyArray<MidiNote>> {
  if (chords.length === 0) return []
  const first = chords[0].triad.notes.map((note) => note.midi)
  return chords.slice(1).reduce<Array<ReadonlyArray<MidiNote>>>((voicings, chord) => {
    const previous = voicings[voicings.length - 1]
    const rootPosition = chord.triad.notes.map((note) => note.midi)
    const candidates = ([0, 1, 2] as const)
      .flatMap((inversion) => [-12, 0, 12].map((shift) => inversionCandidate(rootPosition, inversion, shift)))
      .filter((candidate) => Math.min(...candidate) >= 48 && Math.max(...candidate) <= 84)
    const best = candidates.reduce((currentBest, candidate) => {
      const score = candidate.reduce((total, midi, index) => total + Math.abs(midi - previous[index]), 0)
      const bestScore = currentBest.reduce((total, midi, index) => total + Math.abs(midi - previous[index]), 0)
      return score < bestScore ? candidate : currentBest
    }, candidates[0])
    return [...voicings, best]
  }, [first])
}
