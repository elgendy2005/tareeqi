// @vitest-environment jsdom
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RouteResult from './RouteResult.jsx'
import { findRoute, routeFare } from '../lib/router.js'
import { n } from '../lib/format.js'

function Harness({ from, to, initial = 'regular' }) {
  const [category, setCategory] = useState(initial)
  return (
    <RouteResult route={findRoute(from, to)} category={category} onCategoryChange={setCategory} />
  )
}

// السعر الكبير في التذكرة
const bigFare = () => screen.getByText('جنيه', { selector: 'span' }).parentElement

describe('RouteResult', () => {
  it('رحلة بتحويلة: السعر والخطوات وتعليمات التحويل', () => {
    const route = findRoute('maadi', 'opera')
    render(<Harness from="maadi" to="opera" />)

    expect(screen.getByRole('heading', { name: 'نتيجة الرحلة' })).toBeInTheDocument()
    expect(screen.getByText('سعر التذكرة')).toBeInTheDocument()
    expect(bigFare()).toHaveTextContent(`${n(routeFare(route).total)} جنيه`)

    const list = screen.getByRole('list', { name: 'خطوات الرحلة' })
    // خطوة لكل رحلة ركوب (العناصر المباشرة بس، مش المحطات اللي جوه details)
    expect(list.querySelectorAll(':scope > li')).toHaveLength(route.legs.length)
    const steps = within(list)
    expect(steps.getByText('الخط الأول')).toBeInTheDocument()
    expect(steps.getByText('الخط الثاني')).toBeInTheDocument()
    // تعليمات التحويل في السادات
    expect(screen.getByText(/غيّر في/)).toHaveTextContent('غيّر في السادات للـالخط الثاني')
  })

  it('الخط 3: الانتقال بين الفرعين = «غيّر القطار»', () => {
    render(<Harness from="imbaba" to="cairo-university" />)
    expect(screen.getByText(/غيّر القطار في/)).toHaveTextContent('الكيت كات')
  })

  it('رحلة مترو + مونوريل: تذكرتين، ومشي، وتنبيه التذكرة المنفصلة', () => {
    const route = findRoute('attaba', 'm-justice-city')
    const priced = routeFare(route)
    render(<Harness from="attaba" to="m-justice-city" />)

    expect(screen.getByText('إجمالي التذاكر')).toBeInTheDocument()
    expect(bigFare()).toHaveTextContent(`${n(priced.total)} جنيه`)
    const tickets = within(screen.getByRole('list', { name: 'التذاكر' })).getAllByRole('listitem')
    expect(tickets).toHaveLength(2)
    expect(tickets[0]).toHaveTextContent('تذكرة مترو')
    expect(tickets[1]).toHaveTextContent('تذكرة مونوريل')
    expect(screen.getByText(/امشي من محطة مترو/)).toHaveTextContent('الإستاد')
    expect(screen.getByText('هتحتاج تذكرة مونوريل منفصلة.')).toBeInTheDocument()
  })

  it('المحطات اللي في السكة مطوية في details', async () => {
    const user = userEvent.setup()
    render(<Harness from="helwan" to="sadat" />)
    const summary = screen.getByText(/المحطات اللي في السكة/)
    const details = summary.closest('details')
    expect(details).not.toHaveAttribute('open')
    await user.click(summary)
    expect(details).toHaveAttribute('open')
    expect(within(details).getByText('المعادي')).toBeInTheDocument()
  })

  describe('نوع التذكرة', () => {
    it('radiogroup فيه «عادية» مختارة ومعاها tab stop واحد بس', () => {
      render(<Harness from="maadi" to="opera" />)
      const group = screen.getByRole('radiogroup', { name: 'نوع التذكرة' })
      const radios = within(group).getAllByRole('radio')
      expect(radios.map((r) => r.textContent)).toEqual(['عادية', 'نص تذكرة', 'ذوي الهمم'])
      expect(radios[0]).toHaveAttribute('aria-checked', 'true')
      expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1])
    })

    it('الاختيار بيغيّر السعر ويوضّح مين يستحق', async () => {
      const user = userEvent.setup()
      const route = findRoute('maadi', 'opera')
      render(<Harness from="maadi" to="opera" />)
      await user.click(screen.getByRole('radio', { name: 'نص تذكرة' }))
      expect(screen.getByRole('radio', { name: 'نص تذكرة' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
      expect(bigFare()).toHaveTextContent(`${n(routeFare(route, 'senior').total)} جنيه`)
      expect(screen.getByText(/كبار السن/)).toBeInTheDocument()
    })

    it('الأسهم بتنقل وتختار (RTL: الشمال = اللي بعده)، وبتلف من الآخر للأول', async () => {
      const user = userEvent.setup()
      render(<Harness from="maadi" to="opera" />)
      screen.getByRole('radio', { name: 'عادية' }).focus()

      await user.keyboard('{ArrowLeft}')
      expect(screen.getByRole('radio', { name: 'نص تذكرة' })).toHaveFocus()
      expect(screen.getByRole('radio', { name: 'نص تذكرة' })).toHaveAttribute(
        'aria-checked',
        'true',
      )

      await user.keyboard('{ArrowLeft}{ArrowLeft}')
      expect(screen.getByRole('radio', { name: 'عادية' })).toHaveFocus()

      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('radio', { name: 'ذوي الهمم' })).toHaveFocus()

      await user.keyboard('{Home}')
      expect(screen.getByRole('radio', { name: 'عادية' })).toHaveAttribute('aria-checked', 'true')
    })

    it('بيبلّغ الأب بالاختيار', async () => {
      const user = userEvent.setup()
      const onCategoryChange = vi.fn()
      render(
        <RouteResult
          route={findRoute('maadi', 'opera')}
          category="regular"
          onCategoryChange={onCategoryChange}
        />,
      )
      await user.click(screen.getByRole('radio', { name: 'ذوي الهمم' }))
      expect(onCategoryChange).toHaveBeenCalledWith('disabled')
    })

    it('الـ LRT مالوش خصم: بيتحسب عادي مع تنبيه', () => {
      render(<Harness from="l-obour" to="l-badr" initial="senior" />)
      expect(screen.getByText(/الـ LRT مالوش سعر مخفض معلن/)).toBeInTheDocument()
    })
  })
})
