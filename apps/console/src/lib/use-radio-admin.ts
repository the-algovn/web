import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { radioCall } from "./api"
import type {
  ListPlaylistsResponse,
  Playlist,
  PlaylistResponse,
  PlaylistSummary,
  Station,
  StationResponse,
  SummaryResponse,
} from "./radio"

export interface RadioAdmin {
  station: Station | null
  playlists: PlaylistSummary[]
  selectedId: string | null
  selected: Playlist | null
  loading: boolean
  busy: boolean
  select: (id: string | null) => void
  create: (name: string) => Promise<void>
  rename: (id: string, name: string) => Promise<void>
  removePlaylist: (id: string) => Promise<void>
  addTrack: (ytId: string) => Promise<void>
  removeTrack: (ytId: string) => Promise<void>
  reorder: (ytIds: string[]) => Promise<void>
  setActive: (id: string) => Promise<void>
  goOnAir: () => Promise<void>
  goOffAir: () => Promise<void>
  refresh: () => void
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function useRadioAdmin(token: string | null): RadioAdmin {
  const [station, setStation] = useState<Station | null>(null)
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Playlist | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const selectedIdRef = useRef<string | null>(null)
  selectedIdRef.current = selectedId

  const loadAll = useCallback(async () => {
    if (!token) return
    try {
      const [st, pl] = await Promise.all([
        radioCall<StationResponse>(token, "/station"),
        radioCall<ListPlaylistsResponse>(token, "/playlists"),
      ])
      setStation(st.station ?? {})
      setPlaylists(pl.playlists ?? [])
    } catch (e) {
      toast.error(msg(e))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const fetchSelected = useCallback(
    async (id: string) => {
      if (!token) return
      try {
        const r = await radioCall<PlaylistResponse>(token, "/playlists/get", { id })
        if (selectedIdRef.current === id) setSelected(r.playlist ?? null)
      } catch (e) {
        toast.error(msg(e))
      }
    },
    [token],
  )

  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id)
      setSelected(null)
      if (id) void fetchSelected(id)
    },
    [fetchSelected],
  )

  // run wraps a mutation: busy flag, toast on error, refresh of the
  // station+playlists snapshot afterwards (guards may have shifted).
  const run = useCallback(
    async (fn: () => Promise<void>) => {
      if (!token) return
      setBusy(true)
      try {
        await fn()
      } catch (e) {
        toast.error(msg(e))
      } finally {
        setBusy(false)
      }
    },
    [token],
  )

  // applyPlaylist folds a mutated playlist response into list + selection.
  const applyPlaylist = useCallback((p: Playlist | undefined) => {
    if (!p?.summary?.id) return
    const sum = p.summary
    setPlaylists((all) => all.map((x) => (x.id === sum.id ? sum : x)))
    if (selectedIdRef.current === sum.id) setSelected(p)
  }, [])

  const create = useCallback(
    (name: string) =>
      run(async () => {
        const r = await radioCall<SummaryResponse>(token ?? "", "/playlists/create", { name })
        await loadAll()
        if (r.summary?.id) select(r.summary.id)
      }),
    [run, token, loadAll, select],
  )

  const rename = useCallback(
    (id: string, name: string) =>
      run(async () => {
        const r = await radioCall<SummaryResponse>(token ?? "", "/playlists/rename", { id, name })
        const sum = r.summary
        if (sum?.id) {
          setPlaylists((all) => all.map((x) => (x.id === sum.id ? sum : x)))
          if (selectedIdRef.current === sum.id)
            setSelected((p) => (p ? { ...p, summary: sum } : p))
        }
      }),
    [run, token],
  )

  const removePlaylist = useCallback(
    (id: string) =>
      run(async () => {
        await radioCall(token ?? "", "/playlists/delete", { id })
        if (selectedIdRef.current === id) {
          setSelectedId(null)
          setSelected(null)
        }
        await loadAll()
      }),
    [run, token, loadAll],
  )

  const addTrack = useCallback(
    (ytId: string) =>
      run(async () => {
        const id = selectedIdRef.current
        if (!id) return
        const r = await radioCall<PlaylistResponse>(token ?? "", "/playlists/add-track", {
          playlistId: id,
          ytId,
        })
        applyPlaylist(r.playlist)
      }),
    [run, token, applyPlaylist],
  )

  const removeTrack = useCallback(
    (ytId: string) =>
      run(async () => {
        const id = selectedIdRef.current
        if (!id) return
        const r = await radioCall<PlaylistResponse>(token ?? "", "/playlists/remove-track", {
          playlistId: id,
          ytId,
        })
        applyPlaylist(r.playlist)
      }),
    [run, token, applyPlaylist],
  )

  const reorder = useCallback(
    (ytIds: string[]) =>
      run(async () => {
        const id = selectedIdRef.current
        if (!id) return
        // optimistic: apply the new order locally first
        setSelected((p) => {
          if (!p?.tracks) return p
          const byId = new Map(p.tracks.map((t) => [t.ytId ?? "", t]))
          const next = ytIds.flatMap((yt) => {
            const t = byId.get(yt)
            return t ? [t] : []
          })
          return { ...p, tracks: next }
        })
        try {
          const r = await radioCall<PlaylistResponse>(token ?? "", "/playlists/reorder", {
            playlistId: id,
            ytIds,
          })
          applyPlaylist(r.playlist)
        } catch (e) {
          await fetchSelected(id) // rollback to server truth
          throw e
        }
      }),
    [run, token, applyPlaylist, fetchSelected],
  )

  const stationAction = useCallback(
    (path: string, body?: unknown) =>
      run(async () => {
        const r = await radioCall<StationResponse>(token ?? "", path, body)
        setStation(r.station ?? {})
        // isActive flags in the list may have changed
        const pl = await radioCall<ListPlaylistsResponse>(token ?? "", "/playlists")
        setPlaylists(pl.playlists ?? [])
      }),
    [run, token],
  )

  const setActive = useCallback(
    (id: string) => stationAction("/station/active", { playlistId: id }),
    [stationAction],
  )
  const goOnAir = useCallback(() => stationAction("/station/on-air", {}), [stationAction])
  const goOffAir = useCallback(() => stationAction("/station/off-air", {}), [stationAction])

  const refresh = useCallback(() => {
    void loadAll()
    if (selectedIdRef.current) void fetchSelected(selectedIdRef.current)
  }, [loadAll, fetchSelected])

  return {
    station,
    playlists,
    selectedId,
    selected,
    loading,
    busy,
    select,
    create,
    rename,
    removePlaylist,
    addTrack,
    removeTrack,
    reorder,
    setActive,
    goOnAir,
    goOffAir,
    refresh,
  }
}
