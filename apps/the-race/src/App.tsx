import { Button } from "@algovn/ui/button"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Lobby } from "./components/lobby"
import { Preparing } from "./components/preparing"
import { Result } from "./components/result"
import { Stage } from "./components/stage"
import { signIn } from "./lib/auth"
import { authConfigured, env } from "./lib/env"
import { createRaceClient } from "./lib/race-client"
import { CAPTION_HOLD_MS } from "./lib/timeline"
import { scheduledLineAt } from "./lib/schedule"
import { useAudio } from "./lib/use-audio"
import { useAuth } from "./lib/use-auth"
import { useRace } from "./lib/use-race"
import { type AudioClock, useRaceClock } from "./lib/use-race-clock"

/** #/r/<raceId> — the shared link. Reading a race never needs an account. */
const sharedRaceId = () => /^#\/r\/(.+)$/.exec(window.location.hash)?.[1] ?? ""

export default function App() {
  const auth = useAuth()
  const client = useMemo(
    () => createRaceClient({ apiBase: env.apiBase }),
    [],
  )
  const getToken = useCallback(async () => auth.user?.access_token ?? "", [auth.user])

  const { state, start, watch, replay, rematch, finish, backToLobby } = useRace(
    client,
    getToken,
  )

  const reducedMotion = useMemo(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    [],
  )

  // Open the shared race on load AND whenever the hash changes. Pasting a share
  // link into an already-open tab is a hash-only navigation: the page never
  // reloads, so reading the hash once on mount silently drops the link and
  // leaves the person staring at the lobby.
  useEffect(() => {
    const open = () => {
      const id = sharedRaceId()
      if (id) void watch(id)
    }
    open()
    window.addEventListener("hashchange", open)
    return () => window.removeEventListener("hashchange", open)
  }, [watch])

  const race = state.race
  const audio = useAudio()
  const [clock, setClock] = useState<AudioClock | null>(null)
  const [decoding, setDecoding] = useState(false)

  // Once the package is sealed, decode every clip and only then drop the flag.
  // The race must not start against a half-loaded commentary track.
  //
  // Gated on `armed`: audio only exists if a tap authorised it. The host armed
  // it by tapping START; someone arriving on a shared link has tapped nothing
  // yet, and gets the button below.
  useEffect(() => {
    if (state.phase !== "racing" || !race || !audio.armed || audio.loaded || decoding) {
      return
    }
    setDecoding(true)
    void audio.load(race.lines).then((ready) => {
      setClock(audio.start(ready))
      setDecoding(false)
    })
  }, [state.phase, race, audio, decoding])

  const ready = audio.loaded
  const tMs = useRaceClock(
    race?.durationMs ?? 0,
    state.phase === "racing" && !!ready,
    finish,
    clock,
  )

  const replayAll = useCallback(() => {
    audio.stop()
    if (ready) setClock(audio.start(ready))
    replay()
  }, [audio, ready, replay])

  // A shared race is sealed and waiting, but nothing has authorised audio yet.
  // The tap is not ceremony — browsers refuse to start an AudioContext without
  // one, so this is the only moment the commentary can be switched on.
  if (state.phase === "racing" && race && !audio.armed) {
    return (
      <Shell>
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-4 py-16 text-center">
          <div className="text-5xl" aria-hidden>
            🦆
          </div>
          <h2 className="font-semibold text-xl">{state.room?.title ?? "Cuộc đua đã sẵn sàng"}</h2>
          <p className="text-sm text-white/60">
            {race.duckNames.join(" · ")}
          </p>
          <Button size="lg" onClick={audio.arm}>
            ▶ Xem đua
          </Button>
          <p className="text-white/40 text-xs">Có bình luận bằng giọng nói — bật loa lên nhé.</p>
        </div>
      </Shell>
    )
  }

  if (state.phase === "preparing" || (state.phase === "racing" && !ready)) {
    return (
      <Shell>
        <Preparing
          stage={decoding || state.phase === "racing" ? "decoding" : state.prepareStage}
          seedCommit={state.seedCommit}
        />
      </Shell>
    )
  }

  if (race && ready && (state.phase === "racing" || state.phase === "result")) {
    const caption = scheduledLineAt(ready.lines, tMs, CAPTION_HOLD_MS)
    const progress = race.durationMs > 0 ? tMs / race.durationMs : 0

    return (
      <Shell>
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-6">
          <header className="flex items-baseline justify-between">
            <h1 className="font-semibold text-lg">
              {state.room?.title ?? "Đua Vịt"}
            </h1>
            <div className="flex items-center gap-2">
              {ready.voiced > 0 && (
                <button
                  type="button"
                  onClick={audio.toggleMute}
                  aria-label={audio.muted ? "Bật tiếng" : "Tắt tiếng"}
                  aria-pressed={audio.muted}
                  className="rounded px-1.5 py-0.5 text-white/60 text-xs hover:text-white"
                >
                  {audio.muted ? "🔇" : "🔊"}
                </button>
              )}
              <span aria-hidden className="text-white/40 text-xs">
                🔒 {state.seedCommit.slice(0, 8) || race.fairness.seedCommit.slice(0, 8)}
              </span>
            </div>
          </header>

          <Stage race={race} tMs={tMs} reducedMotion={reducedMotion} />

          <div
            className="min-h-12 rounded-md bg-black/30 px-3 py-2 text-sm"
            aria-live="polite"
          >
            {caption ? (
              <span>🎙 {caption.text}</span>
            ) : (
              <span className="text-white/30">…</span>
            )}
          </div>

          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Tiến độ cuộc đua"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className="h-full bg-cyan-400/70"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {state.phase === "result" && (
            <Result
              race={race}
              history={state.history}
              onReplay={replayAll}
              onRematch={rematch}
              onNewRoom={backToLobby}
            />
          )}
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <Lobby
        signedIn={!!auth.user}
        authConfigured={authConfigured}
        busy={false}
        error={state.error}
        onSignIn={() => void signIn()}
        onStart={(title, names) => {
          // Inside the click, before any await: iOS will not start an
          // AudioContext created later in the chain.
          audio.arm()
          void start(title, names)
        }}
      />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#071a20] text-white">{children}</main>
  )
}
