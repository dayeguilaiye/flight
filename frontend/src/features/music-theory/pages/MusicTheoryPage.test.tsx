// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '../../../shared/i18n/I18nProvider'
import { MusicTheoryPage } from './MusicTheoryPage'

afterEach(cleanup)

function renderMusicTheory(path: string) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<MusicTheoryPage />} path="/music-theory" />
          <Route element={<MusicTheoryPage />} path="/music-theory/lab" />
          <Route element={<MusicTheoryPage />} path="/music-theory/:chapterSlug/:lessonSlug" />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  )
}

describe('MusicTheoryPage', () => {
  it('opens a deep-linked lesson and reflects a selected chord on the piano', async () => {
    const user = userEvent.setup()
    renderMusicTheory('/music-theory/diatonic-chords/major-key-chords')

    expect(screen.getByRole('heading', { level: 1, name: '大调里的七个和弦' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /^VG$/ }))

    const dockedPiano = within(screen.getByRole('group', { name: '可移动音区的虚拟钢琴' }))
    expect(dockedPiano.getByRole('button', { name: 'G3' }).getAttribute('aria-pressed')).toBe('true')
    expect(dockedPiano.getByRole('button', { name: 'B3' }).getAttribute('aria-pressed')).toBe('true')
    expect(dockedPiano.getByRole('button', { name: 'D4' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('keeps invalid routes useful and exposes the full course without a gate', async () => {
    const user = userEvent.setup()
    renderMusicTheory('/music-theory/no-chapter/no-lesson')

    expect(screen.getByRole('heading', { level: 1, name: '找不到这个乐理环节' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '从第一个环节开始' }).getAttribute('href')).toBe('/music-theory/sound-keyboard/keyboard-map')

    await user.click(within(screen.getByRole('article')).getByRole('button', { name: '打开完整课程目录' }))
    expect(screen.getByRole('dialog', { name: '全部章节与环节' })).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /大调里的七个和弦/ }).length).toBeGreaterThan(0)
  })

  it('opens the free laboratory directly', () => {
    renderMusicTheory('/music-theory/lab')
    expect(screen.getByRole('heading', { level: 1, name: '自由实验室' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '自由选音', pressed: true })).toBeTruthy()
  })
})
