// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '../../../shared/i18n/I18nProvider'
import { DatabaseComparePage } from './DatabaseComparePage'

afterEach(() => { cleanup(); window.localStorage.clear() })

function setup() {
  render(<I18nProvider><MemoryRouter><DatabaseComparePage /></MemoryRouter></I18nProvider>)
  return userEvent.setup()
}

describe('DatabaseComparePage', () => {
  it('moves the detection point when integration coverage changes', async () => {
    const user = setup()
    await user.click(screen.getByLabelText('将 name 改名为 display_name'))
    expect(screen.getByText('Go 编译通过，执行到这条写入时才返回数据库错误。')).toBeTruthy()
    await user.click(screen.getByLabelText('集成测试连接迁移后的数据库，且覆盖这条写入'))
    expect(screen.getByText('Go 编译通过，集成测试执行写入时发现列不存在。')).toBeTruthy()
    expect(screen.getByText('sqlc generate 发现查询引用了不存在的列。')).toBeTruthy()
  })

  it('supports keyboard tabs, preserves other examples, and resets only the active one', async () => {
    const user = setup()
    await user.click(screen.getByLabelText('将 name 改名为 display_name'))
    screen.getByRole('tab', { name: '改列名' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: '更新零值' }).getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: '更新零值' }))
    await user.selectOptions(screen.getByLabelText('GORM 传参方式'), 'map')
    expect(within(screen.getByRole('tabpanel')).getByText('三个字段都被明确更新。')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '重置本例' }))
    expect(within(screen.getByRole('tabpanel')).getByText('本次跳过：age, active。这些列保留原值。')).toBeTruthy()
    await user.click(screen.getByRole('tab', { name: '改列名' }))
    expect((screen.getByLabelText('将 name 改名为 display_name') as HTMLInputElement).checked).toBe(true)
  })

  it('makes a soft-deleted email reusable when the unique index excludes deleted rows', async () => {
    const user = setup()
    await user.click(screen.getByRole('tab', { name: '软删除' }))
    expect(screen.getByText('注册冲突：普通唯一索引仍约束已删除行。')).toBeTruthy()
    await user.click(screen.getByLabelText('唯一索引只约束未删除行'))
    expect(screen.getByText('这条旧记录不再阻止同一邮箱注册。')).toBeTruthy()
  })

  it('shows a parameter overflow and a working batching alternative', async () => {
    const user = setup()
    await user.click(screen.getByRole('tab', { name: '关联加载' }))
    fireEvent.change(screen.getByRole('slider'), { target: { value: '5' } })
    expect(screen.getByText('超过 PostgreSQL 的 65,535 个查询参数上限。')).toBeTruthy()
    await user.click(screen.getByLabelText('将关联查询按 1,000 个 ID 分批'))
    expect(screen.getByText('参数数量在上限内；实际耗时仍取决于数据、索引和执行计划。')).toBeTruthy()
    expect(screen.getByText('67')).toBeTruthy()
  })

  it('validates dynamic filters and renders the page in English', async () => {
    const user = setup()
    await user.click(screen.getByRole('tab', { name: '动态筛选' }))
    await user.type(screen.getByLabelText('用户 ID'), '1 OR 1=1')
    expect(screen.getByRole('alert').textContent).toContain('整数 ID')
    await user.clear(screen.getByLabelText('用户 ID'))
    await user.type(screen.getByLabelText('用户 ID'), '42')
    await user.selectOptions(screen.getByLabelText('订单状态'), 'paid')
    expect(screen.getByLabelText('SQL代码').textContent).toContain('status = $1\n  AND user_id = $2')
    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('GORM and sqlc')
    expect(screen.getByRole('tabpanel').textContent).not.toMatch(/[\u3400-\u9fff]/)
    expect(document.title).toBe('GORM and sqlc · Flight')
  })
})
