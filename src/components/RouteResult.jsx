import { useRef } from 'react'
import { STATIONS, LINES, FARE_SYSTEMS, FARE_CATEGORIES } from '../data/metro.js'
import { modeAt, routeFare } from '../lib/router.js'
import { minutesText, n, stopsText } from '../lib/format.js'

const CATEGORY_KEYS = Object.keys(FARE_CATEGORIES)

/**
 * نوع التذكرة: radiogroup بنمط WAI-ARIA — زرار واحد بس في ترتيب الـ Tab (المختار)،
 * والأسهم بتنقل وتختار. الواجهة RTL، فالسهم الشمال = اللي بعده.
 */
function CategoryPicker({ value, onChange }) {
  const refs = useRef({})
  const onKeyDown = (e) => {
    const step = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 }[e.key]
    let i = CATEGORY_KEYS.indexOf(value)
    if (step) i = (i + step + CATEGORY_KEYS.length) % CATEGORY_KEYS.length
    else if (e.key === 'Home') i = 0
    else if (e.key === 'End') i = CATEGORY_KEYS.length - 1
    else return
    e.preventDefault()
    onChange(CATEGORY_KEYS[i])
    refs.current[CATEGORY_KEYS[i]]?.focus()
  }
  return (
    <div
      role="radiogroup"
      aria-label="نوع التذكرة"
      onKeyDown={onKeyDown}
      className="mt-3 flex flex-wrap gap-1.5"
    >
      {Object.entries(FARE_CATEGORIES).map(([key, c]) => (
        <button
          key={key}
          ref={(el) => {
            refs.current[key] = el
          }}
          type="button"
          role="radio"
          aria-checked={value === key}
          tabIndex={value === key ? 0 : -1}
          title={c.hint}
          onClick={() => onChange(key)}
          className={`rounded-full border-2 border-ink px-3 py-1 text-xs font-medium transition active:scale-95 ${value === key ? 'bg-ink text-paper' : 'bg-card/70 hover:bg-card'}`}
        >
          {c.ar}
        </button>
      ))}
    </div>
  )
}

const name = (id) => STATIONS[id].ar
const modeWord = (id) => FARE_SYSTEMS[modeAt(id)].ar // «مترو» / «مونوريل»

// خلفية عنوان الخط: نفس لون الخط بس أغمق، عشان النص الأبيض يعدّي 4.5:1
// (الأبيض على لون المونوريل كان 3.3:1 وعلى الخط 3 كان 4.1:1)
const headerBg = (color) => `color-mix(in srgb, ${color} 75%, black)`

function Stat({ value, label }) {
  return (
    <div className="flex-1 rounded-xl bg-card px-3 py-2.5 text-center transition-transform hover:-translate-y-0.5">
      <div className="text-2xl font-bold leading-tight">{value}</div>
      <div className="text-xs text-ink-soft">{label}</div>
    </div>
  )
}

/** صندوق التحويل/المشي بين الرحلات */
function Change({ children, icon = '🔄' }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border-2 border-dashed border-ink/40 bg-paper-2 px-3 py-2 text-sm font-medium leading-relaxed">
      <span aria-hidden="true" className={icon === '🚶' ? 'anim-walk' : 'anim-spin-once'}>
        {icon}
      </span>
      <span>{children}</span>
    </div>
  )
}

function Walk({ walk, nextMode }) {
  return (
    <Change icon="🚶">
      امشي من محطة {modeWord(walk.from)} <b>{name(walk.from)}</b> لمحطة {modeWord(walk.to)}{' '}
      <b>{name(walk.to)}</b>، حوالي {minutesText(walk.minutes)} (تقدير).
      {nextMode && nextMode !== modeAt(walk.from) && (
        <span className="block text-ink-soft">
          هتحتاج تذكرة {FARE_SYSTEMS[nextMode].ar} منفصلة.
        </span>
      )}
    </Change>
  )
}

/**
 * تفاصيل الرحلة. نوع التذكرة (`category`) متخزّن في App عشان ملخص الـ aria-live هناك يقول السعر الصح.
 * الإعلان لقارئ الشاشة مش هنا: المكوّن ده بيتركّب مع أول رحلة، ومنطقة live لازم تكون موجودة قبل التغيير.
 */
export default function RouteResult({ route, category = 'regular', onCategoryChange }) {
  const {
    legs,
    tickets: baseTickets,
    fareStations,
    transfers,
    minutes,
    fareOverMax,
    walkAfter,
  } = route
  const priced = routeFare(route, category)
  const tickets = priced.tickets
  const fare = priced.total
  const multi = baseTickets.length > 1
  // الوسائل غير المترو اللي في الرحلة (عشان نوضّح الافتراضات بتاعتها)
  const modes = new Set([...tickets.map((t) => t.mode), modeAt(route.from), modeAt(route.to)])

  return (
    <section aria-labelledby="result-title" className="space-y-4">
      <h2 id="result-title" className="sr-only">
        نتيجة الرحلة
      </h2>
      {/* التذكرة */}
      <div className="ticket ticket-shine anim-rise rounded-2xl border-2 border-ink p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-ink/75">
              {tickets.length === 0 ? 'مفيش تذكرة' : multi ? 'إجمالي التذاكر' : 'سعر التذكرة'}
            </div>
            {/* الـ key: السعر بيتختم من جديد كل ما يتغيّر (رحلة أو نوع تذكرة) */}
            <div key={`${fare}-${category}`} className="anim-stamp text-5xl font-bold leading-none">
              {n(fare)} <span className="text-xl font-medium">جنيه</span>
            </div>
          </div>
          <div className="text-end text-sm font-medium text-ink/80">
            <div>{name(route.from)}</div>
            <div aria-hidden="true">↓</div>
            <div>{name(route.to)}</div>
          </div>
        </div>
        {baseTickets.length > 0 && <CategoryPicker value={category} onChange={onCategoryChange} />}
        {category !== 'regular' && (
          <p className="mt-2 text-xs text-ink/75">
            {FARE_CATEGORIES[category].hint}.
            {priced.missingDiscount && ' الـ LRT مالوش سعر مخفض معلن، فاتحسب بالسعر العادي.'}
          </p>
        )}
        {multi && (
          <ul className="mt-3 space-y-1 text-sm font-medium" aria-label="التذاكر">
            {tickets.map((t, i) => (
              <li key={i} className="flex justify-between gap-2 rounded-lg bg-card/70 px-3 py-1.5">
                <span>
                  تذكرة {FARE_SYSTEMS[t.mode].ar} · {stopsText(t.stations)}
                </span>
                <span>{n(t.price)} جنيه</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <Stat
            value={
              fareStations != null
                ? n(fareStations)
                : tickets.length
                  ? tickets.map((t) => n(t.stations)).join(' + ')
                  : '—'
            }
            label="محطة"
          />
          <Stat value={n(transfers)} label={transfers === 1 ? 'تحويلة' : 'تحويلات'} />
          <Stat value={`~${n(minutes)}`} label="دقيقة" />
        </div>
      </div>

      {/* الخطوات */}
      <ol className="space-y-3" aria-label="خطوات الرحلة">
        {legs.map((leg, i) => {
          const line = LINES[leg.line]
          const middle = leg.stations.slice(1, -1)
          return (
            <li key={i} className="anim-rise" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
              {leg.walkBefore ? (
                <Walk walk={leg.walkBefore} nextMode={leg.mode} />
              ) : (
                i > 0 && (
                  <Change>
                    {leg.changeKind === 'train' ? (
                      <>
                        غيّر القطار في <b>{name(leg.from)}</b> واركب قطار اتجاه {leg.direction}
                      </>
                    ) : (
                      <>
                        غيّر في <b>{name(leg.from)}</b> للـ{line.ar}
                      </>
                    )}
                  </Change>
                )
              )}
              <div className="overflow-hidden rounded-2xl border-2 border-ink bg-card">
                <div
                  className="flex items-center justify-between px-4 py-2 text-sm font-bold text-white"
                  style={{ background: headerBg(line.color) }}
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
        {walkAfter && (
          <li className="anim-rise" style={{ animationDelay: `${0.15 + legs.length * 0.12}s` }}>
            <Walk walk={walkAfter} />
          </li>
        )}
      </ol>

      <p className="text-xs leading-relaxed text-ink-soft">
        {fareOverMax && 'الرحلة أطول من آخر شريحة؛ اتحسب عليها أعلى سعر. '}
        سعر المترو حسب شرائح عدد المحطات المعلنة من وزارة النقل (سارية من{' '}
        {FARE_SYSTEMS.metro.effective}). عدد المحطات بيتحسب من محطة الركوب لحد محطة النزول، والاتنين
        محسوبين. الوقت تقريبي، والجدول الفعلي بيتغير حسب الزحمة والتشغيل.
        {modes.has('monorail') && (
          <>
            {' '}
            المونوريل ليه تذكرة لوحده بشرائحه (سارية من {FARE_SYSTEMS.monorail.effective}). ده
            افتراض لأن مفيش تذكرة موحدة معلنة، وزمن المونوريل تقديري.
          </>
        )}
        {modes.has('lrt') && (
          <>
            {' '}
            الـ LRT ليه تذكرة لوحده بشرائحه (حتى 3 محطات / حتى 7 / أكتر)، وزمنه تقديري. وفرع العاشر
            (مدينة المعرفة) قطار مكوكي من بدر.
          </>
        )}
        {(modes.has('monorail') || modes.has('lrt')) && ' مدة المشي بين المحطات المنفصلة تقديرية.'}
      </p>
    </section>
  )
}
