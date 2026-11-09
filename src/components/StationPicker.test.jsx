// @vitest-environment jsdom
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StationPicker from './StationPicker.jsx'

/** StationPicker مكوّن controlled — ده غلاف بسيط بيمسك القيمة زي App */
function Harness({ initial = null, onChange = () => {} }) {
  const [value, setValue] = useState(initial)
  return (
    <StationPicker
      label="من محطة"
      value={value}
      onChange={(id) => {
        setValue(id)
        onChange(id)
      }}
      placeholder="اكتب اسم المحطة…"
    />
  )
}

const setup = (props) => {
  const user = userEvent.setup()
  render(<Harness {...props} />)
  return { user, input: screen.getByRole('combobox', { name: 'من محطة' }) }
}

describe('StationPicker', () => {
  it('القايمة مقفولة لحد ما الخانة تاخد focus', async () => {
    const { user, input } = setup()
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).toBeNull()
    await user.click(input)
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('الكتابة بتفلتر النتايج، حتى من غير همزة', async () => {
    const { user, input } = setup()
    await user.type(input, 'الاوبرا')
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveTextContent('الأوبرا')
  })

  it('بيدوّر في الأسماء البديلة («جامعة حلوان» ← «جامعة العاصمة»)', async () => {
    const { user, input } = setup()
    await user.type(input, 'جامعة حلوان')
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('جامعة العاصمة')
  })

  it('بيلاقي بالإنجليزي', async () => {
    const { user, input } = setup()
    await user.type(input, 'maadi')
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('المعادي')
  })

  it('الأسهم وEnter بيختاروا بالكيبورد، والخانة بتعرض الاسم', async () => {
    const onChange = vi.fn()
    const { user, input } = setup({ onChange })
    await user.type(input, 'المعادي')
    const first = screen.getAllByRole('option')[0]
    // أول نتيجة نشطة من الأول، والـ combobox بيشاور عليها
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', first.id)

    await user.keyboard('{ArrowDown}')
    const second = screen.getAllByRole('option')[1]
    expect(second).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', second.id)

    await user.keyboard('{ArrowUp}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('maadi')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(input).toHaveValue('المعادي')
  })

  it('الضغط على نتيجة بيختارها', async () => {
    const onChange = vi.fn()
    const { user, input } = setup({ onChange })
    await user.type(input, 'العتبة')
    await user.click(screen.getByRole('option', { name: /العتبة/ }))
    expect(onChange).toHaveBeenLastCalledWith('attaba')
    expect(input).toHaveValue('العتبة')
  })

  it('Escape بيقفل القايمة من غير ما يغيّر الاختيار', async () => {
    const onChange = vi.fn()
    const { user, input } = setup({ initial: 'opera', onChange })
    await user.type(input, 'حلوان')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('لو مفيش نتايج بيقول كده', async () => {
    const { user, input } = setup()
    await user.type(input, 'محطة مش موجودة خالص')
    const empty = screen.getByRole('option')
    expect(empty).toHaveTextContent('مفيش محطة بالاسم ده')
    expect(empty).toHaveAttribute('aria-disabled', 'true')
    // Enter مايختارش حاجة
    await user.keyboard('{Enter}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('زر المسح بيفضّي الاختيار ويرجّع الـ focus للخانة', async () => {
    const onChange = vi.fn()
    const { user, input } = setup({ initial: 'opera', onChange })
    expect(input).toHaveValue('الأوبرا')
    await user.click(screen.getByRole('button', { name: 'مسح من محطة' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(input).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'مسح من محطة' })).toBeNull()
  })

  it('محطات المونوريل والـ LRT ليها شارة', async () => {
    const { user, input } = setup()
    await user.type(input, 'مدينة العدالة')
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('مونوريل')
  })
})
