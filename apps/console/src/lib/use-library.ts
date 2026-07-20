import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { labCall } from "./api"
import { PAGE_SIZE, type Track } from "./media"

interface ListResponse {
  tracks?: Track[]
  total?: string | number
}

export interface LibraryState {
  query: string
  page: number
  tracks: Track[]
  total: number
  loading: boolean
  pending: Record<string, true>
  setQuery: (q: string) => void
  setPage: (p: number) => void
  refresh: () => void
  del: (ytId: string) => Promise<void>
}

export function useLibrary(token: string | null): LibraryState {
  const [query, setQueryState] = useState("") // immediate, controlled input
  const [debounced, setDebounced] = useState("") // committed query
  const [page, setPage] = useState(0)
  const [tracks, setTracks] = useState<Track[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<Record<string, true>>({})
  const reqId = useRef(0)

  // Commit the query after 300ms of quiet and reset to page 0 together, so a
  // keystroke never fetches at the old query and produces exactly one refetch.
  useEffect(() => {
    const h = setTimeout(() => {
      setDebounced(query)
      setPage(0)
    }, 300)
    return () => clearTimeout(h)
  }, [query])

  const fetchPage = useCallback(
    async (q: string, p: number) => {
      if (!token) return
      const id = ++reqId.current
      setLoading(true)
      try {
        const r = await labCall<ListResponse>(token, "/library/list", {
          query: q,
          limit: PAGE_SIZE,
          offset: p * PAGE_SIZE,
        })
        if (id !== reqId.current) return // stale response — a newer fetch won
        setTracks(r.tracks ?? [])
        setTotal(Number(r.total ?? 0))
      } catch (e) {
        if (id !== reqId.current) return
        toast.error(e instanceof Error ? e.message : String(e))
      } finally {
        if (id === reqId.current) setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    void fetchPage(debounced, page)
  }, [fetchPage, debounced, page])

  const refresh = useCallback(() => {
    void fetchPage(debounced, page)
  }, [fetchPage, debounced, page])

  const del = useCallback(
    async (ytId: string) => {
      if (!token) return
      setPending((b) => ({ ...b, [ytId]: true }))
      try {
        await labCall(token, "/library/delete", { ytId })
        setPending((b) => {
          const next = { ...b }
          delete next[ytId]
          return next
        })
        if (page > 0 && tracks.length === 1) {
          setPage(page - 1) // page-change effect refetches the now-valid page
        } else {
          await fetchPage(debounced, page)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e))
        setPending((b) => {
          const next = { ...b }
          delete next[ytId]
          return next
        })
      }
    },
    [token, page, tracks.length, debounced, fetchPage],
  )

  const setQuery = useCallback((q: string) => setQueryState(q), [])

  return {
    query,
    page,
    tracks,
    total,
    loading,
    pending,
    setQuery,
    setPage,
    refresh,
    del,
  }
}
