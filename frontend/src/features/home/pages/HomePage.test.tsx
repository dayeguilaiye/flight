// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../../../shared/i18n/I18nProvider'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('lists the learning projects while keeping the LLM tester off the home page', () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </I18nProvider>,
    )

    const links = within(screen.getByRole('navigation', { name: '自学练习作品' })).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(screen.getByRole('link', { name: '打开GORM 与 sqlc' }).getAttribute('href')).toBe('/gorm-vs-sqlc')
    expect(screen.queryByRole('link', { name: '打开LLM API 测试器' })).toBeNull()
    expect(screen.getByRole('link', { name: '打开听见乐理' }).getAttribute('href')).toBe('/music-theory')
    expect(document.body.textContent).not.toContain('即将')
  })
})
