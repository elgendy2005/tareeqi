// حسابات جغرافية بسيطة (من غير مكتبات).

const R_KM = 6371.0088 // متوسط نصف قطر الأرض
const rad = (deg) => (deg * Math.PI) / 180

/** المسافة على سطح الأرض بين نقطتين `{ lat, lng }` بالكيلومتر (Haversine). */
export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * أقرب محطة لنقطة معيّنة (مسافة مستقيمة، مش مسافة مشي).
 * @param {{lat:number,lng:number}} point
 * @param {Record<string,{lat:number,lng:number}>} coords  id → إحداثيات
 * @returns {{ id: string, km: number } | null}
 */
export function nearestStation(point, coords) {
  let best = null
  for (const [id, c] of Object.entries(coords)) {
    const km = haversineKm(point, c)
    if (!best || km < best.km) best = { id, km }
  }
  return best
}

/** لو أقرب محطة أبعد من كده، غالبًا المستخدم مش في القاهرة أو الموقع مش دقيق. */
export const FAR_KM = 5

// أكواد GeolocationPositionError: 1 = رفض الإذن، 2 = الموقع مش متاح، 3 = الوقت خلص
const GEO_ERRORS = {
  unsupported: 'المتصفح ده مابيدعمش تحديد الموقع. اختار المحطة بنفسك.',
  1: 'محتاجين إذن الموقع عشان نلاقي أقرب محطة. تقدر تفعّله من إعدادات المتصفح، أو اختار المحطة بنفسك.',
  2: 'معرفناش نحدد موقعك دلوقتي. جرّب تاني أو اختار المحطة بنفسك.',
  3: 'تحديد الموقع أخد وقت أكتر من اللازم. جرّب تاني.',
}

/** رسالة خطأ بالعربي لكود خطأ الـ Geolocation (أو 'unsupported'). */
export const geoErrorMessage = (code) => GEO_ERRORS[code] ?? GEO_ERRORS[2]

/** «1.2 كم» أو «350 متر» */
export function formatDistance(km) {
  if (km < 1)
    return `${Math.max(10, Math.round((km * 1000) / 10) * 10).toLocaleString('ar-EG')} متر`
  return `${(Math.round(km * 10) / 10).toLocaleString('ar-EG')} كم`
}
