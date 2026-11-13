import { describe, expect, it } from 'vitest'
import { SERVICES, TRANSFER_LINKS } from '../data/metro.js'
import { COORDS } from '../data/coords.js'
import { findRoute } from './router.js'
import {
  MAP_VIEW_KEY,
  latLng,
  loadMapView,
  routeGeo,
  saveMapView,
  serviceLines,
  walkLines,
} from './geoLines.js'

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

describe('geoLines', () => {
  it('latLng بيرجّع [lat, lng] من coords.js', () => {
    expect(latLng('sadat')).toEqual([COORDS.sadat.lat, COORDS.sadat.lng])
  })

  it('كل خدمة خط بنفس عدد محطاتها ولون خطها ووسيلتها', () => {
    const lines = serviceLines()
    expect(lines).toHaveLength(SERVICES.length)
    lines.forEach((l, i) => expect(l.points).toHaveLength(SERVICES[i].stations.length))
    expect(lines.find((l) => l.id === '1')).toMatchObject({ color: '#1d5fc9', mode: 'metro' })
    expect(lines.find((l) => l.id === 'ENM').mode).toBe('monorail')
    expect(lines.find((l) => l.id === 'LRT').mode).toBe('lrt')
  })

  it('روابط المشي: نقطتين لكل رابط', () => {
    const walks = walkLines()
    expect(walks).toHaveLength(TRANSFER_LINKS.length)
    expect(walks[0].points).toEqual([latLng(TRANSFER_LINKS[0].a), latLng(TRANSFER_LINKS[0].b)])
  })

  it('رحلة فيها تحويلة: رحلة لكل خط، والنقط كلها للزوم', () => {
    const route = findRoute('maadi', 'opera')
    const geo = routeGeo(route)
    expect(geo.legs).toHaveLength(2)
    expect(geo.legs[0].points[0]).toEqual(latLng('maadi'))
    expect(geo.legs.at(-1).points.at(-1)).toEqual(latLng('opera'))
    expect(geo.walks).toEqual([])
    expect(geo.points).toContainEqual(latLng('sadat'))
  })

  it('رحلة فيها مشي (مترو ↔ مونوريل): المشي بيترسم', () => {
    const route = findRoute('attaba', 'm-justice-city')
    const geo = routeGeo(route)
    expect(geo.walks).toContainEqual([latLng('stadium'), latLng('m-stadium')])
    expect(geo.points).toContainEqual(latLng('m-stadium'))
  })

  it('رحلة بتنتهي بمشي: walkAfter بيترسم', () => {
    const route = findRoute('haykestep', 'l-adly-mansour')
    expect(route.walkAfter).toBeTruthy()
    expect(routeGeo(route).walks).toContainEqual([
      latLng(route.walkAfter.from),
      latLng(route.walkAfter.to),
    ])
  })
})

describe('نوع الخريطة (تفضيل محلي)', () => {
  it('الافتراضي تخطيطية، وبيحفظ ويقرا جغرافية', () => {
    const s = memory()
    expect(loadMapView(s)).toBe('schematic')
    saveMapView('geo', s)
    expect(s.data[MAP_VIEW_KEY]).toBe('geo')
    expect(loadMapView(s)).toBe('geo')
    expect(loadMapView(memory({ [MAP_VIEW_KEY]: 'junk' }))).toBe('schematic')
    expect(loadMapView(null)).toBe('schematic')
  })

  it('لو الـ storage مقفول مابيوقعش', () => {
    expect(loadMapView(throwing)).toBe('schematic')
    expect(() => saveMapView('geo', throwing)).not.toThrow()
  })

  it('من غير storage صريح بيستخدم localStorage لو موجود', () => {
    expect(loadMapView()).toBe('schematic')
    expect(() => saveMapView('geo')).not.toThrow()
  })
})
