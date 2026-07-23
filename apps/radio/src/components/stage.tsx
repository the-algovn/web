import { Skeleton } from "@algovn/ui/skeleton"
import { Share2 } from "lucide-react"
import { mmss } from "../lib/format"
import type { PlayerState } from "../lib/player"
import type { Progress } from "../lib/progress"
import type { NowPlaying } from "../lib/radio-client"
import { share } from "../lib/share"
import type { StationStatus } from "../lib/station-state"
import { PlayerControls } from "./player-controls"
import { ProgressBar } from "./progress-bar"

function credit(np: NowPlaying): string | null {
  if (np.source === "listener")
    return `Yêu cầu · ${np.requestedByName ?? "thính giả"}`
  if (np.source === "ai") return "Tiểu Dương Dương chọn"
  return null
}

export function Stage(props: {
  nowPlaying: NowPlaying | null
  status: StationStatus
  progress: Progress
  playerState: PlayerState
  volumeControllable: boolean
  signedIn: boolean
  onPlay(): void
  onPause(): void
  onVolume(v: number): void
  onMute(muted: boolean): void
  onRequest(): void
  onSignIn(): void
}) {
  const np = props.nowPlaying
  const label = np ? credit(np) : null

  return (
    <section
      aria-label="Đang phát"
      className="flex flex-col gap-3 border-b border-[color:var(--border)] px-4 py-4 lg:border-b-0"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className="size-16 shrink-0 rounded-lg lg:size-32"
          style={{
            background: np?.thumbnailUrl
              ? `center/cover url(${np.thumbnailUrl})`
              : "linear-gradient(135deg,#3a3d49,#20222a)",
          }}
        />
        <div className="min-w-0 flex-1">
          {np ? (
            <>
              {/* The only live region on the page. Announcing the timeline
                  would be hostile — it changes constantly. */}
              <div
                aria-live="polite"
                className="truncate text-base font-semibold lg:text-lg"
              >
                {np.title}
              </div>
              {np.artist && (
                <div className="truncate text-sm text-[color:var(--muted-foreground)]">
                  {np.artist}
                </div>
              )}
              {label && (
                <span
                  className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px]"
                  style={{
                    color: "var(--radio-amber-soft)",
                    background:
                      "color-mix(in srgb, var(--radio-amber) 10%, transparent)",
                  }}
                >
                  {label}
                </span>
              )}
              {np.dedication && (
                <p
                  className="mt-2 rounded border-l-2 px-2.5 py-1.5 text-xs"
                  style={{
                    color: "var(--radio-amber-soft)",
                    borderColor: "var(--radio-amber)",
                    background:
                      "color-mix(in srgb, var(--radio-amber) 8%, transparent)",
                  }}
                >
                  {np.dedication}
                </p>
              )}
            </>
          ) : props.status === "connecting" ? (
            // Still tuning in. Saying "đài đang nghỉ" here would claim the
            // station is off when we simply do not know yet.
            <div
              role="img"
              aria-label="đang dò sóng"
              className="space-y-2 pt-1"
            >
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ) : (
            <div className="text-sm text-[color:var(--muted-foreground)]">
              đài đang nghỉ
            </div>
          )}
        </div>
      </div>

      <div>
        <ProgressBar progress={props.progress} />
        <div className="mt-1 flex justify-between font-mono text-[11px] text-[color:var(--muted-foreground)]">
          <span>{mmss(props.progress.elapsedS)}</span>
          <span>-{mmss(props.progress.remainingS)}</span>
        </div>
      </div>

      <PlayerControls
        playerState={props.playerState}
        volumeControllable={props.volumeControllable}
        onPlay={props.onPlay}
        onPause={props.onPause}
        onVolume={props.onVolume}
        onMute={props.onMute}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={props.signedIn ? props.onRequest : props.onSignIn}
          className="min-h-11 flex-1 rounded-md border px-3 text-xs font-medium transition active:scale-95"
          style={{
            borderColor: "var(--radio-amber)",
            color: "var(--radio-amber-soft)",
            background:
              "color-mix(in srgb, var(--radio-amber) 8%, transparent)",
          }}
        >
          {props.signedIn ? "＋ Yêu cầu bài hát" : "Đăng nhập để yêu cầu"}
        </button>
        <button
          type="button"
          aria-label="Chia sẻ đài"
          onClick={() =>
            void share({
              title: np ? `${np.title} · Tần Số 42` : "Tần Số 42",
              url: window.location.href,
            })
          }
          className="grid min-h-11 w-11 place-items-center rounded-md border border-[color:var(--border)] text-[color:var(--muted-foreground)]"
        >
          <Share2 aria-hidden className="size-4" />
        </button>
      </div>
    </section>
  )
}
