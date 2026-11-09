import { describe, it, expect } from 'vitest'
import { addRecent, sanitizeRecent, loadRecent, saveRecent, RECENT_KEY } from './recent.js'

const valid = (id) => ['a', 'b', 'c', 'd', 'e', 'f', 'g'].includes(id)

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v)
    },
    data,
  }
}

describe('addRecent', () => {
  it('بيحط الجديد في الأول', () => {
    expect(addRecent([{ from: 'a', to: 'b' }], { from: 'c', to: 'd' })).toEqual([
      { from: 'c', to: 'd' },
      { from: 'a', to: 'b' },
    ])
  })
  it('بيشيل التكرار ويرفع الرحلة للأول', () => {
    const list = [
      { from: 'a', to: 'b' },
      { from: 'c', to: 'd' },
    ]
    expect(addRecent(list, { from: 'c', to: 'd' })).toEqual([
      { from: 'c', to: 'd' },
      { from: 'a', to: 'b' },
    ])
  })
  it('الاتجاه العكسي رحلة مختلفة', () => {
    expect(addRecent([{ from: 'a', to: 'b' }], { from: 'b', to: 'a' })).toHaveLength(2)
  })
  it('أقصى حاجة 5', () => {
    let list = []
    for (const [f, t] of ['ab', 'bc', 'cd', 'de', 'ef', 'fg'])
      list = addRecent(list, { from: f, to: t })
    expect(list).toHaveLength(5)
    expect(list[0]).toEqual({ from: 'f', to: 'g' })
    expect(list.at(-1)).toEqual({ from: 'b', to: 'c' })
  })
})

describe('sanitizeRecent', () => {
  it('بيرفض أي حاجة مش array', () => {
    expect(sanitizeRecent(null, valid)).toEqual([])
    expect(sanitizeRecent({ from: 'a' }, valid)).toEqual([])
  })
  it('بيشيل المحطات المجهولة والبيانات البايظة والتكرار', () => {
    const raw = [
      { from: 'a', to: 'b' },
      { from: 'zzz', to: 'b' },
      'نص',
      null,
      { from: 'a', to: 'a' },
      { from: 'a', to: 'b', extra: 1 },
      { from: 'c', to: 'd' },
    ]
    expect(sanitizeRecent(raw, valid)).toEqual([
      { from: 'a', to: 'b' },
      { from: 'c', to: 'd' },
    ])
  })
})

describe('loadRecent / saveRecent', () => {
  it('بيحفظ ويقرا', () => {
    const s = memoryStorage()
    saveRecent([{ from: 'a', to: 'b' }], s)
    expect(loadRecent(valid, s)).toEqual([{ from: 'a', to: 'b' }])
  })
  it('JSON بايظ = []', () => {
    expect(loadRecent(valid, memoryStorage({ [RECENT_KEY]: '{oops' }))).toEqual([])
  })
  it('storage بيرمي error (وضع خاص) = [] ومن غير ما يكسر', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceeded')
      },
    }
    expect(loadRecent(valid, broken)).toEqual([])
    expect(() => saveRecent([{ from: 'a', to: 'b' }], broken)).not.toThrow()
  })
  it('مفيش storage خالص (null) = []', () => {
    expect(loadRecent(valid, null)).toEqual([])
    expect(() => saveRecent([], null)).not.toThrow()
  })
  it('مجرد الوصول لـ localStorage بيرمي error = [] من غير ما يكسر', () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError')
      },
    })
    try {
      expect(loadRecent(valid)).toEqual([])
      expect(() => saveRecent([{ from: 'a', to: 'b' }])).not.toThrow()
    } finally {
      if (desc) Object.defineProperty(globalThis, 'localStorage', desc)
      else delete globalThis.localStorage
    }
  })
})
