import { useCallback, useEffect, useMemo, useState } from "react"
import { Lobby } from "./components/lobby"
import { Preparing } from "./components/preparing"
import { Result } from "./components/result"
import { Stage } from "./components/stage"
import { signIn } from "./lib/auth"
import { authConfigured, env } from "./lib/env"
import { createRaceClient } from "./lib/race-client"
import { lineAt } from "./lib/timeline"
import { useAuth } from "./lib/use-auth"
import { useRace } from "./lib/use-race"
import { useRaceClock } from "./lib/use-race-clock"

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

  // Open a shared race once, on load.
  const [opened, setOpened] = useState(false)
  useEffect(() => {
    if (opened) return
    const id = sharedRaceId()
    setOpened(true)
    if (id) void watch(id)
  }, [opened, watch])

  const race = state.race
  const tMs = useRaceClock(
    race?.durationMs ?? 0,
    state.phase === "racing",
    finish,
  )

  if (state.phase === "preparing") {
    return (
      <Shell>
        <Preparing stage={state.prepareStage} seedCommit={state.seedCommit} />
      </Shell>
    )
  }

  if (race && (state.phase === "racing" || state.phase === "result")) {
    const caption = lineAt(race.lines, tMs)
    const progress = race.durationMs > 0 ? tMs / race.durationMs : 0

    return (
      <Shell>
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-6">
          <header className="flex items-baseline justify-between">
            <h1 className="font-semibold text-lg">
              {state.room?.title ?? "Đua Vịt"}
            </h1>
            <span aria-hidden className="text-white/40 text-xs">
              🔒 {state.seedCommit.slice(0, 8) || race.fairness.seedCommit.slice(0, 8)}
            </span>
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
              onReplay={replay}
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
        onStart={start}
      />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#071a20] text-white">{children}</main>
  )
}
