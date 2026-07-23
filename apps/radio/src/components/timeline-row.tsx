import { useState } from "react"
import { relativeTime } from "../lib/format"
import type { TimelineEntry } from "../lib/timeline"

const STATUS: Record<string, string> = {
  approved: "chờ tải",
  ready: "sẵn sàng",
  aired: "đã phát",
  failed: "lỗi",
}

function credit(entry: TimelineEntry): string | null {
  if (entry.source === "listener")
    return `Yêu cầu · ${entry.requestedByName ?? "thính giả"}`
  if (entry.source === "ai") return "Tiểu Dương Dương chọn"
  return null
}

export function TimelineRow({
  entry,
  nowMs,
}: {
  entry: TimelineEntry
  nowMs: number
}) {
  const [open, setOpen] = useState(false)
  const label = credit(entry)
  // A dedication is only ever revealed once the track has actually aired.
  // Future rows get the gift marker and nothing more — no spoiled surprises.
  const revealable = entry.zone === "past" || entry.zone === "current"
  const dedication = revealable ? entry.dedication : undefined
  const hasDetail = Boolean(entry.reason || dedication || entry.artist)

  return (
    <div
      className={`radio-enter border-t border-[color:var(--border)] ${
        entry.zone === "past" ? "opacity-70" : ""
      }`}
    >
      <button
        type="button"
        aria-expanded={hasDetail ? open : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <div
          aria-hidden
          className="size-9 shrink-0 rounded-md"
          style={{
            background: entry.thumbnailUrl
              ? `center/cover url(${entry.thumbnailUrl})`
              : "linear-gradient(135deg,#33353f,#1c1e25)",
          }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {entry.title}
          </span>
          {entry.artist && (
            <span className="block truncate text-xs text-[color:var(--muted-foreground)]">
              {entry.artist}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {label && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px]"
              style={{
                color: "var(--radio-amber-soft)",
                background:
                  "color-mix(in srgb, var(--radio-amber) 10%, transparent)",
              }}
            >
              {label}
            </span>
          )}
          {entry.status && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px]"
              style={{
                color: "var(--radio-amber-soft)",
                background:
                  "color-mix(in srgb, var(--radio-amber) 10%, transparent)",
              }}
            >
              {STATUS[entry.status]}
            </span>
          )}
          {entry.hasDedication && !dedication && (
            <span role="img" aria-label="có lời nhắn gửi" className="text-[10px]">
              🎁
            </span>
          )}
          {entry.airedAt && (
            <span className="whitespace-nowrap font-mono text-[11px] text-[color:var(--muted-foreground)]">
              {relativeTime(entry.airedAt, nowMs)}
            </span>
          )}
        </span>
      </button>
      {open && hasDetail && (
        <div className="px-3 pb-3 pl-[3.75rem] text-xs">
          {dedication && (
            <p
              className="rounded border-l-2 px-2.5 py-1.5"
              style={{
                color: "var(--radio-amber-soft)",
                borderColor: "var(--radio-amber)",
                background:
                  "color-mix(in srgb, var(--radio-amber) 8%, transparent)",
              }}
            >
              {dedication}
            </p>
          )}
          {entry.reason && (
            <p className="mt-1.5 italic text-[color:var(--muted-foreground)]">
              {entry.reason}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
