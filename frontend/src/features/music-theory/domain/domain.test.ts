import { describe, expect, it } from 'vitest'
import { buildTriad } from './chords'
import { buildDiatonicTriads, closePositionVoicings, progressionById, resolveProgression } from './harmony'
import { buildInterval, intervalById } from './intervals'
import { frequencyForMidi, formatSpelledNote, tonicById } from './notes'
import { playbackPlanDuration, progressionPlan } from './playback'
import { buildScale } from './scales'

describe('music theory domain', () => {
  it('maps MIDI notes to stable equal-temperament frequencies', () => {
    expect(frequencyForMidi(69)).toBe(440)
    expect(frequencyForMidi(60)).toBeCloseTo(261.626, 2)
  })

  it('spells major and natural-minor scales diatonically', () => {
    const gMajor = buildScale(tonicById('g'), 'major')
    const eFlatMinor = buildScale(tonicById('e-flat'), 'naturalMinor')
    expect(gMajor.notes.map((note) => formatSpelledNote(note.spelled))).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F♯'])
    expect(eFlatMinor.notes.map((note) => formatSpelledNote(note.spelled))).toEqual(['E♭', 'F', 'G♭', 'A♭', 'B♭', 'C♭', 'D♭'])
  })

  it('builds and inverts triads without changing chord-tone roles', () => {
    const triad = buildTriad(tonicById('c'), 'major', 1)
    expect(triad.notes.map((note) => note.midi)).toEqual([64, 67, 72])
    expect(triad.notes.map((note) => note.role)).toEqual(['third', 'fifth', 'root'])
  })

  it('builds the seven C-major diatonic triads', () => {
    const chords = buildDiatonicTriads(buildScale(tonicById('c'), 'major'))
    expect(chords.map((chord) => chord.roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
    expect(chords.map((chord) => chord.quality)).toEqual(['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'])
  })

  it('transposes interval spelling and playback pitch together', () => {
    const interval = buildInterval(tonicById('e-flat'), 63, intervalById('major-third'))
    expect(formatSpelledNote(interval.target)).toBe('G')
    expect(interval.targetMidi).toBe(67)
  })

  it('creates bounded close-position voicings and scheduled progressions', () => {
    const scale = buildScale(tonicById('c'), 'major')
    const chords = resolveProgression(scale, progressionById('pop'))
    const voicings = closePositionVoicings(chords)
    expect(voicings).toHaveLength(4)
    expect(voicings.flat().every((midi) => midi >= 48 && midi <= 84)).toBe(true)
    const plan = progressionPlan(voicings, 'arpeggioAscending')
    expect(plan).toHaveLength(12)
    expect(playbackPlanDuration(plan)).toBeGreaterThan(3)
  })
})
