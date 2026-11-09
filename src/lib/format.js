// صياغة الأرقام والجمل اللي بتتعرض للمستخدم (وبتتقري لقارئ الشاشة).
import { STATIONS } from '../data/metro.js'

/** رقم بالأرقام العربية المشرقية (١٢٣) */
export const n = (v) => Number(v).toLocaleString('ar-EG')

export function stopsText(count) {
  if (count === 1) return 'محطة واحدة'
  if (count === 2) return 'محطتين'
  if (count <= 10) return `${n(count)} محطات`
  return `${n(count)} محطة`
}

export function minutesText(m) {
  if (m === 1) return 'دقيقة'
  if (m === 2) return 'دقيقتين'
  if (m <= 10) return `${n(m)} دقايق`
  return `${n(m)} دقيقة`
}

export function transfersText(count) {
  if (count === 0) return 'من غير تحويل'
  if (count === 1) return 'تحويلة واحدة'
  if (count === 2) return 'تحويلتين'
  return `${n(count)} تحويلات`
}

/** «من X لـ Y» — بديل نصي للسهم «X ← Y» اللي قارئ الشاشة بيقراه غلط */
export const tripLabel = (fromId, toId) => `من ${STATIONS[fromId].ar} لـ ${STATIONS[toId].ar}`

/**
 * ملخص الرحلة في جملة واحدة لمنطقة الـ aria-live: بيتقري أول ما الرحلة أو نوع التذكرة يتغيّر.
 * `priced` = ناتج routeFare (عشان السعر يبقى حسب نوع التذكرة المختار).
 */
export function routeSummary(route, priced) {
  const fare = priced.tickets.length === 0 ? 'من غير تذكرة' : `${n(priced.total)} جنيه`
  return `${tripLabel(route.from, route.to)}: ${fare}، ${transfersText(route.transfers)}، حوالي ${minutesText(route.minutes)}.`
}
