export const LETTER_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
export type LetterName = (typeof LETTER_NAMES)[number]

export const ACCIDENTALS = ['bb', 'b', '', '#', '##'] as const
export type Accidental = (typeof ACCIDENTALS)[number]

export const PITCH_CLASSES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const
export type PitchClass = (typeof PITCH_CLASSES)[number]
export type MidiNote = number

export type SpelledNote = {
  letter: LetterName
  accidental: Accidental
  pitchClass: PitchClass
}

export type TonicOption = SpelledNote & {
  id: string
}

const naturalPitchClasses: Record<LetterName, PitchClass> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

const accidentalOffsets: Record<Accidental, number> = {
  bb: -2,
  b: -1,
  '': 0,
  '#': 1,
  '##': 2,
}

const sharpPitchClassNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const

export function normalizePitchClass(value: number): PitchClass {
  const normalized = ((value % 12) + 12) % 12
  return PITCH_CLASSES[normalized]
}

export function createSpelledNote(letter: LetterName, accidental: Accidental = ''): SpelledNote {
  return {
    letter,
    accidental,
    pitchClass: normalizePitchClass(naturalPitchClasses[letter] + accidentalOffsets[accidental]),
  }
}

export function formatSpelledNote(note: SpelledNote): string {
  return `${note.letter}${note.accidental.replace('bb', '♭♭').replace('b', '♭').replace('##', '♯♯').replace('#', '♯')}`
}

export function spellPitchClassForLetter(letter: LetterName, pitchClass: PitchClass): SpelledNote {
  const natural = naturalPitchClasses[letter]
  const delta = ((pitchClass - natural + 6) % 12) - 6
  switch (delta) {
    case -2:
      return createSpelledNote(letter, 'bb')
    case -1:
      return createSpelledNote(letter, 'b')
    case 0:
      return createSpelledNote(letter)
    case 1:
      return createSpelledNote(letter, '#')
    case 2:
      return createSpelledNote(letter, '##')
    default:
      throw new Error(`Cannot spell pitch class ${pitchClass} with letter ${letter}`)
  }
}

export function midiToPitchClass(midi: MidiNote): PitchClass {
  return normalizePitchClass(midi)
}

export function midiForPitchClassAtOrAbove(pitchClass: PitchClass, minimum: MidiNote): MidiNote {
  return minimum + normalizePitchClass(pitchClass - midiToPitchClass(minimum))
}

export function frequencyForMidi(midi: MidiNote): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

export function noteNameForMidi(midi: MidiNote): string {
  const name = pitchClassName(midiToPitchClass(midi))
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

export function pitchClassName(pitchClass: PitchClass): string {
  return sharpPitchClassNames[pitchClass]
}

export const TONIC_OPTIONS: ReadonlyArray<TonicOption> = [
  { id: 'c', ...createSpelledNote('C') },
  { id: 'c-sharp', ...createSpelledNote('C', '#') },
  { id: 'd', ...createSpelledNote('D') },
  { id: 'e-flat', ...createSpelledNote('E', 'b') },
  { id: 'e', ...createSpelledNote('E') },
  { id: 'f', ...createSpelledNote('F') },
  { id: 'f-sharp', ...createSpelledNote('F', '#') },
  { id: 'g', ...createSpelledNote('G') },
  { id: 'a-flat', ...createSpelledNote('A', 'b') },
  { id: 'a', ...createSpelledNote('A') },
  { id: 'b-flat', ...createSpelledNote('B', 'b') },
  { id: 'b', ...createSpelledNote('B') },
]

export function tonicById(id: string): TonicOption {
  return TONIC_OPTIONS.find((tonic) => tonic.id === id) ?? TONIC_OPTIONS[0]
}
