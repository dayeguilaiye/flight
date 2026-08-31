import {
  LETTER_NAMES,
  normalizePitchClass,
  spellPitchClassForLetter,
  type MidiNote,
  type SpelledNote,
} from './notes'

export type IntervalQuality = 'perfect' | 'major' | 'minor' | 'augmented' | 'diminished'

export type IntervalDefinition = {
  id: string
  semitones: number
  number: number
  quality: IntervalQuality
}

export const INTERVALS: ReadonlyArray<IntervalDefinition> = [
  { id: 'unison', semitones: 0, number: 1, quality: 'perfect' },
  { id: 'minor-second', semitones: 1, number: 2, quality: 'minor' },
  { id: 'major-second', semitones: 2, number: 2, quality: 'major' },
  { id: 'minor-third', semitones: 3, number: 3, quality: 'minor' },
  { id: 'major-third', semitones: 4, number: 3, quality: 'major' },
  { id: 'perfect-fourth', semitones: 5, number: 4, quality: 'perfect' },
  { id: 'tritone', semitones: 6, number: 4, quality: 'augmented' },
  { id: 'perfect-fifth', semitones: 7, number: 5, quality: 'perfect' },
  { id: 'minor-sixth', semitones: 8, number: 6, quality: 'minor' },
  { id: 'major-sixth', semitones: 9, number: 6, quality: 'major' },
  { id: 'minor-seventh', semitones: 10, number: 7, quality: 'minor' },
  { id: 'major-seventh', semitones: 11, number: 7, quality: 'major' },
  { id: 'octave', semitones: 12, number: 8, quality: 'perfect' },
]

export type BuiltInterval = IntervalDefinition & {
  root: SpelledNote
  target: SpelledNote
  rootMidi: MidiNote
  targetMidi: MidiNote
}

export function buildInterval(root: SpelledNote, rootMidi: MidiNote, definition: IntervalDefinition): BuiltInterval {
  const rootLetterIndex = LETTER_NAMES.indexOf(root.letter)
  const targetLetter = LETTER_NAMES[(rootLetterIndex + definition.number - 1) % LETTER_NAMES.length]
  const targetPitchClass = normalizePitchClass(root.pitchClass + definition.semitones)
  return {
    ...definition,
    root,
    target: spellPitchClassForLetter(targetLetter, targetPitchClass),
    rootMidi,
    targetMidi: rootMidi + definition.semitones,
  }
}

export function intervalById(id: string): IntervalDefinition {
  return INTERVALS.find((interval) => interval.id === id) ?? INTERVALS[4]
}
