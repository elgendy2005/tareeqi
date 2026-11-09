import { describe, expect, it } from 'vitest'
import { CATEGORY_KEY, loadCategory, saveCategory } from './fareCategory.js'

const memory = (init = {}) => {
  const data = { ...init }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v)
    },
    data,
  }
}

const throwing = {
  getItem() {
    throw new Error('blocked')
  },
  setItem() {
    throw new Error('blocked')
  },
}

describe('fareCategory', () => {
  it('بيرجّع «عادية» لو مفيش حاجة متخزنة أو الـ storage مش موجود', () => {
    expect(loadCategory(memory())).toBe('regular')
    expect(loadCategory(null)).toBe('regular')
  })

  it('بيحفظ ويقرا النوع', () => {
    const s = memory()
    saveCategory('senior', s)
    expect(s.data[CATEGORY_KEY]).toBe('senior')
    expect(loadCategory(s)).toBe('senior')
  })

  it('بيتجاهل قيمة مش معروفة (حتى لو اسم خاصية في Object)', () => {
    expect(loadCategory(memory({ [CATEGORY_KEY]: 'vip' }))).toBe('regular')
    expect(loadCategory(memory({ [CATEGORY_KEY]: 'toString' }))).toBe('regular')
  })

  it('مابيوقعش لو الـ storage مقفول', () => {
    expect(loadCategory(throwing)).toBe('regular')
    expect(() => saveCategory('senior', throwing)).not.toThrow()
  })
})
