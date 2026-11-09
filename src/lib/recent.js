// آخر الرحلات: بتتحفظ في localStorage على جهاز المستخدم بس.

export const RECENT_KEY = 'tareeqi:recent'
export const RECENT_MAX = 5

/** بتضيف رحلة في الأول، وبتشيل التكرار (نفس من/إلى)، وبتقص لآخر `max`. */
export function addRecent(list, trip, max = RECENT_MAX) {
  const rest = list.filter((t) => !(t.from === trip.from && t.to === trip.to))
  return [{ from: trip.from, to: trip.to }, ...rest].slice(0, max)
}

/** بتنضّف القايمة المتخزنة: بتشيل أي حاجة مش رحلة صالحة (محطات اتشالت أو بيانات بايظة). */
export function sanitizeRecent(value, isValidStation, max = RECENT_MAX) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const t of value) {
    if (!t || typeof t !== 'object') continue
    if (!isValidStation(t.from) || !isValidStation(t.to) || t.from === t.to) continue
    if (out.some((o) => o.from === t.from && o.to === t.to)) continue
    out.push({ from: t.from, to: t.to })
    if (out.length === max) break
  }
  return out
}

// مجرد الوصول لـ window.localStorage ممكن يرمي error (وضع خاص / كوكيز مقفولة)،
// عشان كده بنجيبه جوه try — مش كـ default parameter.
const resolve = (storage) => (storage === undefined ? globalThis.localStorage : storage)

/** قراءة آمنة: لو الـ storage مقفول (وضع خاص / إعدادات) بترجع []. */
export function loadRecent(isValidStation, storage) {
  try {
    return sanitizeRecent(JSON.parse(resolve(storage)?.getItem(RECENT_KEY) ?? '[]'), isValidStation)
  } catch {
    return []
  }
}

/** كتابة آمنة: أي خطأ (مساحة / storage مقفول) بيتجاهل من غير ما يكسر الصفحة. */
export function saveRecent(list, storage) {
  try {
    resolve(storage)?.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    /* مش مشكلة — الميزة دي اختيارية */
  }
}
