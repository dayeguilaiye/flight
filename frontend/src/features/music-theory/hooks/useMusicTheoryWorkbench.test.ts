import { describe, expect, it } from 'vitest'
import { initialWorkbenchState, workbenchReducer } from './useMusicTheoryWorkbench'

describe('workbenchReducer', () => {
  it('keeps every lesson open while adapting useful defaults', () => {
    const minor = workbenchReducer(initialWorkbenchState, { type: 'lessonChanged', lessonId: 'harmony.minor-key-chords' })
    expect(minor.scaleKind).toBe('naturalMinor')
    expect(minor.tonicId).toBe('c')
  })

  it('toggles free notes without storing derived labels', () => {
    const removed = workbenchReducer(initialWorkbenchState, { type: 'freePitchToggled', pitchClass: 4 })
    const added = workbenchReducer(removed, { type: 'freePitchToggled', pitchClass: 2 })
    expect(added.freePitchClasses).toEqual([0, 2, 7])
  })
})
