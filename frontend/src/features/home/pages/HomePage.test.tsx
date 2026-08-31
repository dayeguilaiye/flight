// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../../../shared/i18n/I18nProvider'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('lists only the two real tools with semantic links', () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </I18nProvider>,
    )

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(screen.getByRole('link', { name: '打开LLM API 测试器' }).getAttribute('href')).toBe('/llm-api-tester')
    expect(screen.getByRole('link', { name: '打开听见乐理' }).getAttribute('href')).toBe('/music-theory')
    expect(document.body.textContent).not.toContain('即将')
  })
})
