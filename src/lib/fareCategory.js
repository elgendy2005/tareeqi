// نوع التذكرة اللي المستخدم اختاره بيتفتكر على جهازه بس (تفضيل شخصي — لو الـ storage مقفول، عادي).
import { FARE_CATEGORIES } from '../data/metro.js'

export const CATEGORY_KEY = 'tareeqi:fare-category'

const resolve = (storage) => (storage === undefined ? globalThis.localStorage : storage)

export function loadCategory(storage) {
  try {
    const v = resolve(storage)?.getItem(CATEGORY_KEY)
    return v && Object.hasOwn(FARE_CATEGORIES, v) ? v : 'regular'
  } catch {
    return 'regular'
  }
}

export function saveCategory(value, storage) {
  try {
    resolve(storage)?.setItem(CATEGORY_KEY, value)
  } catch {
    /* مش مشكلة */
  }
}
