import {
  LETTER_NAMES,
  formatSpelledNote,
  midiForPitchClassAtOrAbove,
  normalizePitchClass,
  spellPitchClassForLetter,
  type MidiNote,
  type PitchClass,
  type SpelledNote,
} from './notes'

export type ScaleKind = 'major' | 'naturalMinor'
export const SCALE_KINDS: ReadonlyArray<ScaleKind> = ['major', 'naturalMinor']

export type ScaleNote = {
  degree: number
  spelled: SpelledNote
  midi: MidiNote
}

export type Scale = {
  kind: ScaleKind
  tonic: SpelledNote
  notes: ReadonlyArray<ScaleNote>
  name: string
}

const scaleOffsets: Record<ScaleKind, ReadonlyArray<number>> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
}

export const scaleStepPatterns: Record<ScaleKind, ReadonlyArray<'W' | 'H'>> = {
  major: ['W', 'W', 'H', 'W', 'W', 'W', 'H'],
  naturalMinor: ['W', 'H', 'W', 'W', 'H', 'W', 'W'],
}

export function buildScale(tonic: SpelledNote, kind: ScaleKind, minimumMidi = 60): Scale {
  const tonicMidi = midiForPitchClassAtOrAbove(tonic.pitchClass, minimumMidi)
  const tonicLetterIndex = LETTER_NAMES.indexOf(tonic.letter)
  const notes = scaleOffsets[kind].map((offset, index): ScaleNote => {
    const letter = LETTER_NAMES[(tonicLetterIndex + index) % LETTER_NAMES.length]
    const pitchClass = normalizePitchClass(tonic.pitchClass + offset)
    return {
      degree: index + 1,
      spelled: spellPitchClassForLetter(letter, pitchClass),
      midi: tonicMidi + offset,
    }
  })

  return {
    kind,
    tonic,
    notes,
    name: formatSpelledNote(tonic),
  }
}

export function scalePitchClasses(scale: Scale): ReadonlyArray<PitchClass> {
  return scale.notes.map((note) => note.spelled.pitchClass)
}
