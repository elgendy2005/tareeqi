import { SERVICES, STATIONS, FARE_SYSTEMS, TRANSFER_LINKS } from '../data/metro.js'

// ---- ثوابت التقدير ----
export const TRANSFER_PENALTY = 6 // التحويل بيتحسب بـ 6 محطات عشان نفضّل مسار فيه تحويلات أقل
const MIN_PER_STOP_FALLBACK = 2.2 // لأي خدمة مالهاش زمن منشور (تقدير)
export const MIN_PER_TRANSFER = 4 // مشي + انتظار عند التحويل (تقدير، مش منشور رسميًا)

/** دقايق لكل خطوة على الخدمة دي، محسوبة من زمن الرحلة الكامل المنشور. */
export const minutesPerStop = (svc) =>
  svc.minutesPerStop ??
  (svc.minutesEndToEnd ? svc.minutesEndToEnd / (svc.stations.length - 1) : MIN_PER_STOP_FALLBACK)

const svcById = Object.fromEntries(SERVICES.map((s) => [s.id, s]))
const indexOf = Object.fromEntries(
  SERVICES.map((s) => [s.id, Object.fromEntries(s.stations.map((id, i) => [id, i]))]),
)
const servicesAt = {} // stationId -> [serviceId]
for (const s of SERVICES) for (const id of s.stations) (servicesAt[id] ||= []).push(s.id)

export const isInterchange = (stationId) => {
  const lines = new Set((servicesAt[stationId] || []).map((sid) => svcById[sid].line))
  return lines.size > 1
}

export const linesAt = (stationId) => [
  ...new Set((servicesAt[stationId] || []).map((sid) => svcById[sid].line)),
]

/** وسيلة النقل للخدمة: 'metro' (افتراضي) أو 'monorail'. */
export const modeOf = (svc) => svc.mode ?? 'metro'

// روابط المشي في الاتجاهين: stationId → [{ to, minutes }]
const walksFrom = {}
for (const { a, b, walkMinutes } of TRANSFER_LINKS) {
  ;(walksFrom[a] ||= []).push({ to: b, minutes: walkMinutes })
  ;(walksFrom[b] ||= []).push({ to: a, minutes: walkMinutes })
}
/** المحطات اللي ممكن تمشي لها من المحطة دي (محطات منفصلة، مش نفس المحطة). */
export const walkLinksAt = (stationId) => walksFrom[stationId] || []
/** وسيلة النقل في المحطة ('metro' أو 'monorail') — كل محطة تبع وسيلة واحدة. */
export const modeAt = (stationId) => modeOf(svcById[servicesAt[stationId][0]])
const walkMinutes = (a, b) => walkLinksAt(a).find((w) => w.to === b)?.minutes

// ---- طابور أولويات بسيط (min-heap) ----
class MinHeap {
  constructor() {
    this.a = []
  }
  get size() {
    return this.a.length
  }
  push(item, pri) {
    const a = this.a
    a.push([pri, item])
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (a[p][0] <= a[i][0]) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop() {
    const a = this.a
    const top = a[0]
    const last = a.pop()
    if (a.length) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1,
          r = l + 1
        let m = i
        if (l < a.length && a[l][0] < a[m][0]) m = l
        if (r < a.length && a[r][0] < a[m][0]) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]
        i = m
      }
    }
    return top
  }
}

const key = (station, svc) => `${station}|${svc}`

/**
 * السعر حسب عدد محطات التذكرة. العدد **شامل محطة الركوب ومحطة النزول**
 * (يعني عدد الخطوات + 1) — المصدر في docs/DATA.md. كل وسيلة ليها شرايحها (`FARE_SYSTEMS`).
 */
export function fareFor(stations, mode = 'metro') {
  const brackets = FARE_SYSTEMS[mode].brackets
  for (const b of brackets) if (stations <= b.maxStations) return { price: b.price, bracket: b }
  const last = brackets[brackets.length - 1]
  return { price: last.price, bracket: last, overMax: true }
}

function directionLabel(svc, iFrom, iTo) {
  const forward = iTo > iFrom
  if (!forward) return svc.endpoints[0]
  // الخط 3: لو القطار رايح غرب وهينزل قبل الكيت كات، ممكن يكون أي قطار من الفرعين
  if (svc.trunkEnd !== undefined && iTo <= svc.trunkEnd) return 'روض الفرج أو جامعة القاهرة'
  return svc.endpoints[1]
}

/**
 * أقصر مسار بين محطتين. التكلفة = عدد المحطات + (جزاء × عدد التحويلات).
 * بترجع null لو المحطتين نفس بعض أو غير موجودة.
 */
export function findRoute(fromId, toId) {
  if (!STATIONS[fromId] || !STATIONS[toId] || fromId === toId) return null

  const dist = new Map()
  const prev = new Map()
  const heap = new MinHeap()

  for (const sid of servicesAt[fromId]) {
    dist.set(key(fromId, sid), 0)
    heap.push([fromId, sid], 0)
  }

  let goal = null
  while (heap.size) {
    const [d, [st, sid]] = heap.pop()
    const k = key(st, sid)
    if (d > (dist.get(k) ?? Infinity)) continue
    if (st === toId) {
      goal = k
      break
    }

    const svc = svcById[sid]
    const i = indexOf[sid][st]
    const relax = (nSt, nSid, cost) => {
      const nk = key(nSt, nSid)
      const nd = d + cost
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd)
        prev.set(nk, k)
        heap.push([nSt, nSid], nd)
      }
    }
    if (i > 0) relax(svc.stations[i - 1], sid, 1)
    if (i < svc.stations.length - 1) relax(svc.stations[i + 1], sid, 1)
    for (const other of servicesAt[st]) if (other !== sid) relax(st, other, TRANSFER_PENALTY)
    // مشي لمحطة منفصلة (مثلًا مترو الإستاد ↔ مونوريل إستاد القاهرة)
    for (const w of walkLinksAt(st))
      for (const other of servicesAt[w.to]) relax(w.to, other, TRANSFER_PENALTY)
  }
  if (!goal) return null

  // رجّع المسار كسلسلة states
  const states = []
  for (let k = goal; k; k = prev.get(k)) {
    const [st, sid] = k.split('|')
    states.push({ station: st, service: sid })
  }
  states.reverse()

  // قسّم لرحلات (legs) — كل رحلة على خدمة واحدة. المشي بين محطتين منفصلتين بيتسجّل
  // كـ walkBefore على الرحلة اللي بعده، أو walkAfter لو الرحلة بتخلص بمشي.
  const legs = []
  let cur = null
  let prevStation = null
  for (const { station, service } of states) {
    if (!cur || cur.service !== service) {
      const walk =
        prevStation && prevStation !== station
          ? { from: prevStation, to: station, minutes: walkMinutes(prevStation, station) }
          : null
      // رحلة من محطة واحدة (بداية/تحويل من غير ركوب) مابتتعدش، بس المشي اللي قبلها بيتنقل
      const carried = cur && cur.stations.length === 1 ? cur.walkBefore : null
      if (cur && cur.stations.length > 1) legs.push(cur)
      cur = { service, stations: [station], walkBefore: walk ?? carried }
    } else if (cur.stations[cur.stations.length - 1] !== station) {
      cur.stations.push(station)
    }
    prevStation = station
  }
  let walkAfter = null
  if (cur && cur.stations.length > 1) legs.push(cur)
  else if (cur?.walkBefore) walkAfter = cur.walkBefore

  const detailed = legs.map((leg, idx) => {
    const svc = svcById[leg.service]
    const iFrom = indexOf[leg.service][leg.stations[0]]
    const iTo = indexOf[leg.service][leg.stations[leg.stations.length - 1]]
    const prevLeg = legs[idx - 1]
    const prevSvc = prevLeg ? svcById[prevLeg.service] : null
    return {
      service: leg.service,
      line: svc.line,
      mode: modeOf(svc),
      walkBefore: leg.walkBefore,
      stations: leg.stations,
      from: leg.stations[0],
      to: leg.stations[leg.stations.length - 1],
      stops: leg.stations.length - 1,
      direction: directionLabel(svc, iFrom, iTo),
      // مشي لمحطة تانية → 'walk' · جوه الخط 3 (بين الفرعين) → 'train' · غير كده → 'line'
      changeKind: !prevSvc
        ? null
        : leg.walkBefore
          ? 'walk'
          : prevSvc.line === svc.line
            ? 'train'
            : 'line',
    }
  })

  const stops = detailed.reduce((n, l) => n + l.stops, 0)
  const rideMinutes = detailed.reduce((m, l) => m + l.stops * minutesPerStop(svcById[l.service]), 0)
  const transfers = Math.max(0, detailed.length - 1)
  // زمن التحويلات: مشي (تقدير لكل رابط) أو تحويل جوه نفس المحطة (MIN_PER_TRANSFER)
  const changeMinutes = detailed.reduce(
    (m, l, i) => m + (l.walkBefore ? l.walkBefore.minutes : i > 0 ? MIN_PER_TRANSFER : 0),
    walkAfter ? walkAfter.minutes : 0,
  )

  // التذاكر: كل مجموعة رحلات متتالية على نفس الوسيلة = تذكرة واحدة.
  // عدد محطات التذكرة = كل المحطات من الركوب للنزول شاملة الطرفين (محطة التحويل مرة واحدة)
  // يعني خطوات المجموعة + 1. TODO(verify) تذاكر المترو والمونوريل منفصلة (docs/DATA.md).
  const tickets = []
  for (const l of detailed) {
    const last = tickets[tickets.length - 1]
    if (last && last.mode === l.mode && !l.walkBefore) last.steps += l.stops
    else tickets.push({ mode: l.mode, steps: l.stops })
  }
  for (const tk of tickets) {
    tk.stations = tk.steps + 1
    const f = fareFor(tk.stations, tk.mode)
    tk.price = f.price
    tk.overMax = !!f.overMax
    tk.effective = FARE_SYSTEMS[tk.mode].effective
    delete tk.steps
  }

  return {
    from: fromId,
    to: toId,
    legs: detailed,
    walkAfter,
    stops,
    tickets,
    // للرحلات بتذكرة واحدة (الأغلب): عدد محطات التذكرة
    fareStations: tickets.length === 1 ? tickets[0].stations : null,
    transfers,
    fare: tickets.reduce((s, tk) => s + tk.price, 0),
    fareOverMax: tickets.some((tk) => tk.overMax),
    minutes: Math.round(rideMinutes + changeMinutes),
  }
}
