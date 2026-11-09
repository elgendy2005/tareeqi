import { describe, it, expect } from 'vitest'
import { haversineKm } from './geo.js'

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
