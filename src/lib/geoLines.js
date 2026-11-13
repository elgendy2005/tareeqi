// تحويل الخطوط والرحلة لإحداثيات جغرافية [lat, lng] للخريطة الجغرافية.
// الخطوط بتترسم خطوط مستقيمة بين كل محطتين ورا بعض (مش شكل القضبان الحقيقي، لأن ده مش عندنا من مصدر).
import { LINES, SERVICES, TRANSFER_LINKS } from '../data/metro.js'
import { COORDS } from '../data/coords.js'

/** [lat, lng] لمحطة */
export const latLng = (id) => [COORDS[id].lat, COORDS[id].lng]

/** كل خدمة كخط: لونها ووسيلتها ونقطها بالترتيب */
export function serviceLines(services = SERVICES) {
  return services.map((svc) => ({
    id: svc.id,
    color: LINES[svc.line].color,
    mode: LINES[svc.line].mode ?? 'metro',
    points: svc.stations.map(latLng),
  }))
}

/** روابط المشي بين محطتين منفصلتين */
export const walkLines = (links = TRANSFER_LINKS) =>
  links.map(({ a, b }) => ({ id: a + '>' + b, points: [latLng(a), latLng(b)] }))

/**
 * الرحلة على الخريطة الجغرافية: الرحلات بلون خطها، والمشي، وكل النقط (للزوم على الرحلة).
 * @returns {{ legs: {color:string, points:number[][]}[], walks: number[][][], points: number[][] }}
 */
export function routeGeo(route) {
  const walks = [...route.legs.map((l) => l.walkBefore), route.walkAfter]
    .filter(Boolean)
    .map((w) => [latLng(w.from), latLng(w.to)])
  const legs = route.legs.map((l) => ({
    color: LINES[l.line].color,
    points: l.stations.map(latLng),
  }))
  return { legs, walks, points: [...legs.flatMap((l) => l.points), ...walks.flat()] }
}

// نوع الخريطة (تخطيطية / جغرافية) — تفضيل على الجهاز بس
export const MAP_VIEW_KEY = 'tareeqi:map-view'
const resolve = (storage) => (storage === undefined ? globalThis.localStorage : storage)

export function loadMapView(storage) {
  try {
    return resolve(storage)?.getItem(MAP_VIEW_KEY) === 'geo' ? 'geo' : 'schematic'
  } catch {
    return 'schematic'
  }
}

export function saveMapView(value, storage) {
  try {
    resolve(storage)?.setItem(MAP_VIEW_KEY, value)
  } catch {
    /* مش مشكلة */
  }
}
