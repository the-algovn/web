import { Loader2, Search } from "lucide-react"
import { mmss } from "../lib/format"
import type { Candidate } from "../lib/request-client"
import { AirButton, Eyebrow, TrackArt } from "./primitives"

export function RequestView({
  layout,
  query,
  onQuery,
  onSubmit,
  onClear,
  busy,
  searched,
  results,
  error,
  signedIn,
  onSignIn,
  onPick,
}: {
  layout: "phone" | "column"
  query: string
  onQuery(q: string): void
  onSubmit(): void
  onClear(): void
  busy: boolean
  searched: boolean
  results: Candidate[]
  error: string | null
  signedIn: boolean
  onSignIn(): void
  onPick(c: Candidate): void
}) {
  const pad = layout === "phone" ? "px-[22px]" : "px-7"

  if (!signedIn) {
    return (
      <section
        aria-label="Yêu cầu bài hát"
        className={`flex min-h-0 flex-1 flex-col justify-center gap-4 ${pad}`}
      >
        <h2 className="text-[21px] font-semibold tracking-[-0.015em]">
          Yêu cầu bài hát
        </h2>
        <p
          className="max-w-[46ch] text-[13px] leading-[1.55]"
          style={{ color: "var(--radio-ink-60)" }}
        >
          Đăng nhập để tìm bài và gửi lời nhắn cho Tiểu Dương Dương đọc trên
          sóng.
        </p>
        <AirButton onClick={onSignIn} className="h-[46px] self-start">
          ĐĂNG NHẬP
        </AirButton>
      </section>
    )
  }

  return (
    <section
      aria-label="Yêu cầu bài hát"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div
        className={`${pad} shrink-0 pb-4`}
        style={{
          paddingTop:
            layout === "phone" ? "max(1.5rem, env(safe-area-inset-top))" : 26,
          borderBottom: "1px solid var(--radio-line)",
        }}
      >
        <div className="flex items-baseline justify-between gap-5">
          <h2 className="text-[21px] font-semibold tracking-[-0.015em]">
            Yêu cầu bài hát
          </h2>
        </div>
        <p
          className="max-w-[52ch] pt-1.5 text-[12.5px] leading-[1.45]"
          style={{ color: "var(--radio-ink-60)" }}
        >
          Tìm bài, rồi viết lời nhắn để Tiểu Dương Dương đọc trên sóng.
        </p>

        {/* A form, not a live search: each query is a real upstream lookup,
            so it fires on intent rather than on every keystroke. */}
        <form
          className="mt-4 flex h-12 items-center gap-2.5 px-3.5"
          style={{
            background: "var(--radio-surface)",
            border: "1px solid var(--radio-line-firm)",
          }}
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <button
            type="submit"
            aria-label="Tìm"
            disabled={busy}
            className="grid shrink-0 place-items-center"
          >
            {busy ? (
              <Loader2
                aria-hidden
                className="size-3.5 animate-spin"
                style={{ color: "var(--radio-ink-50)" }}
              />
            ) : (
              <Search
                aria-hidden
                className="size-3.5 shrink-0"
                style={{ color: "var(--radio-ink-50)" }}
              />
            )}
          </button>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.currentTarget.value)}
            placeholder="Tên bài hát, ca sĩ…"
            aria-label="Tên bài hát, ca sĩ"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="radio-mono shrink-0 px-0.5 text-[10.5px] font-medium tracking-[0.1em]"
              style={{ color: "var(--radio-ink-60)" }}
            >
              XOÁ
            </button>
          )}
        </form>
      </div>

      <div className={`${pad} min-h-0 flex-1 overflow-y-auto pb-4`}>
        {error && (
          <p
            className="mt-4 px-3 py-2 text-xs"
            style={{
              color: "#f87171",
              borderLeft: "2px solid #f87171",
              background: "rgb(248 113 113 / 0.08)",
            }}
          >
            {error}
          </p>
        )}

        {results.length > 0 && (
          <>
            <div className="pb-1 pt-[18px]">
              <Eyebrow>{results.length} KẾT QUẢ</Eyebrow>
            </div>
            <ul>
              {results.map((c) => (
                <li key={c.ytId}>
                  <ResultRow candidate={c} onPick={() => onPick(c)} />
                </li>
              ))}
            </ul>
          </>
        )}

        {searched && !busy && results.length === 0 && !error && (
          <div className="flex flex-col items-start gap-3 py-9">
            <p className="text-[18px] font-semibold tracking-[-0.01em]">
              Không tìm thấy bài này.
            </p>
            <p
              className="max-w-[46ch] text-[13px] leading-[1.55]"
              style={{ color: "var(--radio-ink-60)" }}
            >
              Thử tên khác, hoặc thêm tên ca sĩ vào ô tìm kiếm.
            </p>
          </div>
        )}

        {!searched && !busy && (
          <p
            className="py-9 text-[13px] leading-[1.55]"
            style={{ color: "var(--radio-ink-60)" }}
          >
            Gõ tên bài hoặc ca sĩ, rồi nhấn Enter.
          </p>
        )}
      </div>
    </section>
  )
}

function ResultRow({
  candidate,
  onPick,
}: {
  candidate: Candidate
  onPick(): void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-3.5 py-3.5 text-left transition-colors hover:bg-[rgb(232_233_230/0.05)]"
      style={{ borderBottom: "1px solid var(--radio-line-soft)" }}
    >
      <TrackArt src={candidate.thumbnailUrl} size={44} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[15px] font-medium leading-[1.3]">
          {candidate.title}
        </span>
        <span
          className="radio-mono truncate text-[10.5px] leading-[1.4]"
          style={{ color: "var(--radio-ink-55)" }}
        >
          {candidate.channel ?? "—"}
        </span>
      </span>
      <span
        className="radio-mono shrink-0 text-[11px] leading-[1.5]"
        style={{ color: "var(--radio-ink-55)" }}
      >
        {mmss(candidate.durationS)}
      </span>
      <span
        aria-hidden
        className="grid size-[30px] shrink-0 place-items-center pb-0.5 text-[17px] leading-none"
        style={{
          border: "1px solid var(--radio-air-dim)",
          color: "var(--radio-air)",
        }}
      >
        +
      </span>
    </button>
  )
}
