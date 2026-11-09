// @vitest-environment jsdom
// اختبار تدفق كامل: المستخدم يختار محطتين ← السعر والملخص يظهروا، والرابط يتحدّث.
import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { findRoute, routeFare } from './lib/router.js'
import { n, routeSummary } from './lib/format.js'

const fromInput = () => screen.getByRole('combobox', { name: 'من محطة' })
const toInput = () => screen.getByRole('combobox', { name: 'إلى محطة' })
// منطقة الـ status الدايمة (فيه status تاني جوه زر «موقعي» بس بيظهر بعد الضغط)
const announcer = () => screen.getAllByRole('status')[0]

async function pick(user, input, text) {
  await user.click(input)
  await user.type(input, text)
  await user.keyboard('{Enter}')
}

describe('App — التدفق الكامل', () => {
  it('اختيار محطتين بالكتابة ← السعر والخطوات والملخص المسموع', async () => {
    const user = userEvent.setup()
    render(<App />)
    // قبل الاختيار: رسالة إرشاد، والـ status موجود وفاضي
    expect(screen.getByText('اختار محطتين، أو دوس عليهم في الخريطة.')).toBeInTheDocument()
    expect(announcer()).toBeEmptyDOMElement()

    await pick(user, fromInput(), 'المعادي')
    await pick(user, toInput(), 'الأوبرا')

    const route = findRoute('maadi', 'opera')
    const fare = routeFare(route).total
    const result = screen.getByRole('region', { name: 'نتيجة الرحلة' })
    expect(within(result).getByText('سعر التذكرة').nextElementSibling).toHaveTextContent(
      `${n(fare)} جنيه`,
    )
    expect(within(result).getByText(/غيّر في/)).toHaveTextContent('السادات')
    expect(announcer()).toHaveTextContent(routeSummary(route, routeFare(route)))
    expect(window.location.search).toBe('?from=maadi&to=opera')
  })

  it('بيفتح الرحلة من الرابط (?from=&to=)', () => {
    window.history.replaceState(null, '', '/?from=attaba&to=m-justice-city')
    render(<App />)
    expect(fromInput()).toHaveValue('العتبة')
    expect(toInput()).toHaveValue('مدينة العدالة')
    expect(screen.getByText('إجمالي التذاكر')).toBeInTheDocument()
    expect(screen.getByText('هتحتاج تذكرة مونوريل منفصلة.')).toBeInTheDocument()
  })

  it('بيتجاهل محطات مش موجودة في الرابط', () => {
    window.history.replaceState(null, '', '/?from=nowhere&to=opera')
    render(<App />)
    expect(fromInput()).toHaveValue('')
    expect(toInput()).toHaveValue('الأوبرا')
  })

  it('«اعكس الاتجاه» بيبدّل المحطتين', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?from=maadi&to=opera')
    render(<App />)
    await user.click(screen.getByRole('button', { name: /اعكس الاتجاه/ }))
    expect(fromInput()).toHaveValue('الأوبرا')
    expect(toInput()).toHaveValue('المعادي')
    expect(window.location.search).toBe('?from=opera&to=maadi')
  })

  it('مثال سريع بيعرض رحلة، وبعدها بتظهر في «آخر رحلاتك»', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'من المعادي لـ الأوبرا' }))
    expect(screen.getByRole('region', { name: 'نتيجة الرحلة' })).toBeInTheDocument()

    // نمسح «إلى» عشان نرجع لشاشة البداية
    await user.click(screen.getByRole('button', { name: 'مسح إلى محطة' }))
    expect(screen.getByText('آخر رحلاتك:')).toBeInTheDocument()
    const recent = screen.getByText('آخر رحلاتك:').closest('div').parentElement
    expect(
      within(recent).getByRole('button', { name: 'من المعادي لـ الأوبرا' }),
    ).toBeInTheDocument()
  })

  it('نفس المحطة في الخانتين ← رسالة واضحة', async () => {
    const user = userEvent.setup()
    render(<App />)
    await pick(user, fromInput(), 'المعادي')
    await pick(user, toInput(), 'المعادي')
    expect(screen.getByText(/محطة البداية والنهاية نفس بعض/, { selector: 'p:not([role])' }))
    expect(announcer()).toHaveTextContent('محطة البداية والنهاية نفس بعض.')
  })

  it('تغيير نوع التذكرة بيغيّر السعر في الملخص المسموع ويتفتكر', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?from=maadi&to=opera')
    const { unmount } = render(<App />)
    await user.click(screen.getByRole('radio', { name: 'نص تذكرة' }))
    const route = findRoute('maadi', 'opera')
    expect(announcer()).toHaveTextContent(`${n(routeFare(route, 'senior').total)} جنيه`)

    unmount()
    render(<App />)
    expect(screen.getByRole('radio', { name: 'نص تذكرة' })).toHaveAttribute('aria-checked', 'true')
  })

  it('الخريطة ليها اسم وبديل نصي فيه كل الخطوط', () => {
    render(<App />)
    const map = screen.getByRole('img', { name: /خريطة تخطيطية/ })
    expect(map).toHaveAccessibleDescription(/خانتي «من محطة» و«إلى محطة»/)
    expect(screen.getByRole('heading', { name: 'الخطوط والمحطات بالترتيب' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /مونوريل شرق النيل/ })).toBeInTheDocument()
  })
})
