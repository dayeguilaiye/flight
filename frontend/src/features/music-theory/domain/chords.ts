import {
  LETTER_NAMES,
  midiForPitchClassAtOrAbove,
  normalizePitchClass,
  spellPitchClassForLetter,
  type MidiNote,
  type PitchClass,
  type SpelledNote,
} from './notes'

export type TriadQuality = 'major' | 'minor' | 'diminished' | 'augmented'
export type Inversion = 0 | 1 | 2
export type ChordToneRole = 'root' | 'third' | 'fifth'

export type TriadNote = {
  spelled: SpelledNote
  midi: MidiNote
  role: ChordToneRole
}

export type Triad = {
  root: SpelledNote
  quality: TriadQuality
  inversion: Inversion
  notes: ReadonlyArray<TriadNote>
}

export const triadIntervals: Record<TriadQuality, readonly [number, number, number]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
}

export const TRIAD_QUALITIES: ReadonlyArray<TriadQuality> = ['major', 'minor', 'diminished', 'augmented']
export const INVERSIONS: ReadonlyArray<Inversion> = [0, 1, 2]

const toneRoles: ReadonlyArray<ChordToneRole> = ['root', 'third', 'fifth']

export function buildTriad(root: SpelledNote, quality: TriadQuality, inversion: Inversion = 0, minimumMidi = 60): Triad {
  const rootMidi = midiForPitchClassAtOrAbove(root.pitchClass, minimumMidi)
  const rootLetterIndex = LETTER_NAMES.indexOf(root.letter)
  const rootPosition = triadIntervals[quality].map((offset, index): TriadNote => {
    const letter = LETTER_NAMES[(rootLetterIndex + index * 2) % LETTER_NAMES.length]
    const pitchClass = normalizePitchClass(root.pitchClass + offset)
    return {
      spelled: spellPitchClassForLetter(letter, pitchClass),
      midi: rootMidi + offset,
      role: toneRoles[index],
    }
  })

  const notes = rootPosition.map((note, index) => ({
    ...rootPosition[(index + inversion) % rootPosition.length],
    midi: rootPosition[(index + inversion) % rootPosition.length].midi + (index + inversion >= rootPosition.length ? 12 : 0),
  }))

  return { root, quality, inversion, notes }
}

export function inferTriadQuality(root: PitchClass, third: PitchClass, fifth: PitchClass): TriadQuality {
  const shape = [
    0,
    normalizePitchClass(third - root),
    normalizePitchClass(fifth - root),
  ].join(',')

  switch (shape) {
    case '0,4,7':
      return 'major'
    case '0,3,7':
      return 'minor'
    case '0,3,6':
      return 'diminished'
    case '0,4,8':
      return 'augmented'
    default:
      throw new Error(`Unsupported triad shape ${shape}`)
  }
}
