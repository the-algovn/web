import { mmss } from "../lib/format"
import type { Candidate } from "../lib/request-client"
import { AirButton, Eyebrow, TrackArt } from "./primitives"

// The server caps a dedication at 400 runes; the counter matches it exactly so
// the field never accepts something the station will reject.
export const MESSAGE_LIMIT = 400

export type ComposeState = {
  candidate: Candidate
  message: string
  onAir: boolean
}

export type SentState = {
  title: string
  artist?: string
  message?: string
  position: number
}

function remaining(message: string): number {
  return MESSAGE_LIMIT - [...message].length
}

export function Compose({
  layout,
  state,
  signature,
  busy,
  error,
  onMessage,
  onToggleAir,
  onCancel,
  onSend,
}: {
  layout: "phone" | "dock"
  state: ComposeState
  signature: string
  busy: boolean
  error: string | null
  onMessage(v: string): void
  onToggleAir(): void
  onCancel(): void
  onSend(): void
}) {
  const left = remaining(state.message)
  const counter = `CÒN ${left}`
  const counterColor =
    left < 25 ? "var(--radio-air)" : "var(--radio-ink-55)"

  if (layout === "dock") {
    return (
      <div
        className="radio-sheet shrink-0 px-7 pb-[22px] pt-5"
        style={{
          borderTop: "1px solid rgb(63 169 138 / 0.4)",
          background: "var(--radio-dock)",
        }}
      >
        <div className="flex items-center gap-3.5">
          <TrackArt src={state.candidate.thumbnailUrl} size={52} />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="truncate text-[17px] font-semibold leading-[1.2] tracking-[-0.01em]">
              {state.candidate.title}
            </span>
            <span
              className="radio-mono truncate text-[10.5px] leading-[1.4]"
              style={{ color: "var(--radio-ink-60)" }}
            >
              {state.candidate.channel ?? "—"}
            </span>
          </span>
          <AirTogglePill onAir={state.onAir} onToggle={onToggleAir} />
          <button
            type="button"
            onClick={onCancel}
            className="radio-mono h-[34px] shrink-0 px-3 text-[9.5px] font-medium tracking-[0.1em]"
            style={{
              border: "1px solid rgb(232 233 230 / 0.22)",
              color: "var(--radio-ink-60)",
            }}
          >
            HUỶ
          </button>
        </div>

        <MessageField
          value={state.message}
          rows={2}
          disabled={!state.onAir}
          onChange={onMessage}
          className="mt-4"
          background="var(--radio-screen)"
        />

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex items-center gap-3 pt-3">
          <SignatureNote signature={signature} className="min-w-0 flex-1" />
          <span
            className="radio-mono shrink-0 text-[11px]"
            style={{ color: counterColor }}
          >
            {counter}
          </span>
          <AirButton
            onClick={onSend}
            disabled={busy}
            className="h-11 shrink-0 text-[10.5px] tracking-[0.12em]"
          >
            {busy ? "ĐANG GỬI…" : "GỬI"}
          </AirButton>
        </div>
      </div>
    )
  }

  return (
    <div
      className="radio-sheet absolute inset-0 z-20 flex flex-col"
      style={{ background: "var(--radio-screen)" }}
    >
      <div
        className="flex shrink-0 items-center justify-between px-[22px] pb-3.5"
        style={{
          paddingTop: "max(1.5rem, env(safe-area-inset-top))",
          borderBottom: "1px solid rgb(232 233 230 / 0.13)",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="radio-mono py-1.5 text-[11px] font-medium tracking-[0.1em]"
          style={{ color: "var(--radio-ink-60)" }}
        >
          HUỶ
        </button>
        <Eyebrow>YÊU CẦU MỚI</Eyebrow>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-5">
        <div
          className="flex items-center gap-3.5 pb-[22px]"
          style={{ borderBottom: "1px solid rgb(232 233 230 / 0.13)" }}
        >
          <TrackArt src={state.candidate.thumbnailUrl} size={62} />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[18px] font-semibold leading-[1.2] tracking-[-0.01em]">
              {state.candidate.title}
            </span>
            <span
              className="radio-mono truncate text-[10.5px] leading-[1.4]"
              style={{ color: "var(--radio-ink-60)" }}
            >
              {state.candidate.channel ?? "—"} ·{" "}
              {mmss(state.candidate.durationS)}
            </span>
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-[22px]">
          <Eyebrow>LỜI NHẮN</Eyebrow>
          <span
            className="radio-mono text-[11px]"
            style={{ color: counterColor }}
          >
            {counter}
          </span>
        </div>
        <MessageField
          value={state.message}
          rows={4}
          disabled={!state.onAir}
          onChange={onMessage}
          className="mt-2.5"
          background="var(--radio-surface)"
        />
        <p
          className="pt-2.5 text-[12px] leading-[1.5]"
          style={{ color: "var(--radio-ink-60)" }}
        >
          Tiểu Dương Dương đọc những lời nhắn kịp xen giữa hai bài. Nhắn ngắn
          thì lên sóng sớm hơn.
        </p>

        <div className="flex flex-col gap-2.5 pt-6">
          <Eyebrow>KÝ TÊN</Eyebrow>
          <SignatureNote signature={signature} />
        </div>

        <button
          type="button"
          onClick={onToggleAir}
          aria-pressed={state.onAir}
          className="mt-[22px] flex w-full items-start gap-3 text-left"
        >
          <span
            aria-hidden
            className="grid size-5 shrink-0 place-items-center text-[12px] leading-none"
            style={{
              border: `1px solid ${state.onAir ? "var(--radio-air)" : "rgb(232 233 230 / 0.35)"}`,
              background: state.onAir ? "var(--radio-air)" : "transparent",
              color: "var(--radio-deep)",
            }}
          >
            {state.onAir ? "✓" : ""}
          </span>
          <span className="flex flex-1 flex-col gap-1">
            <span className="text-[14px] font-medium">
              Đọc lời nhắn trên sóng
            </span>
            <span
              className="text-[12px] leading-[1.45]"
              style={{ color: "var(--radio-ink-60)" }}
            >
              Tắt thì bài vẫn vào hàng đợi, chỉ là không có lời nhắn.
            </span>
          </span>
        </button>

        {error && <ErrorNote>{error}</ErrorNote>}
      </div>

      <div
        className="shrink-0 px-[22px] pt-3.5"
        style={{
          paddingBottom: "max(1.875rem, env(safe-area-inset-bottom))",
          borderTop: "1px solid rgb(232 233 230 / 0.13)",
        }}
      >
        <AirButton onClick={onSend} disabled={busy} className="h-14 w-full">
          {busy ? "ĐANG GỬI…" : "GỬI LÊN ĐÀI"}
        </AirButton>
      </div>
    </div>
  )
}

function MessageField({
  value,
  rows,
  disabled,
  onChange,
  className,
  background,
}: {
  value: string
  rows: number
  disabled: boolean
  onChange(v: string): void
  className?: string
  background: string
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      disabled={disabled}
      aria-label="Lời nhắn"
      onChange={(e) => onChange([...e.currentTarget.value].slice(0, MESSAGE_LIMIT).join(""))}
      placeholder={
        disabled
          ? "Đã tắt lời nhắn trên sóng."
          : "Gửi cho ai, và vì sao là tối nay?"
      }
      className={`w-full resize-none p-3.5 text-[15.5px] leading-[1.5] outline-none disabled:opacity-50 ${className ?? ""}`}
      style={{
        background,
        border: "1px solid var(--radio-line-firm)",
        color: "var(--radio-ink)",
      }}
    />
  )
}

// The station derives the display name from the signed-in account and never
// takes one from the client (see the request table's display_name), so the
// signature is shown rather than typed.
function SignatureNote({
  signature,
  className,
}: {
  signature: string
  className?: string
}) {
  return (
    <span
      className={`radio-mono flex h-11 items-center truncate px-3.5 text-[13px] ${className ?? ""}`}
      style={{
        background: "rgb(232 233 230 / 0.04)",
        border: "1px solid var(--radio-line-firm)",
        color: "var(--radio-ink-78)",
      }}
    >
      {signature}
    </span>
  )
}

function AirTogglePill({
  onAir,
  onToggle,
}: {
  onAir: boolean
  onToggle(): void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={onAir}
      className="radio-mono h-[34px] shrink-0 px-3 text-[9.5px] font-bold tracking-[0.1em]"
      style={{
        background: onAir ? "var(--radio-air-wash)" : "transparent",
        border: `1px solid ${onAir ? "var(--radio-air)" : "rgb(232 233 230 / 0.35)"}`,
        color: onAir ? "var(--radio-air)" : "var(--radio-ink-60)",
      }}
    >
      TRÊN SÓNG {onAir ? "✓" : "·"}
    </button>
  )
}

function ErrorNote({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="mt-3 px-3 py-2 text-xs"
      style={{
        color: "#f87171",
        borderLeft: "2px solid #f87171",
        background: "rgb(248 113 113 / 0.08)",
      }}
    >
      {children}
    </p>
  )
}

export function Sent({
  layout,
  state,
  onSeeQueue,
  onDone,
}: {
  layout: "phone" | "dock"
  state: SentState
  onSeeQueue(): void
  onDone(): void
}) {
  if (layout === "dock") {
    return (
      <div
        className="radio-sheet flex shrink-0 flex-col gap-3.5 px-7 py-5"
        style={{
          borderTop: "1px solid rgb(63 169 138 / 0.45)",
          background: "var(--radio-dock-air)",
        }}
      >
        <SentStamp />
        <div className="flex flex-col gap-1.5">
          <p className="text-[19px] font-semibold leading-[1.2] tracking-[-0.02em]">
            Bạn đang ở vị trí #{state.position} trong hàng đợi
          </p>
          <span
            className="radio-mono text-[11px] leading-[1.5]"
            style={{ color: "var(--radio-ink-60)" }}
          >
            {state.title}
          </span>
        </div>
        <div className="flex gap-3">
          <AirButton
            variant="outline"
            onClick={onSeeQueue}
            className="h-11 text-[10.5px] tracking-[0.12em]"
          >
            YÊU CẦU CỦA BẠN
          </AirButton>
          <AirButton
            onClick={onDone}
            className="h-11 text-[10.5px] tracking-[0.12em]"
          >
            XONG
          </AirButton>
        </div>
      </div>
    )
  }

  return (
    <div
      className="radio-fade absolute inset-0 z-20 flex flex-col justify-between px-6"
      style={{
        background: "var(--radio-deep)",
        paddingTop: "max(3rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex flex-col gap-[18px]">
        <SentStamp />
        <p className="text-pretty text-[36px] font-semibold leading-[1.06] tracking-[-0.03em]">
          Bạn đang ở vị trí #{state.position} trong hàng đợi.
        </p>
      </div>

      <div
        className="flex flex-col gap-3 py-6"
        style={{
          borderTop: "1px solid var(--radio-line-firm)",
          borderBottom: "1px solid var(--radio-line-firm)",
        }}
      >
        <span className="text-[20px] font-semibold leading-[1.2] tracking-[-0.015em]">
          {state.title}
        </span>
        {state.artist && (
          <span
            className="radio-mono text-[10.5px] leading-[1.4]"
            style={{ color: "var(--radio-ink-60)" }}
          >
            {state.artist}
          </span>
        )}
        {state.message && (
          <p
            className="text-pretty pt-1.5 text-[15.5px] leading-[1.5]"
            style={{ color: "var(--radio-ink-92)" }}
          >
            {state.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <AirButton onClick={onSeeQueue} className="h-[54px] w-full">
          XEM HÀNG ĐỢI
        </AirButton>
        <AirButton
          variant="outline"
          onClick={onDone}
          className="h-12 w-full"
        >
          VỀ ĐÀI
        </AirButton>
      </div>
    </div>
  )
}

function SentStamp() {
  return (
    <div role="status" className="flex items-center gap-2">
      <span
        aria-hidden
        className="radio-pulse size-1.5 shrink-0"
        style={{
          background: "var(--radio-air)",
          boxShadow: "var(--radio-air-glow)",
        }}
      />
      <Eyebrow tone="air">ĐÃ GỬI LÊN ĐÀI</Eyebrow>
    </div>
  )
}
