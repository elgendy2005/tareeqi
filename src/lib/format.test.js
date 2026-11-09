import { describe, expect, it } from 'vitest'
import { minutesText, n, routeSummary, stopsText, transfersText, tripLabel } from './format.js'
import { findRoute, routeFare } from './router.js'

describe('format', () => {
  it('بيكتب الأرقام بالأرقام العربية', () => {
    expect(n(15)).toBe('١٥')
  })

  it('بيصيغ العدد صح (مفرد / مثنى / جمع)', () => {
    expect(stopsText(1)).toBe('محطة واحدة')
    expect(stopsText(2)).toBe('محطتين')
    expect(stopsText(5)).toBe('٥ محطات')
    expect(stopsText(12)).toBe('١٢ محطة')
    expect(minutesText(1)).toBe('دقيقة')
    expect(minutesText(2)).toBe('دقيقتين')
    expect(minutesText(5)).toBe('٥ دقايق')
    expect(minutesText(40)).toBe('٤٠ دقيقة')
    expect(transfersText(0)).toBe('من غير تحويل')
    expect(transfersText(1)).toBe('تحويلة واحدة')
    expect(transfersText(2)).toBe('تحويلتين')
    expect(transfersText(3)).toBe('٣ تحويلات')
  })

  it('بيكتب الرحلة بالكلام بدل السهم', () => {
    expect(tripLabel('maadi', 'opera')).toBe('من المعادي لـ الأوبرا')
  })

  it('ملخص الرحلة فيه السعر والتحويلات والزمن', () => {
    const route = findRoute('maadi', 'opera')
    const text = routeSummary(route, routeFare(route))
    expect(text).toContain(tripLabel('maadi', 'opera'))
    expect(text).toContain(`${n(routeFare(route).total)} جنيه`)
    expect(text).toContain(transfersText(route.transfers))
    expect(text).toContain(minutesText(route.minutes))
  })

  it('الملخص بيتغيّر مع نوع التذكرة', () => {
    const route = findRoute('maadi', 'opera')
    const senior = routeFare(route, 'senior')
    expect(routeSummary(route, senior)).toContain(`${n(senior.total)} جنيه`)
  })
})
