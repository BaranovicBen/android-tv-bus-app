import { useEffect, useRef, useState } from 'react'

export type Departure = {
  routeShortName: string
  headsign: string
  scheduled: string
  adjusted?: string
  delaySec?: number
  source: 'LIVE' | 'PLAN'
}
export type DeparturesPayload = {
  stopId: string
  updatedAt: string
  departures: Departure[]
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export function useDepartures(stopId: string) {
  const [data, setData] = useState<DeparturesPayload | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const timer = useRef<number | null>(null)

  async function load() {
    try {
      setErr(null)
      const r = await fetch(`${API_URL}/api/departures/${encodeURIComponent(stopId)}`)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      setData(await r.json())
    } catch (e: any) {
      setErr(e.message || 'error')
    }
  }

  useEffect(() => {
    load()
    const poll = setInterval(load, 10_000) // online refresh
    return () => clearInterval(poll)
  }, [stopId])

  // 1s re-render pre plynulý countdown
  useEffect(() => {
    timer.current && clearInterval(timer.current)
    timer.current = window.setInterval(() => setTick(t => t + 1), 1000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [])

  return { data, err }
}

export function nextDeparture(data: DeparturesPayload | null) {
  if (!data?.departures?.length) return null
  return data.departures[0]
}

export function minsLeft(iso: string) {
  const delta = new Date(iso).getTime() - Date.now()
  return Math.floor(delta / 60000)
}

export function fmtHM(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}