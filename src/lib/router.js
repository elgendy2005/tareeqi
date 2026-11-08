import { SERVICES, STATIONS, FARE_BRACKETS } from '../data/metro.js'

// ---- ثوابت التقدير ----
export const TRANSFER_PENALTY = 6 // التحويل بيتحسب بـ 6 محطات عشان نفضّل مسار فيه تحويلات أقل
const MIN_PER_STOP = 2.2
const MIN_PER_TRANSFER = 4

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

export function fareFor(stops) {
  for (const b of FARE_BRACKETS) if (stops <= b.maxStations) return { price: b.price, bracket: b }
  const last = FARE_BRACKETS[FARE_BRACKETS.length - 1]
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
  }
  if (!goal) return null

  // رجّع المسار كسلسلة states
  const states = []
  for (let k = goal; k; k = prev.get(k)) {
    const [st, sid] = k.split('|')
    states.push({ station: st, service: sid })
  }
  states.reverse()

  // قسّم لرحلات (legs) — كل رحلة على خدمة واحدة
  const legs = []
  let cur = null
  for (const { station, service } of states) {
    if (!cur || cur.service !== service) {
      if (cur && cur.stations.length > 1) legs.push(cur)
      // تحويل (نفس المحطة، خدمة جديدة): ابدأ رحلة جديدة من نفس المحطة
      cur = { service, stations: [station] }
    } else if (cur.stations[cur.stations.length - 1] !== station) {
      cur.stations.push(station)
    }
  }
  if (cur && cur.stations.length > 1) legs.push(cur)

  const detailed = legs.map((leg, idx) => {
    const svc = svcById[leg.service]
    const iFrom = indexOf[leg.service][leg.stations[0]]
    const iTo = indexOf[leg.service][leg.stations[leg.stations.length - 1]]
    const prevLeg = legs[idx - 1]
    const prevSvc = prevLeg ? svcById[prevLeg.service] : null
    return {
      service: leg.service,
      line: svc.line,
      stations: leg.stations,
      from: leg.stations[0],
      to: leg.stations[leg.stations.length - 1],
      stops: leg.stations.length - 1,
      direction: directionLabel(svc, iFrom, iTo),
      // لو التحويل جوه الخط 3 (بين الفرعين) → "غيّر القطار" مش "غيّر الخط"
      changeKind: prevSvc ? (prevSvc.line === svc.line ? 'train' : 'line') : null,
    }
  })

  const stops = detailed.reduce((n, l) => n + l.stops, 0)
  const transfers = detailed.length - 1
  const fare = fareFor(stops)

  return {
    from: fromId,
    to: toId,
    legs: detailed,
    stops,
    transfers,
    fare: fare.price,
    fareOverMax: !!fare.overMax,
    minutes: Math.round(stops * MIN_PER_STOP + transfers * MIN_PER_TRANSFER),
  }
}
