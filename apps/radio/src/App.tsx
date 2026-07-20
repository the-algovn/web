import { useRef, useState } from "react"
import { Feed } from "./components/feed"
import { ReceiverRail } from "./components/receiver-rail"
import { env } from "./lib/env"
import { MockStudio } from "./lib/mock-studio"
import { createHlsPlayer } from "./lib/player"
import { createClient } from "./lib/radio-client"
import { type UseRadioDeps, useRadio } from "./lib/use-radio"

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

export default function App({ deps }: { deps?: UseRadioDeps } = {}) {
  const [resolved] = useState(() => deps ?? defaultDeps())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const state = useRadio(audioRef, resolved)

  return (
    <main className="mx-auto grid min-h-svh max-w-3xl grid-cols-1 gap-6 p-5 md:grid-cols-[230px_1fr]">
      {/* biome-ignore lint/a11y/useMediaCaption: live radio stream has no caption track */}
      <audio ref={audioRef} className="hidden" />
      <ReceiverRail
        status={state.status}
        listeners={state.listeners}
        playerState={state.playerState}
        onPlay={state.play}
        onPause={state.pause}
        onVolume={state.setVolume}
      />
      <Feed
        nowPlaying={state.nowPlaying}
        queue={state.queue}
        history={state.history}
      />
    </main>
  )
}
