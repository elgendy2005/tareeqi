import { useId, useMemo, useRef, useState } from 'react'
import { STATIONS, LINES } from '../data/metro.js'
import { searchStations } from '../lib/search.js'
import { linesAt, modeAt } from '../lib/router.js'

const ALL = Object.values(STATIONS)

export function LineDots({ stationId }) {
  return (
    <span className="inline-flex gap-1" aria-hidden="true">
      {linesAt(stationId).map((l) => (
        <span
          key={l}
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: LINES[l].color }}
        />
      ))}
    </span>
  )
}

export default function StationPicker({ label, value, onChange, placeholder, marker, action }) {
  const uid = useId()
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const selected = value ? STATIONS[value] : null
  const results = useMemo(() => searchStations(ALL, query, 8), [query])

  const choose = (id) => {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && open && results[active]) {
      e.preventDefault()
      choose(results[active].id)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div className="relative">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <label
          htmlFor={`${uid}-input`}
          className="flex items-center gap-2 text-sm font-medium text-ink-soft"
        >
          {marker}
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          id={`${uid}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${uid}-list`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && results[active] ? `${uid}-opt-${results[active].id}` : undefined
          }
          autoComplete="off"
          value={open ? query : (selected?.ar ?? '')}
          placeholder={placeholder}
          onFocus={(e) => {
            setOpen(true)
            setQuery('')
            setActive(0)
            e.target.select()
          }}
          onBlur={() => {
            setOpen(false)
            setQuery('')
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          className="w-full rounded-xl border-2 border-ink/15 bg-card px-4 py-3 pe-11 text-lg font-medium outline-none transition-colors placeholder:font-normal placeholder:text-ink-soft/60 focus:border-ink"
        />
        {selected && (
          <button
            type="button"
            aria-label={`مسح ${label}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange(null)
              inputRef.current?.focus()
            }}
            className="absolute inset-y-0 end-2 my-auto h-8 w-8 rounded-full text-xl leading-none text-ink-soft hover:bg-ink/10"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <ul
          id={`${uid}-list`}
          role="listbox"
          className="absolute inset-x-0 z-30 mt-1 max-h-72 overflow-auto rounded-xl border-2 border-ink bg-card p-1 shadow-[4px_4px_0_0_rgb(29_27_22/0.9)]"
        >
          {results.length === 0 && <li className="px-3 py-3 text-ink-soft">مفيش محطة بالاسم ده</li>}
          {results.map((st, i) => (
            <li
              key={st.id}
              id={`${uid}-opt-${st.id}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(st.id)
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${i === active ? 'bg-saffron/40' : ''}`}
            >
              <span>
                <span className="font-medium">{st.ar}</span>
                <span dir="ltr" className="ms-2 text-sm text-ink-soft">
                  {st.en}
                </span>
                {modeAt(st.id) === 'monorail' && (
                  <span className="ms-2 rounded-full border border-ink/30 px-1.5 text-[11px] font-medium text-ink-soft">
                    مونوريل
                  </span>
                )}
              </span>
              <LineDots stationId={st.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
