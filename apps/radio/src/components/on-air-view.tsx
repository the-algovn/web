import { Skeleton } from "@algovn/ui/skeleton"
import { Share2 } from "lucide-react"
import type { PlayerState } from "../lib/player"
import type { Progress } from "../lib/progress"
import type { ConnMode, NowPlaying, QueueItem } from "../lib/radio-client"
import { share } from "../lib/share"
import type { StationStatus } from "../lib/station-state"
import { ConnectionBadge } from "./connection-badge"
import { ListenerCount } from "./listener-count"
import { OnAirLamp } from "./on-air-lamp"
import { PlayerControls } from "./player-controls"
import { AirButton, Eyebrow, TrackArt } from "./primitives"
import { ProgressBar, ProgressClock } from "./progress-bar"

// The mono meta line under the artist. The design fills it with an album
// credit; the station has no album field, so it carries provenance instead -
// who put this track on the air.
function provenance(np: NowPlaying): string | null {
  if (np.source === "listener")
    return `YÊU CẦU · ${(np.requestedByName ?? "thính giả").toUpperCase()}`
  if (np.source === "ai") return "TIỂU DƯƠNG DƯƠNG CHỌN"
  return null
}

export function OnAirView({
  layout,
  nowPlaying,
  status,
  mode,
  listeners,
  progress,
  playerState,
  volumeControllable,
  signedIn,
  upNext,
  onPlay,
  onPause,
  onVolume,
  onMute,
  onRequest,
  onSignIn,
  onSeeQueue,
}: {
  layout: "phone" | "rail"
  nowPlaying: NowPlaying | null
  status: StationStatus
  mode: ConnMode
  listeners: number
  progress: Progress
  playerState: PlayerState
  volumeControllable: boolean
  signedIn: boolean
  upNext: QueueItem[]
  onPlay(): void
  onPause(): void
  onVolume(v: number): void
  onMute(muted: boolean): void
  onRequest(): void
  onSignIn(): void
  onSeeQueue(): void
}) {
  const np = nowPlaying
  const phone = layout === "phone"
  const meta = np ? provenance(np) : null

  return (
    <section
      aria-label="Đang phát"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[22px] pb-4"
      style={{ paddingTop: phone ? "max(1.5rem, env(safe-area-inset-top))" : 26 }}
    >
      <header
        className="flex items-start justify-between gap-3 pb-3.5"
        style={{ borderBottom: "1px solid rgb(232 233 230 / 0.13)" }}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[21px] font-semibold leading-[1.1] tracking-[-0.015em]">
            Tần Số 42
          </h1>
          <span
            className="radio-mono truncate text-[11px] leading-[1.3]"
            style={{ color: "var(--radio-ink-55)" }}
          >
            TIỂU DƯƠNG DƯƠNG TRỰC ĐÀI
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <ConnectionBadge mode={mode} />
          <OnAirLamp status={status} />
        </div>
      </header>

      <div className="flex items-center justify-between py-3">
        <Eyebrow>ĐANG PHÁT</Eyebrow>
        <ListenerCount count={listeners} />
      </div>

      <div
        className={phone ? "flex items-start gap-4" : "flex flex-col gap-[18px]"}
      >
        <TrackArt
          src={np?.thumbnailUrl}
          size={phone ? 138 : 274}
          label="ẢNH BÌA"
          className={phone ? undefined : "w-full"}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {np ? (
            <>
              {/* The only live region on the page. Announcing the queue
                  would be hostile - it changes constantly. */}
              <h2
                aria-live="polite"
                className="text-pretty text-[25px] font-semibold leading-[1.1] tracking-[-0.02em]"
              >
                {np.title}
              </h2>
              {np.artist && (
                <p
                  className="text-[14px] font-medium"
                  style={{ color: "var(--radio-ink-78)" }}
                >
                  {np.artist}
                </p>
              )}
              {meta && (
                <span
                  className="radio-mono text-[10.5px] leading-[1.5]"
                  style={{ color: "var(--radio-ink-55)" }}
                >
                  {meta}
                </span>
              )}
            </>
          ) : status === "connecting" ? (
            // Still tuning in. Saying "đài đang nghỉ" here would claim the
            // station is off when we simply do not know yet.
            <div role="img" aria-label="đang dò sóng" className="space-y-2 pt-1">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--radio-ink-55)" }}>
              đài đang nghỉ
            </p>
          )}
        </div>
      </div>

      <div className="pb-1.5 pt-5">
        <ProgressBar progress={progress} />
        <ProgressClock progress={progress} />
      </div>

      <div className="pt-2">
        <PlayerControls
          playerState={playerState}
          volumeControllable={volumeControllable}
          onPlay={onPlay}
          onPause={onPause}
          onVolume={onVolume}
          onMute={onMute}
        />
      </div>

      {np?.dedication && (
        <div
          className="mt-3.5 flex flex-col gap-2.5 pt-4"
          style={{ borderTop: "1px solid rgb(232 233 230 / 0.13)" }}
        >
          <Eyebrow tone="air">
            YÊU CẦU TỪ {(np.requestedByName ?? "thính giả").toUpperCase()}
          </Eyebrow>
          <p className="text-pretty text-[16px] leading-[1.45]">
            {np.dedication}
          </p>
        </div>
      )}

      {phone && (
        <>
          <div className="flex gap-2 pt-[22px]">
            <AirButton
              onClick={signedIn ? onRequest : onSignIn}
              className="h-14 flex-1"
            >
              <span>
                {signedIn ? "YÊU CẦU BÀI HÁT" : "ĐĂNG NHẬP ĐỂ YÊU CẦU"}
              </span>
              <span className="text-[14px] leading-none">-&gt;</span>
            </AirButton>
            <button
              type="button"
              aria-label="Chia sẻ đài"
              onClick={() =>
                void share({
                  title: np ? `${np.title} · Tần Số 42` : "Tần Số 42",
                  url: window.location.href,
                })
              }
              className="grid h-14 w-14 shrink-0 place-items-center border"
              style={{
                borderColor: "var(--radio-line-firm)",
                color: "var(--radio-ink-55)",
              }}
            >
              <Share2 aria-hidden className="size-4" />
            </button>
          </div>

          <div className="flex items-baseline justify-between pt-[26px]">
            <Eyebrow>SẮP PHÁT</Eyebrow>
            <button
              type="button"
              onClick={onSeeQueue}
              className="radio-mono text-[11px] font-medium"
              style={{ color: "var(--radio-air)" }}
            >
              XEM TẤT CẢ
            </button>
          </div>
          <UpNextPeek items={upNext} />
        </>
      )}
    </section>
  )
}

// Two rows, no more. The peek exists to prove the queue is alive and to make
// the QUEUE tab discoverable, not to be a second queue.
function UpNextPeek({ items }: { items: QueueItem[] }) {
  if (items.length === 0) {
    return (
      <p
        className="py-4 text-center text-xs"
        style={{ color: "var(--radio-ink-55)" }}
      >
        đài đang chọn bài…
      </p>
    )
  }
  return (
    <ul>
      {items.slice(0, 2).map((item, i) => (
        <li
          key={`${item.title}-${item.requestedByName ?? i}`}
          className="flex items-start gap-3 py-3.5"
          style={{ borderBottom: "1px solid var(--radio-line-soft)" }}
        >
          <span
            className="radio-mono w-4 shrink-0 text-[11px] leading-[1.5]"
            style={{ color: "var(--radio-ink-55)" }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-[14px] font-medium leading-[1.3]">
              {item.title}
            </span>
            <span
              className="truncate text-[12px]"
              style={{ color: "var(--radio-ink-60)" }}
            >
              {item.artist ?? "—"}
              {item.requestedByName ? ` · cho ${item.requestedByName}` : ""}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
