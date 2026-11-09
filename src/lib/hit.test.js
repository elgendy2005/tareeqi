import { describe, it, expect } from 'vitest'
import { nearestPoint } from './hit.js'
import { POSITIONS } from '../data/layout.js'

describe('nearestPoint', () => {
  const pts = { a: [0, 0], b: [10, 0] }
  it('بيختار الأقرب حتى لو التانية جوه المدى برضه', () => {
    expect(nearestPoint(pts, 4, 0, 20)).toBe('a')
    expect(nearestPoint(pts, 6, 0, 20)).toBe('b')
  })
  it('null لو مفيش نقطة في المدى', () => {
    expect(nearestPoint(pts, 50, 50, 5)).toBeNull()
  })
  it('الضغط على مركز أي محطة في الخريطة بيختارها هي (مش جارتها)', () => {
    for (const [id, [x, y]] of Object.entries(POSITIONS))
      expect(nearestPoint(POSITIONS, x, y, 15)).toBe(id)
  })
})
