import { useState } from 'react'
import { STATIONS } from '../data/metro.js'
import { COORDS } from '../data/coords.js'
import { nearestStation, geoErrorMessage, formatDistance, FAR_KM } from '../lib/geo.js'

/**
 * زر «موقعي»: بيجيب موقع المستخدم من المتصفح ويختار أقرب محطة.
 * الموقع بيتحسب في المتصفح بس، ومابيتبعتش لأي سيرفر ولا بيتخزّن.
 */
export default function LocateButton({ onLocate }) {
  // status: idle | locating | done | error
  const [state, setState] = useState({ status: 'idle', message: '' })

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'error', message: geoErrorMessage('unsupported') })
      return
    }
    setState({ status: 'locating', message: 'بنحدد موقعك…' })
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const near = nearestStation({ lat: coords.latitude, lng: coords.longitude }, COORDS)
        if (!near) return setState({ status: 'error', message: geoErrorMessage(2) })
        const name = STATIONS[near.id].ar
        if (near.km > FAR_KM) {
          // بعيد قوي: غالبًا برّه القاهرة أو الموقع مش دقيق — مش هنختار بالنيابة عنه
          return setState({
            status: 'error',
            message: `مفيش محطة مترو قريبة منك. أقربها ${name}، على بعد ${formatDistance(near.km)} (خط مستقيم). اختار المحطة بنفسك.`,
          })
        }
        onLocate(near.id)
        setState({
          status: 'done',
          message: `أقرب محطة ليك: ${name}، على بعد حوالي ${formatDistance(near.km)} (خط مستقيم).`,
        })
      },
      (err) => setState({ status: 'error', message: geoErrorMessage(err.code) }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }

  const busy = state.status === 'locating'

  return (
    <>
      <button
        type="button"
        onClick={locate}
        disabled={busy}
        aria-describedby={state.message ? 'locate-status' : undefined}
        title="موقعك بيتحسب على جهازك بس ومابيتبعتش لأي حد"
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-0.5 text-xs font-medium transition-colors hover:bg-saffron/40 disabled:opacity-50"
      >
        <span aria-hidden="true">{busy ? '⏳' : '📍'}</span>
        {busy ? 'بندوّر…' : 'موقعي'}
      </button>
      {state.message && (
        <p
          id="locate-status"
          role={state.status === 'error' ? 'alert' : 'status'}
          className={`order-last basis-full text-xs ${state.status === 'error' ? 'text-danger' : 'text-ink-soft'}`}
        >
          {state.message}
        </p>
      )}
    </>
  )
}
