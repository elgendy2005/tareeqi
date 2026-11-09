import { useEffect, useMemo, useRef, useState } from 'react'
import { STATIONS, FARE_EFFECTIVE } from './data/metro.js'
import { findRoute } from './lib/router.js'
import StationPicker from './components/StationPicker.jsx'
import MetroMap from './components/MetroMap.jsx'
import RouteResult from './components/RouteResult.jsx'
import LocateButton from './components/LocateButton.jsx'
import { addRecent, loadRecent, saveRecent } from './lib/recent.js'

const isStation = (id) => Boolean(id && STATIONS[id])

const EXAMPLES = [
  ['maadi', 'opera'],
  ['helwan', 'new-el-marg'],
  ['ain-shams', 'cairo-university'],
  ['imbaba', 'heliopolis-square'],
  ['attaba', 'm-justice-city'],
]

function readUrl() {
  const p = new URLSearchParams(window.location.search)
  const ok = (id) => (id && STATIONS[id] ? id : null)
  return { from: ok(p.get('from')), to: ok(p.get('to')) }
}

export default function App() {
  const [{ from, to }, setPair] = useState(readUrl)
  const [copied, setCopied] = useState(false)

  const setFrom = (id) => setPair((p) => ({ ...p, from: id }))
  const setTo = (id) => setPair((p) => ({ ...p, to: id }))
  const swap = () => setPair((p) => ({ from: p.to, to: p.from }))

  // الرابط بيتحدّث تلقائي عشان تقدر تشارك الرحلة
  useEffect(() => {
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [from, to])

  const route = useMemo(() => (from && to ? findRoute(from, to) : null), [from, to])

  // آخر 5 رحلات — على الجهاز بس (localStorage)
  const [recent, setRecent] = useState(() => loadRecent(isStation))
  // لما الرحلة تتغيّر بنضيفها أثناء الـ render (النمط اللي React بتنصح بيه بدل setState جوه effect)
  const routeKey = route ? `${route.from}>${route.to}` : null
  const [seenKey, setSeenKey] = useState(null)
  if (routeKey !== seenKey) {
    setSeenKey(routeKey)
    if (route) setRecent((prev) => addRecent(prev, { from: route.from, to: route.to }))
  }
  // الـ effect بيكتب في localStorage بس (نظام خارجي)
  useEffect(() => saveRecent(recent), [recent])
  const clearRecent = () => setRecent([])

  // ضغطة على محطة في الخريطة: أول ضغطة = من، تاني ضغطة = إلى، وبعدها نبدأ من جديد
  const onStationClick = (id) => {
    // تاني ضغطة بتكمّل الرحلة → على الموبايل نطلع للنتيجة (هي فوق الخريطة)
    if (from && !to && id !== from) scrollToResult.current = true
    setPair((p) => {
      if (!p.from || (p.from && p.to)) return { from: id, to: null }
      if (id === p.from) return p
      return { ...p, to: id }
    })
  }

  const resultRef = useRef(null)
  const scrollToResult = useRef(false)
  useEffect(() => {
    if (!scrollToResult.current || !route) return
    scrollToResult.current = false
    if (!window.matchMedia('(max-width: 1023px)').matches) return // على الديسكتوب النتيجة جنب الخريطة
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    resultRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [route])

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* الـ clipboard مش متاح — مفيش مشكلة */
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[1400px] flex-col px-4 pb-6 pt-5 lg:px-8">
      <header className="mb-5 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="./favicon.svg" alt="" className="h-11 w-11" />
          <div>
            <h1 className="text-3xl font-bold leading-none">طريقي</h1>
            <p className="mt-1 text-sm text-ink-soft">
              مخطط مترو القاهرة والمونوريل · أقصر مسار وسعر التذكرة
            </p>
          </div>
        </div>
        <span className="hidden rounded-full border-2 border-ink px-3 py-1 text-xs font-medium sm:inline">
          الخطوط ١ و٢ و٣ + المونوريل
        </span>
      </header>

      <main className="grid flex-1 content-start gap-5 lg:grid-cols-[minmax(340px,430px)_1fr]">
        {/* ---------- الاختيار ---------- */}
        <div className="order-1 lg:order-none lg:col-start-1 lg:row-start-1">
          <div className="rounded-2xl border-2 border-ink bg-card p-4">
            <div className="space-y-3">
              <StationPicker
                label="من محطة"
                value={from}
                onChange={setFrom}
                action={<LocateButton onLocate={setFrom} />}
                placeholder="اكتب اسم المحطة…"
                marker={
                  <span
                    className="inline-block h-3 w-3 rounded-full border-[3px] border-saffron bg-ink"
                    aria-hidden="true"
                  />
                }
              />
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={swap}
                  disabled={!from && !to}
                  className="rounded-full border-2 border-ink px-4 py-1 text-sm font-medium transition-colors hover:bg-saffron/40 disabled:opacity-40"
                >
                  ⇅ اعكس الاتجاه
                </button>
              </div>
              <StationPicker
                label="إلى محطة"
                value={to}
                onChange={setTo}
                placeholder="اكتب اسم المحطة…"
                marker={
                  <span
                    className="inline-block h-3 w-3 rounded-full border-[3px] border-ink bg-saffron"
                    aria-hidden="true"
                  />
                }
              />
            </div>
            {route && (
              <button
                type="button"
                onClick={share}
                className="mt-4 w-full rounded-xl border-2 border-ink bg-ink px-4 py-2.5 font-medium text-paper transition-colors hover:bg-ink/85"
              >
                {copied ? 'اتنسخ الرابط ✓' : 'انسخ رابط الرحلة'}
              </button>
            )}
          </div>
        </div>

        {/* ---------- الخريطة ---------- */}
        <div className="order-3 h-[55vh] min-h-[360px] lg:order-none lg:sticky lg:top-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[calc(100vh-7.5rem)]">
          <MetroMap route={route} from={from} to={to} onStationClick={onStationClick} />
        </div>

        {/* ---------- النتيجة ---------- */}
        <div
          ref={resultRef}
          className="order-2 scroll-mt-4 lg:order-none lg:col-start-1 lg:row-start-2"
        >
          {route ? (
            <RouteResult route={route} />
          ) : from && to && from === to ? (
            <p className="rounded-2xl border-2 border-dashed border-ink/40 p-4 text-ink-soft">
              محطة البداية والنهاية نفس بعض 🙂 اختار محطتين مختلفتين.
            </p>
          ) : from && to ? (
            // الشبكة متصلة فده مش متوقع، بس لو البيانات اتغيّرت مانسيبش المستخدم من غير رد
            <p
              role="alert"
              className="rounded-2xl border-2 border-dashed border-danger/60 p-4 text-danger"
            >
              معرفناش نلاقي مسار بين المحطتين دول. جرّب محطة قريبة، أو بلّغنا لو شايف إن فيه مسار.
            </p>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-ink/40 p-4">
              <p className="font-medium">اختار محطتين، أو دوس عليهم في الخريطة.</p>
              {recent.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-ink-soft">آخر رحلاتك:</p>
                    <button
                      type="button"
                      onClick={clearRecent}
                      className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
                    >
                      امسح
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recent.map((t) => (
                      <button
                        key={t.from + '>' + t.to}
                        type="button"
                        onClick={() => setPair({ from: t.from, to: t.to })}
                        className="rounded-full border-2 border-ink bg-saffron/30 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-saffron/60"
                      >
                        {STATIONS[t.from].ar} ← {STATIONS[t.to].ar}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-3 text-sm text-ink-soft">جرّب مثال سريع:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLES.map(([a, b]) => (
                  <button
                    key={a + b}
                    type="button"
                    onClick={() => setPair({ from: a, to: b })}
                    className="rounded-full border-2 border-ink bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-saffron/40"
                  >
                    {STATIONS[a].ar} ← {STATIONS[b].ar}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-6 text-center text-xs text-ink-soft">
        الخريطة تخطيطية مش جغرافية · أسعار التذاكر: وزارة النقل (سارية من {FARE_EFFECTIVE}) ·
        إحداثيات المحطات: ©{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          مساهمو OpenStreetMap
        </a>{' '}
        · مشروع مفتوح المصدر
      </footer>
    </div>
  )
}
