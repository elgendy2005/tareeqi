import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LINES, STATIONS } from '../data/metro.js'
import { LINE_PATHS, POSITIONS, VIEWBOX, WALK_PATHS, toPath } from '../data/layout.js'
import { isInterchange, walkLinksAt } from '../lib/router.js'
import { nearestPoint } from '../lib/hit.js'

const MIN_K = 1
const MAX_K = 6
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

const TERMINALS = new Set([
  'helwan',
  'new-el-marg',
  'el-mounib',
  'shubra-el-kheima',
  'adly-mansour',
  'rod-el-farag-corridor',
  'm-stadium',
  'm-justice-city',
])

// محطة ليها رابط مشي لمحطة تانية (زي الإستاد ↔ إستاد القاهرة) — بتتعامل كمحطة تبادل في العرض
const isLink = (id) => walkLinksAt(id).length > 0

// مكان الـ label لكل محطة تبادل/طرف عشان منزحمش الوسط. [anchor, dx, dy]
const LABEL_POS = {
  sadat: ['start', 14, 20],
  nasser: ['end', -14, -12],
  attaba: ['start', 14, 24],
  shohadaa: ['end', -14, 4],
  'cairo-university': ['end', -14, -6],
  'new-el-marg': ['end', -12, -4],
  'adly-mansour': ['end', -12, -10],
  stadium: ['end', -12, -8],
  'm-stadium': ['start', 12, 10],
}

function labelPos(id, x) {
  if (LABEL_POS[id]) return LABEL_POS[id]
  return x > 880 ? ['end', -11, 4] : ['start', 11, 4]
}

export default function MetroMap({ route, from, to, onStationClick }) {
  const svgRef = useRef(null)
  const pointers = useRef(new Map())
  const gesture = useRef({ moved: false, lastDist: 0 })
  const [t, setT] = useState({ k: 1, x: 0, y: 0 })
  const [screenScale, setScreenScale] = useState(0.75) // بكسل شاشة لكل وحدة SVG عند زوم 1

  useEffect(() => {
    const svg = svgRef.current
    const measure = () => {
      const { width, height } = svg.getBoundingClientRect()
      if (width && height) setScreenScale(Math.min(width / VIEWBOX.w, height / VIEWBOX.h))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(svg)
    return () => ro.disconnect()
  }, [])

  const bound = useCallback(
    ({ k, x, y }) => ({
      k,
      x: clamp(x, VIEWBOX.w * (1 - k), 0),
      y: clamp(y, VIEWBOX.h * (1 - k), 0),
    }),
    [],
  )

  const toSvg = (cx, cy) => {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = cx
    pt.y = cy
    return pt.matrixTransform(svg.getScreenCTM().inverse())
  }

  const zoomAt = useCallback(
    (px, py, factor) =>
      setT((cur) => {
        const k = clamp(cur.k * factor, MIN_K, MAX_K)
        const r = k / cur.k
        return bound({ k, x: px - (px - cur.x) * r, y: py - (py - cur.y) * r })
      }),
    [bound],
  )

  // wheel لازم non-passive عشان نمنع سكرول الصفحة
  useEffect(() => {
    const svg = svgRef.current
    const onWheel = (e) => {
      e.preventDefault()
      const p = toSvg(e.clientX, e.clientY)
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // مهم: مفيش setPointerCapture هنا، لأنه بيخطف الـ click من المحطة. بنعمل capture بس لما السحب يبدأ فعلًا.
  const onPointerDown = (e) => {
    pointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      sx: e.clientX,
      sy: e.clientY,
      captured: false,
    })
    gesture.current.moved = false
    gesture.current.lastDist = 0
  }

  const onPointerMove = (e) => {
    const map = pointers.current
    const prev = map.get(e.pointerId)
    if (!prev) return
    const cur = { ...prev, x: e.clientX, y: e.clientY }
    map.set(e.pointerId, cur)

    if (map.size === 1) {
      if (!cur.captured) {
        if (Math.hypot(cur.x - cur.sx, cur.y - cur.sy) < 4) return // لسه ضغطة مش سحب
        cur.captured = true
        gesture.current.moved = true
        svgRef.current.setPointerCapture(e.pointerId)
        return
      }
      const dx = cur.x - prev.x
      const dy = cur.y - prev.y
      const m = svgRef.current.getScreenCTM()
      setT((c) => bound({ ...c, x: c.x + dx / m.a, y: c.y + dy / m.d }))
    } else if (map.size === 2) {
      gesture.current.moved = true
      const [a, b] = [...map.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (gesture.current.lastDist) {
        const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2)
        zoomAt(mid.x, mid.y, dist / gesture.current.lastDist)
      }
      gesture.current.lastDist = dist
    }
  }

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId)
    gesture.current.lastDist = 0
  }

  // ضغطة على الخريطة بتروح لأقرب محطة (في حدود دايرة اللمس). ده أدق من دواير لمس
  // متداخلة: على الموبايل وفي زوم 1 المحطات قريبة، والدايرة اللي بتترسم آخر كانت بتغطي جارتها.
  const onMapClick = (e) => {
    if (gesture.current.moved) return
    const p = toSvg(e.clientX, e.clientY)
    const id = nearestPoint(POSITIONS, (p.x - t.x) / t.k, (p.y - t.y) / t.k, r(15))
    if (id) onStationClick(id)
  }

  const zoomCenter = (f) => zoomAt(VIEWBOX.w / 2, VIEWBOX.h / 2, f)

  // ---- بيانات المسار المعروض ----
  const routeStations = useMemo(() => {
    const set = new Set()
    const transfers = new Set()
    if (route) {
      route.legs.forEach((l, i) => {
        l.stations.forEach((s) => set.add(s))
        if (i > 0) transfers.add(l.from)
        if (l.walkBefore)
          [l.walkBefore.from, l.walkBefore.to].forEach((s) => (set.add(s), transfers.add(s)))
      })
      if (route.walkAfter)
        [route.walkAfter.from, route.walkAfter.to].forEach((s) => (set.add(s), transfers.add(s)))
      set.add(route.from)
      set.add(route.to)
    }
    return { set, transfers }
  }, [route])

  const k = t.k
  const hasRoute = !!route
  // على الموبايل الخريطة بتتصغّر، فبنكبّر العناصر عشان تفضل مقروءة
  const unit = clamp(0.62 / screenScale, 1, 2.4)
  const r = (base) => (base * unit) / Math.pow(k, 0.55) // دواير بتكبر أبطأ من الزوم
  const fs = (base) => (base * unit) / Math.pow(k, 0.9)

  const showLabel = (id) => {
    if (id === from || id === to) return true
    if (routeStations.transfers.has(id)) return true
    if (hasRoute && routeStations.set.has(id)) return k >= 1.5
    if (k >= 2.4) return true
    if (hasRoute) return false
    return isInterchange(id) || TERMINALS.has(id) || isLink(id)
  }

  return (
    <div className="map-grid relative h-full w-full overflow-hidden rounded-2xl border-2 border-ink">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="خريطة تخطيطية لمترو القاهرة: الخطوط الأول والثاني والثالث"
        className="h-full w-full touch-none select-none"
        style={{ cursor: 'grab', direction: 'ltr' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onMapClick}
      >
        <g transform={`translate(${t.x} ${t.y}) scale(${t.k})`}>
          {/* النيل (زخرفة) */}
          <path
            d="M 440 30 C 420 180, 450 300, 410 440 C 380 560, 330 740, 300 920"
            fill="none"
            stroke="#b9d3dc"
            strokeWidth="26"
            strokeLinecap="round"
            opacity="0.55"
          />
          <text x="448" y="170" fontSize={fs(15)} fill="#6f97a5" transform="rotate(8 448 170)">
            النيل
          </text>

          {/* الخطوط الأساسية */}
          {LINE_PATHS.map((p, i) => (
            <g key={i} opacity={hasRoute ? 0.2 : 1}>
              <path
                d={toPath(p.points)}
                fill="none"
                stroke={LINES[p.line].color}
                strokeWidth={r(10)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* المونوريل: خط مزدوج (لون + نص فاتح) عشان يتميّز عن المترو */}
              {LINES[p.line].mode === 'monorail' && (
                <path
                  d={toPath(p.points)}
                  fill="none"
                  stroke="#fbf8f1"
                  strokeWidth={r(3.5)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          ))}

          {/* روابط المشي بين محطتين منفصلتين */}
          {WALK_PATHS.map((w) => (
            <path
              key={w.a + w.b}
              d={toPath(w.points)}
              fill="none"
              stroke="#1d1b16"
              strokeWidth={r(3)}
              strokeDasharray={`${r(4)} ${r(4)}`}
              strokeLinecap="round"
              opacity={hasRoute ? 0.25 : 0.7}
            />
          ))}

          {/* المسار المختار */}
          {route?.legs.map((leg, i) => {
            const d = toPath(leg.stations.map((s) => POSITIONS[s]))
            return (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke="#fbf8f1"
                  strokeWidth={r(20)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={d}
                  fill="none"
                  stroke={LINES[leg.line].color}
                  strokeWidth={r(12)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )
          })}

          {/* المشي في المسار المختار */}
          {route &&
            [...route.legs.map((l) => l.walkBefore), route.walkAfter]
              .filter(Boolean)
              .map((w, i) => (
                <path
                  key={'walk' + i}
                  d={toPath([POSITIONS[w.from], POSITIONS[w.to]])}
                  fill="none"
                  stroke="#1d1b16"
                  strokeWidth={r(5)}
                  strokeDasharray={`${r(5)} ${r(4)}`}
                  strokeLinecap="round"
                />
              ))}

          {/* المحطات */}
          {Object.values(STATIONS).map((st) => {
            const [x, y] = POSITIONS[st.id]
            const inter = isInterchange(st.id) || isLink(st.id)
            const onRoute = routeStations.set.has(st.id)
            const dim = hasRoute && !onRoute
            const isFrom = st.id === from
            const isTo = st.id === to
            const radius = isFrom || isTo ? r(11) : inter ? r(9) : onRoute ? r(6.5) : r(5)
            const lineColor =
              LINES[route?.legs.find((l) => l.stations.includes(st.id))?.line ?? 1].color
            return (
              <g key={st.id} opacity={dim ? 0.35 : 1} style={{ cursor: 'pointer' }}>
                <title>{`${st.ar} — ${st.en}`}</title>
                <circle cx={x} cy={y} r={r(15)} fill="transparent" />
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={isFrom ? '#1d1b16' : isTo ? '#f2b134' : '#fbf8f1'}
                  stroke={
                    isFrom
                      ? '#f2b134'
                      : isTo
                        ? '#1d1b16'
                        : inter
                          ? '#1d1b16'
                          : onRoute
                            ? lineColor
                            : '#5b564a'
                  }
                  strokeWidth={r(inter || isFrom || isTo ? 4 : 2.5)}
                />
                {showLabel(st.id) &&
                  (() => {
                    const [anchor, dx, dy] = labelPos(st.id, x)
                    const strong =
                      isFrom ||
                      isTo ||
                      inter ||
                      TERMINALS.has(st.id) ||
                      routeStations.transfers.has(st.id)
                    return (
                      <text
                        x={x + (dx * unit) / Math.pow(k, 0.55)}
                        y={y + (dy * unit) / Math.pow(k, 0.55)}
                        textAnchor={anchor}
                        fontSize={fs(strong ? 15 : 12.5)}
                        fontWeight={strong ? 700 : 500}
                        fill="#1d1b16"
                        stroke="#fbf8f1"
                        strokeWidth={fs(4)}
                        paintOrder="stroke"
                        strokeLinejoin="round"
                        pointerEvents="none"
                      >
                        {/* RLI…PDI: النص عربي جوه SVG واخد direction: ltr — العزل بيظبط ترتيب الأسماء المختلطة زي «حي R2» */}
                        {`⁧${st.ar}⁩`}
                      </text>
                    )
                  })()}
              </g>
            )
          })}
        </g>
      </svg>

      {/* أزرار الزوم */}
      <div className="absolute bottom-3 end-3 flex flex-col overflow-hidden rounded-xl border-2 border-ink bg-card">
        <button
          type="button"
          aria-label="تكبير"
          onClick={() => zoomCenter(1.5)}
          className="h-10 w-10 text-xl font-bold hover:bg-saffron/40"
        >
          +
        </button>
        <button
          type="button"
          aria-label="تصغير"
          onClick={() => zoomCenter(1 / 1.5)}
          className="h-10 w-10 border-t-2 border-ink text-xl font-bold hover:bg-saffron/40"
        >
          −
        </button>
        <button
          type="button"
          aria-label="إعادة ضبط العرض"
          onClick={() => setT({ k: 1, x: 0, y: 0 })}
          className="h-10 w-10 border-t-2 border-ink text-sm hover:bg-saffron/40"
        >
          ⟲
        </button>
      </div>

      {/* مفتاح الخطوط */}
      <ul className="absolute end-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-x-3 gap-y-1 rounded-xl border-2 border-ink bg-card/95 px-3 py-2 text-xs font-medium">
        {Object.values(LINES).map((l) => (
          <li key={l.id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-5 rounded-full"
              style={{
                background: l.color,
                boxShadow:
                  l.mode === 'monorail'
                    ? 'inset 0 0 0 3px ' + l.color + ', inset 0 0 0 5px #fbf8f1'
                    : undefined,
              }}
            />
            {l.legend ?? l.ar}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2 border-dashed border-ink" />
          مشي
        </li>
      </ul>
    </div>
  )
}
