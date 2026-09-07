import { clock, mmss } from "../lib/format"
import type { HistoryItem, QueueItem } from "../lib/radio-client"
import type { RequestStatus, TrackRequest } from "../lib/request-client"
import { AirButton, DedicationQuote, Eyebrow } from "./primitives"

export type QueueFilter = "next" | "played" | "mine"

const TABS: { key: QueueFilter; label: string }[] = [
  { key: "next", label: "SẮP PHÁT" },
  { key: "played", label: "VỪA PHÁT" },
  { key: "mine", label: "CỦA BẠN" },
]

const MINE_STATUS: Record<RequestStatus, { label: string; air: boolean }> = {
  approved: { label: "ĐANG CHỜ", air: false },
  ready: { label: "SẴN SÀNG", air: true },
  aired: { label: "ĐÃ PHÁT", air: false },
  failed: { label: "KHÔNG PHÁT ĐƯỢC", air: false },
}

// One row shape for all three filters. What varies between them is which
// fields are present, not how a row is built.
type Row = {
  key: string
  index: string
  title: string
  artist?: string
  duration?: string
  message?: string
  attribution?: string
  // Set when a dedication exists but must not be shown yet.
  sealed?: boolean
  status?: string
  statusIsAir?: boolean
}

function nextRows(items: QueueItem[]): Row[] {
  return items.map((item, i) => ({
    key: `next-${i}-${item.title}`,
    index: String(i + 1).padStart(2, "0"),
    title: item.title,
    artist: item.artist,
    // The station withholds a queued dedication's text on purpose, so the
    // row can only report that one is coming.
    sealed: item.hasDedication,
    attribution: item.requestedByName
      ? `cho ${item.requestedByName}`
      : undefined,
    status: item.source === "ai" ? "ĐÀI CHỌN" : undefined,
  }))
}

function playedRows(items: HistoryItem[]): Row[] {
  return items.map((item, i) => ({
    key: `played-${i}-${item.airedAt}`,
    index: "—",
    title: item.title,
    artist: item.artist,
    message: item.dedication,
    attribution: item.requestedByName,
    status: clock(item.airedAt),
  }))
}

function mineRows(items: TrackRequest[]): Row[] {
  return items.map((item, i) => {
    const status = MINE_STATUS[item.status]
    return {
      key: item.id,
      index: String(i + 1).padStart(2, "0"),
      title: item.title,
      artist: item.channel,
      duration: item.durationS > 0 ? mmss(item.durationS) : undefined,
      message: item.dedication,
      attribution: "Bạn",
      status:
        item.status === "failed" && item.failReason
          ? `${status.label} · ${item.failReason}`
          : status.label,
      statusIsAir: status.air,
    }
  })
}

export function QueueView({
  layout,
  filter,
  onFilter,
  queue,
  history,
  mine,
  signedIn,
  onRequest,
  onSignIn,
}: {
  layout: "phone" | "rail"
  filter: QueueFilter
  onFilter(f: QueueFilter): void
  queue: QueueItem[]
  history: HistoryItem[]
  mine: TrackRequest[]
  signedIn: boolean
  onRequest(): void
  onSignIn(): void
}) {
  const rows =
    filter === "next"
      ? nextRows(queue)
      : filter === "played"
        ? playedRows(history)
        : mineRows(mine)

  const pad = layout === "phone" ? "px-[22px]" : "px-6"

  return (
    <section
      aria-label="Hàng đợi của đài"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div
        className={`${pad} shrink-0`}
        style={{
          paddingTop:
            layout === "phone" ? "max(1.5rem, env(safe-area-inset-top))" : 26,
        }}
      >
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
          Hàng đợi tối nay
        </h2>
        <p
          className="radio-mono pt-[7px] text-[11px] leading-[1.4]"
          style={{ color: "var(--radio-ink-55)" }}
        >
          {queue.length} BÀI ĐANG CHỜ
        </p>
        <div
          role="tablist"
          aria-label="Lọc hàng đợi"
          className="mt-[18px] flex gap-[18px]"
          style={{ borderBottom: "1px solid var(--radio-line)" }}
        >
          {TABS.map((tab) => {
            const on = tab.key === filter
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onFilter(tab.key)}
                className="radio-mono pb-[11px] text-[10.5px] font-bold tracking-[0.1em]"
                style={{
                  color: on ? "var(--radio-ink)" : "var(--radio-ink-50)",
                  boxShadow: on ? "inset 0 -2px 0 0 var(--radio-air)" : "none",
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className={`${pad} min-h-0 flex-1 overflow-y-auto pb-5`}>
        {rows.length === 0 ? (
          <Empty
            filter={filter}
            signedIn={signedIn}
            onRequest={onRequest}
            onSignIn={onSignIn}
          />
        ) : (
          <ul>
            {rows.map((row) => (
              <QueueRow key={row.key} row={row} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function QueueRow({ row }: { row: Row }) {
  return (
    <li
      className="flex items-start gap-3 py-4"
      style={{ borderBottom: "1px solid var(--radio-line-soft)" }}
    >
      <span
        className="radio-mono w-[18px] shrink-0 pt-px text-[11px] leading-[1.45]"
        style={{ color: "var(--radio-ink-55)" }}
      >
        {row.index}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline gap-2.5">
          <span className="min-w-0 flex-1 text-[14.5px] font-medium leading-[1.3]">
            {row.title}
          </span>
          {row.duration && (
            <span
              className="radio-mono shrink-0 text-[11px] leading-[1.45]"
              style={{ color: "var(--radio-ink-55)" }}
            >
              {row.duration}
            </span>
          )}
        </div>
        {row.artist && (
          <span
            className="text-[12px]"
            style={{ color: "var(--radio-ink-60)" }}
          >
            {row.artist}
          </span>
        )}
        {row.message ? (
          <DedicationQuote
            message={row.message}
            attribution={row.attribution}
          />
        ) : row.sealed ? (
          <span className="mt-1.5">
            <Eyebrow tone="air">
              CÓ LỜI NHẮN{row.attribution ? ` · ${row.attribution}` : ""}
            </Eyebrow>
          </span>
        ) : null}
        {row.status && (
          <span
            className="radio-mono mt-1.5 text-[9.5px] font-bold tracking-[0.14em]"
            style={{
              color: row.statusIsAir
                ? "var(--radio-air)"
                : "var(--radio-ink-55)",
            }}
          >
            {row.status}
          </span>
        )}
      </div>
    </li>
  )
}

function Empty({
  filter,
  signedIn,
  onRequest,
  onSignIn,
}: {
  filter: QueueFilter
  signedIn: boolean
  onRequest(): void
  onSignIn(): void
}) {
  if (filter === "mine") {
    return (
      <div className="flex flex-col items-start gap-3 py-10">
        <p className="text-[18px] font-semibold">Bạn chưa yêu cầu bài nào.</p>
        <p
          className="text-[13px] leading-[1.5]"
          style={{ color: "var(--radio-ink-60)" }}
        >
          {signedIn
            ? "Tìm một bài và gửi lên đài."
            : "Đăng nhập để gửi bài và theo dõi yêu cầu của bạn."}
        </p>
        <AirButton
          onClick={signedIn ? onRequest : onSignIn}
          className="mt-1 h-[46px]"
        >
          {signedIn ? "YÊU CẦU BÀI HÁT" : "ĐĂNG NHẬP"}
        </AirButton>
      </div>
    )
  }
  return (
    <p
      className="py-10 text-center text-xs"
      style={{ color: "var(--radio-ink-55)" }}
    >
      {filter === "next"
        ? "đài đang chọn bài…"
        : "chưa có bài nào phát trong phiên này"}
    </p>
  )
}
