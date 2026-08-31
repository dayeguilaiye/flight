// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PianoKeyboard } from './PianoKeyboard'

afterEach(cleanup)

describe('PianoKeyboard', () => {
  it('starts multiple computer-key voices and releases them independently', () => {
    const onNoteStart = vi.fn()
    const onNoteEnd = vi.fn()
    render(
      <PianoKeyboard
        activeNotes={[]}
        baseMidi={60}
        computerKeyboard
        keyboardHints
        label="Test piano"
        onNoteEnd={onNoteEnd}
        onNoteStart={onNoteStart}
        rangeSemitones={12}
      />,
    )

    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    fireEvent.keyDown(window, { code: 'KeyD', key: 'd' })
    fireEvent.keyDown(window, { code: 'KeyG', key: 'g' })

    expect(onNoteStart.mock.calls).toEqual([[60], [64], [67]])
    expect(screen.getByRole('button', { name: 'C4' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'E4' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'G4' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.keyUp(window, { code: 'KeyD', key: 'd' })
    expect(onNoteEnd.mock.calls).toEqual([[64]])
    expect(screen.getByRole('button', { name: 'C4' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'E4' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'G4' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.blur(window)
    expect(onNoteEnd.mock.calls).toEqual([[64], [60], [67]])
  })

  it('does not let an embedded lesson piano register global computer keys', () => {
    const onNoteStart = vi.fn()
    render(
      <PianoKeyboard
        activeNotes={[]}
        baseMidi={60}
        keyboardHints={false}
        label="Lesson piano"
        onNoteStart={onNoteStart}
        rangeSemitones={12}
      />,
    )

    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    expect(onNoteStart).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'C4' }))
    expect(onNoteStart).toHaveBeenCalledWith(60)
  })
})
