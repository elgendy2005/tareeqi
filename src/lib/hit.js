/**
 * أقرب نقطة لـ (x, y) في حدود `maxDist` (نفس وحدات الإحداثيات).
 * بنستخدمها في الخريطة بدل دواير لمس متداخلة: الضغطة بتروح لأقرب محطة فعلًا.
 * @param {Record<string, [number, number]>} points  id → [x, y]
 * @returns {string | null}
 */
export function nearestPoint(points, x, y, maxDist) {
  let best = null
  let bestD = maxDist
  for (const [id, [px, py]] of Object.entries(points)) {
    const d = Math.hypot(px - x, py - y)
    if (d <= bestD) {
      best = id
      bestD = d
    }
  }
  return best
}
