import { useEffect, useRef, useState } from "react"
import { Callback } from "./components/callback"
import { RequestSheet } from "./components/request-sheet"
import { Stage } from "./components/stage"
import { StationHeader } from "./components/station-header"
import { Timeline } from "./components/timeline"
import { signIn } from "./lib/auth"
import { env } from "./lib/env"
import {
  setMediaHandlers,
  setMediaMetadata,
  setMediaPlaybackState,
} from "./lib/media-session"
import { MockStudio } from "./lib/mock-studio"
import { createHlsPlayer } from "./lib/player"
import { progressOf } from "./lib/progress"
import { createClient } from "./lib/radio-client"
import { createRequestApi } from "./lib/request-client"
import { useAuth } from "./lib/use-auth"
import { type UseRadioDeps, useRadio } from "./lib/use-radio"
import { useRequests } from "./lib/use-requests"
import { useTimeline } from "./lib/use-timeline"

function defaultDeps(): UseRadioDeps {
  const client = createClient()
  const deps: UseRadioDeps = {
    client,
    createPlayer: (audio) =>
      createHlsPlayer(audio, { streamUrl: env.streamUrl }),
  }
  if (env.useMock && client instanceof MockStudio)
    deps.playheadClock = () => client.playheadMs()
  return deps
}

// No router: the app has exactly two views — the receiver and the OIDC
// callback (the Button's pattern).
export default function App({ deps }: { deps?: UseRadioDeps } = {}) {
  const [isCallback, setIsCallback] = useState(() =>
    window.location.pathname.endsWith("/callback"),
  )
  if (isCallback) {
    return (
      <Callback
        onDone={() => {
          window.history.replaceState(null, "", "/radio/")
          setIsCallback(false)
        }}
      />
    )
  }
  return <Receiver deps={deps} />
}

function Receiver({ deps }: { deps?: UseRadioDeps }) {
  const [resolved] = useState(() => deps ?? defaultDeps())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const state = useRadio(audioRef, resolved)
  const { user, token } = useAuth()
  const [requestOpen, setRequestOpen] = useState(false)
  const [api] = useState(() => createRequestApi())
  const { requests, refresh } = useRequests(api, token)
  const timeline = useTimeline({
    nowPlaying: state.nowPlaying,
    queue: state.queue,
    history: state.history,
    requests,
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: state.queue is a nudge trigger, not read in the body
  useEffect(() => {
    if (token) refresh()
  }, [state.queue, token, refresh])

  useEffect(() => {
    setMediaMetadata(state.nowPlaying)
  }, [state.nowPlaying])

  useEffect(
    () => setMediaHandlers({ play: state.play, pause: state.pause }),
    [state.play, state.pause],
  )

  useEffect(() => {
    setMediaPlaybackState(
      state.playerState === "playing"
        ? "playing"
        : state.playerState === "paused"
          ? "paused"
          : "none",
    )
  }, [state.playerState])

  // state.playheadMs, never Date.now(): it is the ear-synced clock, and it is
  // the state change that makes the bar re-render at all — nowPlaying keeps
  // object identity between ticks.
  const progress = state.nowPlaying
    ? progressOf(state.nowPlaying, state.playheadMs)
    : { elapsedS: 0, remainingS: 0, fraction: 0 }

  return (
    <main className="mx-auto flex h-svh max-w-[1100px] flex-col lg:border-x lg:border-[color:var(--border)]">
      {/* biome-ignore lint/a11y/useMediaCaption: live radio stream has no caption track */}
      <audio ref={audioRef} className="hidden" />

      <StationHeader
        status={state.status}
        mode={state.mode}
        listeners={state.listeners}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-2 lg:overflow-hidden">
        <Stage
          nowPlaying={state.nowPlaying}
          status={state.status}
          progress={progress}
          playerState={state.playerState}
          volumeControllable={state.volumeControllable}
          signedIn={user !== null}
          onPlay={state.play}
          onPause={state.pause}
          onVolume={state.setVolume}
          onMute={state.setMuted}
          onRequest={() => setRequestOpen(true)}
          onSignIn={() => void signIn()}
        />
        <div
          className="flex min-h-0 flex-1 flex-col lg:border-l lg:border-[color:var(--border)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <Timeline
            state={timeline}
            elapsedS={progress.elapsedS}
            remainingS={progress.remainingS}
          />
        </div>
      </div>

      {token && (
        <RequestSheet
          api={api}
          token={token}
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
          onRequested={() => refresh()}
        />
      )}
    </main>
  )
}
