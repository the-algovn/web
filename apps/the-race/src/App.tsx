import { Button } from "@algovn/ui/button"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Chrome } from "./components/chrome"
import { Countdown } from "./components/countdown"
import { Lobby } from "./components/lobby"
import { Preparing } from "./components/preparing"
import { Result } from "./components/result"
import { Stage } from "./components/stage"
import { signIn } from "./lib/auth"
import { COUNTDOWN_MS, beatAt, captionAt, stageMs, totalMs } from "./lib/broadcast"
import { authConfigured, env } from "./lib/env"
import { createRaceClient } from "./lib/race-client"
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

  const timings = useMemo(
    () => ({ introMs: audio.loaded?.intro.endMs ?? 0, raceMs: race?.durationMs ?? 0 }),
    [audio.loaded, race],
  )

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
    void audio.load(race).then((ready) => {
      setClock(audio.start(ready, ready.intro.endMs + COUNTDOWN_MS))
      setDecoding(false)
    })
  }, [state.phase, race, audio, decoding])

  const ready = audio.loaded
  const elapsed = useRaceClock(
    totalMs(timings),
    state.phase === "racing" && !!ready,
    finish,
    clock,
  )
  const { beat, localMs } = beatAt(elapsed, timings)

  const replayAll = useCallback(() => {
    audio.stop()
    if (ready) setClock(audio.start(ready, ready.intro.endMs + COUNTDOWN_MS))
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
    const started = beat === "race" || beat === "result"
    // Both of these follow the beat rather than the clock — see stageMs and
    // captionAt, where the rules are stated and tested.
    const tMs = stageMs(beat, localMs, race.durationMs)
    const current = captionAt(beat, localMs, ready.intro, ready.race)

    return (
      <Shell>
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-3 px-4 py-6 md:max-w-3xl">
          <Chrome
            title={state.room?.title ?? "Đua Vịt"}
            seedCommit={state.seedCommit || race.fairness.seedCommit}
            live={beat === "race"}
            tMs={tMs}
            durationMs={race.durationMs}
            caption={current?.text ?? ""}
            muted={audio.muted}
            voiced={ready.race.voiced + ready.intro.voiced}
            showClock={started}
            onToggleMute={audio.toggleMute}
          />

          <div className="relative">
            <Stage
              race={race}
              tMs={tMs}
              reducedMotion={reducedMotion}
              bobbing={beat === "prerace" || beat === "countdown"}
            />
            {beat === "countdown" && <Countdown localMs={localMs} />}
          </div>

          {beat === "result" && (
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
  return <main className="min-h-dvh bg-[#0a0d12] text-white">{children}</main>
}
