import { STATIONS, LINES, FARE_EFFECTIVE } from '../data/metro.js'

const n = (v) => Number(v).toLocaleString('ar-EG')
const name = (id) => STATIONS[id].ar

function stopsText(count) {
  if (count === 1) return 'محطة واحدة'
  if (count === 2) return 'محطتين'
  if (count <= 10) return `${n(count)} محطات`
  return `${n(count)} محطة`
}

function Stat({ value, label }) {
  return (
    <div className="flex-1 rounded-xl bg-card px-3 py-2.5 text-center">
      <div className="text-2xl font-bold leading-tight">{value}</div>
      <div className="text-xs text-ink-soft">{label}</div>
    </div>
  )
}

export default function RouteResult({ route }) {
  const { legs, stops, transfers, fare, minutes, fareOverMax } = route
  const first = legs[0]
  const last = legs[legs.length - 1]

  return (
    <section aria-live="polite" className="space-y-4">
      {/* التذكرة */}
      <div className="ticket rounded-2xl border-2 border-ink p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-ink/70">سعر التذكرة</div>
            <div className="text-5xl font-bold leading-none">
              {n(fare)} <span className="text-xl font-medium">جنيه</span>
            </div>
          </div>
          <div className="text-end text-sm font-medium text-ink/80">
            <div>{name(first.from)}</div>
            <div aria-hidden="true">↓</div>
            <div>{name(last.to)}</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Stat value={n(stops)} label="محطة" />
          <Stat value={n(transfers)} label={transfers === 1 ? 'تحويلة' : 'تحويلات'} />
          <Stat value={`~${n(minutes)}`} label="دقيقة" />
        </div>
      </div>

      {/* الخطوات */}
      <ol className="space-y-3">
        {legs.map((leg, i) => {
          const line = LINES[leg.line]
          const middle = leg.stations.slice(1, -1)
          return (
            <li key={i}>
              {i > 0 && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border-2 border-dashed border-ink/40 bg-paper-2 px-3 py-2 text-sm font-medium">
                  <span aria-hidden="true">🔄</span>
                  {leg.changeKind === 'train' ? (
                    <>
                      غيّر القطار في <b>{name(leg.from)}</b> واركب قطار{' '}
                      {leg.direction === 'جامعة القاهرة' ? 'جامعة القاهرة' : 'محور روض الفرج'}
                    </>
                  ) : (
                    <>
                      غيّر في <b>{name(leg.from)}</b> للـ{line.ar}
                    </>
                  )}
                </div>
              )}
              <div className="overflow-hidden rounded-2xl border-2 border-ink bg-card">
                <div
                  className="flex items-center justify-between px-4 py-2 text-sm font-bold text-white"
                  style={{ background: line.color }}
                >
                  <span>{line.ar}</span>
                  <span className="font-medium">اتجاه {leg.direction}</span>
                </div>
                <div className="space-y-2 px-4 py-3">
                  <p className="leading-relaxed">
                    اركب من <b>{name(leg.from)}</b> وانزل في <b>{name(leg.to)}</b>
                    <span className="text-ink-soft"> بعد {stopsText(leg.stops)}</span>
                  </p>
                  {middle.length > 0 && (
                    <details>
                      <summary className="text-sm font-medium text-ink-soft underline decoration-dotted underline-offset-4">
                        المحطات اللي في السكة ({n(middle.length)})
                      </summary>
                      <ol
                        className="relative mt-3 ms-2 space-y-2 border-s-4 ps-4"
                        style={{ borderColor: line.color }}
                      >
                        {middle.map((id) => (
                          <li key={id} className="text-sm">
                            {name(id)}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <p className="text-xs leading-relaxed text-ink-soft">
        {fareOverMax && 'الرحلة أطول من آخر شريحة؛ اتحسب عليها أعلى سعر. '}
        السعر حسب شرائح عدد المحطات المعلنة من وزارة النقل (سارية من {FARE_EFFECTIVE}). عدد المحطات
        بيتحسب من محطة الركوب لحد محطة النزول. الوقت تقريبي، والجدول الفعلي بيتغير حسب الزحمة
        والتشغيل.
      </p>
    </section>
  )
}
