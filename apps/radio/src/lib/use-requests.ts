import { useCallback, useEffect, useState } from "react"
import type { RequestApi, TrackRequest } from "./request-client"

const POLL_MS = 20_000

// My-requests state: an initial load, a light poll (no per-user SSE — spec
// §7), and a refresh() for request-submitted / queue-frame nudges.
export function useRequests(
  api: RequestApi,
  token: string | null,
): { requests: TrackRequest[]; refresh(): void } {
  const [requests, setRequests] = useState<TrackRequest[]>([])
  const [nonce, setNonce] = useState(0)

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce is a bump trigger for refresh(), not read in the body
  useEffect(() => {
    if (!token) {
      setRequests([])
      return
    }
    let alive = true
    const load = () =>
      api
        .myRequests(token)
        .then((rs) => {
          if (alive) setRequests(rs)
        })
        .catch(() => {}) // best effort; next poll retries
    void load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [api, token, nonce])

  return { requests, refresh }
}
