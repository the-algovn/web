import { ApiError } from "@algovn/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@algovn/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@algovn/ui/drawer"
import { Loader2, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { mmss } from "../lib/format"
import type { Candidate, RequestApi, TrackRequest } from "../lib/request-client"
import { useIsDesktop } from "../lib/use-breakpoint"

// The call-in window. Drawer on mobile, Dialog on desktop — both give a focus
// trap and Escape for free, which the hand-rolled overlay never had.
export function RequestSheet(props: {
  api: RequestApi
  token: string
  open: boolean
  onClose(): void
  onRequested(r: TrackRequest): void
}) {
  const isDesktop = useIsDesktop()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Candidate[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  // Bumped on every open transition so an in-flight call from a previous
  // session can tell it has gone stale and skip its post-await setState.
  const generation = useRef(0)

  useEffect(() => {
    if (!props.open) return
    generation.current += 1
    setQuery("")
    setResults([])
    setBusy(false)
    setNotice(null)
    setConfirmed(false)
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
      setNotice(e instanceof ApiError ? e.message : messageOf(e))
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
      setNotice(e instanceof ApiError ? e.message : messageOf(e))
    } finally {
      if (generation.current === gen) setBusy(false)
    }
  }

  const body = (
    <>
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
          className="min-h-11 min-w-0 flex-1 rounded-md border border-[color:var(--border)] bg-transparent px-3 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          aria-label="Tìm"
          className="grid min-h-11 w-11 place-items-center rounded-md text-[color:var(--background)]"
          style={{ background: "var(--radio-amber)" }}
        >
          {busy ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Search aria-hidden className="size-4" />
          )}
        </button>
      </form>

      {notice && (
        <div
          className="mt-3 rounded border-l-2 px-2.5 py-1.5 text-xs"
          style={{
            color: confirmed
              ? "var(--radio-amber-soft)"
              : "var(--destructive, #f87171)",
            borderColor: confirmed
              ? "var(--radio-amber)"
              : "var(--destructive, #f87171)",
            background: "color-mix(in srgb, currentColor 8%, transparent)",
          }}
        >
          {notice}
        </div>
      )}

      <div className="mt-3 max-h-[50vh] overflow-y-auto">
        {results.map((c) => (
          <div
            key={c.ytId}
            className="flex items-center gap-3 border-t border-[color:var(--border)] py-2"
          >
            <div
              aria-hidden
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
                {mmss(c.durationS)}
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void requestTrack(c)}
              className="min-h-11 shrink-0 rounded-md border px-3 text-xs"
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
    </>
  )

  const onOpenChange = (next: boolean) => {
    if (!next) props.onClose()
  }

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yêu cầu bài hát</DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Yêu cầu bài hát</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">{body}</div>
      </DrawerContent>
    </Drawer>
  )
}

function messageOf(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "đài đang bận, thử lại nhé"
}
