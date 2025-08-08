import React, { useEffect, useMemo, useState } from 'react'
import { useDepartures, nextDeparture, minsLeft, fmtHM } from './useDepartures'

function useQuery() { return new URLSearchParams(window.location.search) }
type ScreenMode = 'COUNTDOWN' | 'CLOCK'

export default function App() {
  const q = useQuery()
  const stopId = q.get('stop') || '1234'
  const stopName = q.get('name') || 'Chorvátsky Grob – Čierna Voda'

  const { data, err } = useDepartures(stopId)
  const dep = useMemo(() => nextDeparture(data), [data])

  // Auto-rotate každých 15 s
  const [mode, setMode] = useState<ScreenMode>('COUNTDOWN')
  useEffect(() => {
    const t = setInterval(() => setMode(m => m === 'COUNTDOWN' ? 'CLOCK' : 'COUNTDOWN'), 15000)
    return () => clearInterval(t)
  }, [])

  const badge = dep?.source === 'LIVE'
    ? <span className="badge live">LIVE</span>
    : <span className="badge plan">PLÁN</span>

  // Čas a status
  const t = dep?.adjusted ?? dep?.scheduled
  const m = t ? minsLeft(t) : null
  const arriving = t ? (new Date(t).getTime() - Date.now()) <= 30_000 : false
  const late = dep?.source === 'LIVE' && (dep?.delaySec ?? 0) > 60

  // Trasa (buď z API do dep.viaText, alebo z URL ?via=Chorvatsky%20Grob%20-%20Slovensky%20Grob%20-%20Vinicne%20-%20Pezinok)
  const viaText = (dep as any)?.viaText || q.get('via') || ''

  return (
    <div className="wrap">
      <div className="screen fade">
        <div className="row">
          <div>
            <div className="title">{stopName} {badge}</div>
            <div className="subtitle">
              {err ? ('Chyba: ' + err) : ('Aktualizované: ' + (data?.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : '—'))}
            </div>
          </div>
          {/* žiadne manuálne tlačidlá */}
        </div>

        {mode === 'COUNTDOWN' && (
          <div className="fade">
            <div className="label">Autobus tu bude za:</div>
            <div className={'big ' + (late ? 'late' : '')}>
              {arriving ? 'prichádza' : (m !== null ? `${m} min` : '—')}
            </div>
            <div className="label">Smer:</div>
            <div className="direction">{dep?.headsign || '—'}</div>
            {viaText && <>
              <div className="label">Trasa:</div>
              <div className="direction">{viaText}</div>
            </>}
          </div>
        )}

        {mode === 'CLOCK' && (
          <div className="fade">
            <div className="label">Autobus má prísť:</div>
            <div className="clock">{t ? fmtHM(t) : '—'}</div>
            <div className="label">Smer:</div>
            <div className="direction">{dep?.headsign || '—'}</div>
            {viaText && <>
              <div className="label">Trasa:</div>
              <div className="direction">{viaText}</div>
            </>}
          </div>
        )}

        <img className="lion" src="/lion.png" alt="lion" />
      </div>
    </div>
  )
}