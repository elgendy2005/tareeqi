import { memo, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { STATIONS } from '../data/metro.js'
import { COORDS } from '../data/coords.js'
import { isInterchange, walkLinksAt } from '../lib/router.js'
import { latLng, routeGeo, serviceLines, walkLines } from '../lib/geoLines.js'
import { nearestPoint } from '../lib/hit.js'
import MapLegend from './MapLegend.jsx'

// الخريطة الجغرافية: المحطات في أماكنها الحقيقية (OpenStreetMap) فوق خريطة الشوارع،
// عشان تعرف المحطة فين بالظبط وأنهي محطة أقرب لمشوارك.
// الـ chunk ده بيتحمّل بس لما المستخدم يفتح العرض الجغرافي (React.lazy في App).

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">مساهمو OpenStreetMap</a>'
const ALL_POINTS = Object.keys(COORDS).map(latLng)
const BASE_LINES = serviceLines()
const WALK_LINES = walkLines()
const TAP_PX = 22 // الضغطة بتروح لأقرب محطة في حدود المسافة دي (نفس فكرة الخريطة التخطيطية)
const INK = '#1d1b16'
const CARD = '#fbf8f1'
const SAFFRON = '#f2b134'

const isLink = (id) => walkLinksAt(id).length > 0
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * زوم على نقط معيّنة، مع مساحة فوق قد مفتاح الخطوط (على الموبايل بيبقى سطرين أو تلاتة)
 * عشان محطة على الحافة (ولافتتها اللي فوقها) ماتستخباش تحته.
 */
function fitTo(map, points, { pad = 16, ...opts } = {}) {
  const legend = map.getContainer().parentElement?.querySelector('[data-map-legend]')
  const top = Math.max(pad, (legend?.offsetHeight ?? 0) + 40)
  map.fitBounds(points, { paddingTopLeft: [pad, top], paddingBottomRight: [pad, pad], ...opts })
}

/** محطات الرحلة ومحطات التحويل فيها */
function routeStations(route) {
  const set = new Set()
  const transfers = new Set()
  if (!route) return { set, transfers }
  route.legs.forEach((l, i) => {
    l.stations.forEach((s) => set.add(s))
    if (i > 0) transfers.add(l.from)
    if (l.walkBefore) [l.walkBefore.from, l.walkBefore.to].forEach((s) => transfers.add(s))
  })
  if (route.walkAfter) [route.walkAfter.from, route.walkAfter.to].forEach((s) => transfers.add(s))
  transfers.forEach((s) => set.add(s))
  return { set, transfers }
}

/** لافتة المحطة: عنصر DOM (مش HTML نصي) واتجاهه RTL جوه حاوية الخريطة اللي واخدة LTR */
function labelNode(text) {
  const span = document.createElement('span')
  span.dir = 'rtl'
  span.textContent = text
  return span
}

function drawLine(group, points, { color, weight, opacity = 1, dashArray }) {
  L.polyline(points, {
    color,
    weight,
    opacity,
    dashArray,
    lineCap: 'round',
    lineJoin: 'round',
    interactive: false,
  }).addTo(group)
}

/** زرار «إعادة ضبط العرض» كـ control في Leaflet عشان يترص مع أزرار الزوم */
const ResetControl = L.Control.extend({
  onAdd(map) {
    const bar = L.DomUtil.create('div', 'leaflet-bar')
    const btn = L.DomUtil.create('a', 'geo-reset', bar)
    btn.href = '#'
    btn.role = 'button'
    btn.title = 'إعادة ضبط العرض'
    btn.setAttribute('aria-label', 'إعادة ضبط العرض')
    btn.textContent = '⟲'
    L.DomEvent.disableClickPropagation(bar)
    L.DomEvent.on(btn, 'click', (e) => {
      L.DomEvent.preventDefault(e)
      fitTo(map, ALL_POINTS)
    })
    return bar
  },
})

function GeoMap({ route, from, to, onStationClick }) {
  const el = useRef(null)
  const mapRef = useRef(null)
  const overlayRef = useRef(null)
  const clickRef = useRef(onStationClick)
  useEffect(() => {
    clickRef.current = onStationClick
  }, [onStationClick])

  // إنشاء الخريطة مرة واحدة
  useEffect(() => {
    const map = L.map(el.current, { zoomSnap: 0.5, minZoom: 9, maxZoom: 18, zoomControl: false })
    map.attributionControl.setPrefix(
      '<a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a>',
    )
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map)
    fitTo(map, ALL_POINTS)
    // الأزرار تحت على الشمال (= آخر السطر في الصفحة RTL)، زي الخريطة التخطيطية. المفتاح فوق.
    L.control
      .zoom({ position: 'bottomleft', zoomInTitle: 'تكبير', zoomOutTitle: 'تصغير' })
      .addTo(map)
    new ResetControl({ position: 'bottomleft' }).addTo(map)
    overlayRef.current = L.layerGroup().addTo(map)

    // ضغطة على الخريطة = أقرب محطة على الشاشة (أدق من دواير صغيرة على الموبايل)
    map.on('click', (e) => {
      const pts = {}
      for (const id of Object.keys(COORDS)) {
        const p = map.latLngToContainerPoint(latLng(id))
        pts[id] = [p.x, p.y]
      }
      const id = nearestPoint(pts, e.containerPoint.x, e.containerPoint.y, TAP_PX)
      if (id) clickRef.current(id)
    })

    // الخريطة بتتغيّر مقاسها مع الـ layout (موبايل/ديسكتوب) — Leaflet محتاج يعرف
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el.current)
    mapRef.current = map
    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // الخطوط والرحلة والمحطات
  useEffect(() => {
    const group = overlayRef.current
    group.clearLayers()
    const hasRoute = !!route
    const { set: onRoute, transfers } = routeStations(route)

    for (const line of BASE_LINES) {
      const opacity = hasRoute ? 0.3 : 0.9
      drawLine(group, line.points, { color: line.color, weight: 5, opacity })
      // نفس تمييز الخريطة التخطيطية: المونوريل خط مزدوج، والـ LRT نص متقطع
      if (line.mode === 'monorail')
        drawLine(group, line.points, { color: CARD, weight: 1.5, opacity })
      if (line.mode === 'lrt')
        drawLine(group, line.points, { color: CARD, weight: 1.5, opacity, dashArray: '4 5' })
    }
    for (const w of WALK_LINES)
      drawLine(group, w.points, { color: INK, weight: 2, opacity: 0.6, dashArray: '3 4' })

    if (route) {
      const geo = routeGeo(route)
      for (const leg of geo.legs) {
        drawLine(group, leg.points, { color: CARD, weight: 11 })
        drawLine(group, leg.points, { color: leg.color, weight: 6.5 })
      }
      for (const w of geo.walks) drawLine(group, w, { color: INK, weight: 3.5, dashArray: '4 5' })
    }

    const labelled = new Set() // محطتين بنفس الاسم جنب بعض (عدلي منصور مترو وLRT): لافتة واحدة
    for (const st of Object.values(STATIONS)) {
      const isFrom = st.id === from
      const isTo = st.id === to
      const inter = isInterchange(st.id) || isLink(st.id)
      const on = onRoute.has(st.id)
      const dim = hasRoute && !on
      const marker = L.circleMarker(latLng(st.id), {
        radius: isFrom || isTo ? 8 : inter ? 6 : on ? 5 : 4,
        color: isFrom ? SAFFRON : isTo || inter ? INK : '#5b564a',
        weight: isFrom || isTo || inter ? 3 : 2,
        fillColor: isFrom ? INK : isTo ? SAFFRON : CARD,
        fillOpacity: 1,
        opacity: dim ? 0.4 : 1,
        // الضغطة بتعدّي للخريطة، وهي اللي بتختار أقرب محطة
        bubblingMouseEvents: true,
      }).addTo(group)
      const permanent = (isFrom || isTo || transfers.has(st.id)) && !labelled.has(st.ar)
      if (permanent) labelled.add(st.ar)
      marker.bindTooltip(labelNode(st.ar), {
        permanent,
        direction: 'top',
        offset: [0, -6],
        className: permanent ? 'geo-label geo-label-strong' : 'geo-label',
      })
    }
  }, [route, from, to])

  // رحلة جديدة → الخريطة بتقرّب عليها
  useEffect(() => {
    const map = mapRef.current
    if (!map || !route) return
    fitTo(map, routeGeo(route).points, { pad: 48, maxZoom: 15, animate: !reduceMotion() })
  }, [route])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border-2 border-ink">
      {/* Leaflet مبني على LTR — الحاوية واخدة ltr، والكلام جواها بيتعزل RTL */}
      <div
        ref={el}
        dir="ltr"
        role="region"
        aria-label="خريطة جغرافية لمترو القاهرة والمونوريل والقطار الخفيف"
        aria-describedby="geo-map-desc"
        className="geo-map h-full w-full"
      />
      <p id="geo-map-desc" className="sr-only">
        المحطات في أماكنها الحقيقية فوق خريطة الشوارع. تقدر تختار المحطات من خانتي «من محطة» و«إلى
        محطة»، وخطوات الرحلة بتظهر في نتيجة الرحلة.
      </p>
      <MapLegend
        data-map-legend
        planned={false}
        className="pointer-events-none absolute end-3 top-3 z-[1000]"
      />
    </div>
  )
}

export default memo(GeoMap)
