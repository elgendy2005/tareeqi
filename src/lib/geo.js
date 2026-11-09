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
