import { LINES } from '../data/metro.js'

/** مفتاح الخطوط — مشترك بين الخريطة التخطيطية والجغرافية */
export default function MapLegend({ planned = true, className = '', ...rest }) {
  return (
    <ul
      {...rest}
      className={`flex max-w-[calc(100%-1.5rem)] flex-wrap gap-x-3 gap-y-1 rounded-xl border-2 border-ink bg-card/95 px-3 py-2 text-xs font-medium ${className}`}
    >
      {Object.values(LINES).map((l) => (
        <li key={l.id} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-5 rounded-full"
            style={{
              background: l.color,
              backgroundImage:
                l.mode === 'lrt'
                  ? 'repeating-linear-gradient(90deg, transparent 0 3px, #fbf8f1 3px 6px)'
                  : undefined,
              backgroundSize: l.mode === 'lrt' ? '100% 2px' : undefined,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
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
      {planned && (
        <li className="flex items-center gap-1.5 opacity-70">
          <span className="inline-block w-5 border-t-[3px] border-dashed border-[#189ca6]" />
          تحت الإنشاء
        </li>
      )}
    </ul>
  )
}
