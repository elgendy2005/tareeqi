import { describe, it, expect } from 'vitest'
import { haversineKm, nearestStation, FAR_KM, geoErrorMessage, formatDistance } from './geo.js'
import { COORDS } from '../data/coords.js'

describe('haversineKm', () => {
  it('صفر لنفس النقطة', () => {
    expect(haversineKm({ lat: 30, lng: 31 }, { lat: 30, lng: 31 })).toBe(0)
  })
  it('درجة عرض واحدة ≈ 111.2 كم', () => {
    expect(haversineKm({ lat: 30, lng: 31 }, { lat: 31, lng: 31 })).toBeCloseTo(111.2, 0)
  })
  it('متماثلة', () => {
    const a = { lat: 30.05, lng: 31.24 }
    const b = { lat: 29.96, lng: 31.26 }
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10)
  })
})

describe('nearestStation', () => {
  it('بيرجع أقرب محطة والمسافة', () => {
    // نقطة جنب محطة المعادي بالظبط
    const r = nearestStation({ lat: COORDS.maadi.lat + 0.0005, lng: COORDS.maadi.lng }, COORDS)
    expect(r.id).toBe('maadi')
    expect(r.km).toBeLessThan(0.1)
  })
  it('كل محطة أقرب محطة لنفسها', () => {
    for (const [id, c] of Object.entries(COORDS)) expect(nearestStation(c, COORDS).id).toBe(id)
  })
  it('null لو مفيش محطات', () => {
    expect(nearestStation({ lat: 30, lng: 31 }, {})).toBeNull()
  })
  it('نقطة برّه القاهرة (الإسكندرية) أبعد من FAR_KM', () => {
    expect(nearestStation({ lat: 31.2, lng: 29.92 }, COORDS).km).toBeGreaterThan(FAR_KM)
  })
})

describe('رسائل الموقع', () => {
  it('رسالة مختلفة لكل حالة، وفيه رسالة افتراضية', () => {
    const msgs = ['unsupported', 1, 2, 3].map(geoErrorMessage)
    expect(new Set(msgs).size).toBe(4)
    expect(geoErrorMessage(99)).toBe(geoErrorMessage(2))
  })
  it('formatDistance', () => {
    expect(formatDistance(0.347)).toBe('٣٥٠ متر')
    expect(formatDistance(1.26)).toBe('١٫٣ كم')
  })
})
