import type { MidiNote } from './notes'

export type NoteRole = 'root' | 'tonic' | 'member'

export type PlannedNote = {
  midi: MidiNote
  startsAtSeconds: number
  durationSeconds: number
  velocity: number
  role?: NoteRole
}

export type PlaybackPlan = ReadonlyArray<PlannedNote>
export type ChordPlaybackMode = 'block' | 'arpeggioAscending' | 'arpeggioDescending'

export function singleNotePlan(midi: MidiNote): PlaybackPlan {
  return [{ midi, startsAtSeconds: 0, durationSeconds: 0.8, velocity: 0.85 }]
}

export function harmonicPlan(notes: ReadonlyArray<MidiNote>): PlaybackPlan {
  return notes.map((midi, index) => ({
    midi,
    startsAtSeconds: 0,
    durationSeconds: 1.15,
    velocity: index === 0 ? 0.8 : 0.68,
  }))
}

export function melodicPlan(notes: ReadonlyArray<MidiNote>, gapSeconds = 0.52): PlaybackPlan {
  return notes.map((midi, index) => ({
    midi,
    startsAtSeconds: index * gapSeconds,
    durationSeconds: 0.72,
    velocity: 0.8,
  }))
}

export function arpeggioPlan(notes: ReadonlyArray<MidiNote>, direction: 'ascending' | 'descending'): PlaybackPlan {
  const ordered = direction === 'ascending' ? notes : [...notes].reverse()
  return ordered.map((midi, index) => ({
    midi,
    startsAtSeconds: index * 0.16,
    durationSeconds: 0.86,
    velocity: 0.76,
  }))
}

export function progressionPlan(
  chords: ReadonlyArray<ReadonlyArray<MidiNote>>,
  mode: ChordPlaybackMode,
): PlaybackPlan {
  const chordSpacing = mode === 'block' ? 1.05 : 0.88
  return chords.flatMap((notes, chordIndex) => {
    const chordStart = chordIndex * chordSpacing
    if (mode === 'block') {
      return harmonicPlan(notes).map((note) => ({ ...note, startsAtSeconds: chordStart }))
    }
    const direction = mode === 'arpeggioAscending' ? 'ascending' : 'descending'
    return arpeggioPlan(notes, direction).map((note) => ({
      ...note,
      startsAtSeconds: note.startsAtSeconds + chordStart,
    }))
  })
}

export function playbackPlanDuration(plan: PlaybackPlan): number {
  return plan.reduce((duration, note) => Math.max(duration, note.startsAtSeconds + note.durationSeconds), 0)
}
