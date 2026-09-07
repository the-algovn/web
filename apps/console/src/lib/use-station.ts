import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { radioCall } from "./api"
import type { Station, StationResponse, StationStats } from "./radio"

export interface StationAdmin {
  station: Station | null
  stats: StationStats | null
  loading: boolean
  busy: boolean
  goOnAir(): Promise<void>
  goOffAir(): Promise<void>
  setAIEnabled(enabled: boolean): Promise<void>
  refresh(): void
}

export interface UseStationOptions {
  pollMs?: number
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// The operator's master row: on-air state, listener count, spend, AI pause.
export function useStation(token: string | null, opts: UseStationOptions = {}): StationAdmin {
  const pollMs = opts.pollMs ?? 10_000
  const [station, setStation] = useState<Station | null>(null)
  const [stats, setStats] = useState<StationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [nonce, setNonce] = useState(0)
  const tokenRef = useRef(token)
  tokenRef.current = token

  const loadAdmin = useCallback(async () => {
    const t = tokenRef.current
    if (!t) return
    try {
      const st = await radioCall<StationResponse>(t, "/station")
      setStation(st.station ?? {})
      setStats(st.stats ?? {})
    } catch (e) {
      toast.error(msg(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce is a bump trigger for refresh(), not read in the body
  useEffect(() => {
    if (!token) return
    void loadAdmin()
    const timer = setInterval(() => void loadAdmin(), pollMs)
    return () => clearInterval(timer)
  }, [token, nonce, pollMs, loadAdmin])

  const run = useCallback(async (fn: () => Promise<void>) => {
    if (!tokenRef.current) return
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      toast.error(msg(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const stationAction = useCallback(
    (path: string, body?: unknown) =>
      run(async () => {
        const r = await radioCall<StationResponse>(tokenRef.current ?? "", path, body)
        setStation(r.station ?? {})
        if (r.stats) setStats(r.stats)
      }),
    [run],
  )

  const goOnAir = useCallback(() => stationAction("/station/on-air", {}), [stationAction])
  const goOffAir = useCallback(() => stationAction("/station/off-air", {}), [stationAction])
  const setAIEnabled = useCallback(
    (enabled: boolean) => stationAction("/station/ai", { enabled }),
    [stationAction],
  )

  return { station, stats, loading, busy, goOnAir, goOffAir, setAIEnabled, refresh }
}
