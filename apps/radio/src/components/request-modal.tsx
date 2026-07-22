import { Loader2, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { ApiError } from "@algovn/api"
import type { Candidate, RequestApi, TrackRequest } from "../lib/request-client"

function fmtDuration(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

// The call-in window, v1: search-and-pick (spec §7). Friendly rejects from
// the server render verbatim — the station talking, not error codes.
export function RequestModal(props: {
  api: RequestApi
  token: string
  open: boolean
  onClose(): void
  onRequested(r: TrackRequest): void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Candidate[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  // Bumped on every open-transition so in-flight search()/requestTrack()
  // calls from a previous session can tell they've gone stale and skip
  // their post-await setState (see the generation checks below).
  const generation = useRef(0)

  // Reopening after a stale close must not surface a previous search's
  // results/notice — an in-flight request that resolves after close would
  // otherwise leave a confirmation banner for the NEXT open.
  useEffect(() => {
    if (props.open) {
      generation.current += 1
      setQuery("")
      setResults([])
      setBusy(false)
      setNotice(null)
      setConfirmed(false)
    }
  }, [props.open])

  if (!props.open) return null

  const search = async () => {
    if (!query.trim() || busy) return
    const gen = generation.current
    setBusy(true)
    setNotice(null)
    setConfirmed(false)
    try {
      const found = await props.api.search(props.token, query)
      if (generation.current !== gen) return
      setResults(found)
    } catch (e) {
      if (generation.current !== gen) return
      setNotice(e instanceof ApiError ? e.message : "đài đang bận, thử lại nhé")
    } finally {
      if (generation.current === gen) setBusy(false)
    }
  }

  const requestTrack = async (c: Candidate) => {
    if (busy) return
    const gen = generation.current
    setBusy(true)
    setNotice(null)
    try {
      const r = await props.api.requestTrack(props.token, c)
      if (generation.current !== gen) return
      setConfirmed(true)
      setNotice("đã vào hàng đợi")
      props.onRequested(r)
    } catch (e) {
      if (generation.current !== gen) return
      setConfirmed(false)
      setNotice(e instanceof ApiError ? e.message : "đài đang bận, thử lại nhé")
    } finally {
      if (generation.current === gen) setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-label="Yêu cầu bài hát"
    >
      <div className="w-full max-w-md rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
            Yêu cầu bài hát
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={props.onClose}
            className="text-sm text-[color:var(--muted-foreground)]"
          >
            ✕
          </button>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void search()
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="tên bài hát, ca sĩ…"
            className="min-w-0 flex-1 rounded-md border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="grid size-9 place-items-center rounded-md text-[color:var(--background)]"
            aria-label="Tìm"
            style={{ background: "var(--radio-amber)" }}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
          </button>
        </form>
        {notice && (
          <div
            className="mt-3 rounded border-l-2 px-2.5 py-1.5 text-xs"
            style={{
              color: confirmed ? "var(--radio-amber-soft)" : "var(--destructive, #f87171)",
              borderColor: confirmed ? "var(--radio-amber)" : "var(--destructive, #f87171)",
              background: "color-mix(in srgb, currentColor 8%, transparent)",
            }}
          >
            {notice}
          </div>
        )}
        <div className="mt-3 max-h-80 overflow-y-auto">
          {results.map((c) => (
            <div
              key={c.ytId}
              className="flex items-center gap-3 border-t border-[color:var(--border)] py-2"
            >
              <div
                className="size-10 shrink-0 rounded-md"
                style={{
                  background: c.thumbnailUrl
                    ? `center/cover url(${c.thumbnailUrl})`
                    : "linear-gradient(135deg,#33353f,#1c1e25)",
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.title}</div>
                <div className="truncate text-xs text-[color:var(--muted-foreground)]">
                  {c.channel && <span>{c.channel} · </span>}
                  {fmtDuration(c.durationS)}
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void requestTrack(c)}
                className="rounded-md border px-2.5 py-1 text-xs"
                style={{
                  borderColor: "var(--radio-amber)",
                  color: "var(--radio-amber-soft)",
                }}
              >
                Yêu cầu
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
