import { ApiError } from "@algovn/api"
import { useCallback, useEffect, useRef, useState } from "react"
import { Callback } from "./components/callback"
import {
  Compose,
  type ComposeState,
  Sent,
  type SentState,
} from "./components/compose"
import { NavBar, type Tab } from "./components/nav-bar"
import { OnAirView } from "./components/on-air-view"
import { QueueView, type QueueFilter } from "./components/queue-view"
import { RequestView } from "./components/request-view"
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
import { type Candidate, createRequestApi } from "./lib/request-client"
import { useAuth } from "./lib/use-auth"
import { useIsDesktop } from "./lib/use-breakpoint"
import { type UseRadioDeps, useRadio } from "./lib/use-radio"
import { useRequests } from "./lib/use-requests"

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

// No router: the app has exactly two views - the receiver and the OIDC
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

function messageOf(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return e instanceof Error && e.message
    ? e.message
    : "đài đang bận, thử lại nhé"
}

function Receiver({ deps }: { deps?: UseRadioDeps }) {
  const [resolved] = useState(() => deps ?? defaultDeps())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const state = useRadio(audioRef, resolved)
  const { user, token } = useAuth()
  const isDesktop = useIsDesktop()
  const [api] = useState(() => createRequestApi())
  const { requests, refresh } = useRequests(api, token)

  const [tab, setTab] = useState<Tab>("now")
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("next")

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Candidate[]>([])
  const [searchBusy, setSearchBusy] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [compose, setCompose] = useState<ComposeState | null>(null)
  const [sent, setSent] = useState<SentState | null>(null)
  const [sendBusy, setSendBusy] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Bumped whenever a search or send begins, so a reply from an abandoned
  // attempt can tell it is stale and skip its setState.
  const generation = useRef(0)

  const signedIn = user !== null
  const signature =
    (typeof user?.profile.name === "string" ? user.profile.name : null) ??
    "thính giả"

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

  const search = useCallback(async () => {
    if (!token || !query.trim() || searchBusy) return
    const gen = ++generation.current
    setSearchBusy(true)
    setSearchError(null)
    try {
      const found = await api.search(token, query)
      if (generation.current !== gen) return
      setResults(found)
      setSearched(true)
    } catch (e) {
      if (generation.current !== gen) return
      setResults([])
      setSearched(true)
      setSearchError(messageOf(e))
    } finally {
      if (generation.current === gen) setSearchBusy(false)
    }
  }, [api, token, query, searchBusy])

  const send = useCallback(async () => {
    if (!token || !compose || sendBusy) return
    const gen = ++generation.current
    setSendBusy(true)
    setSendError(null)
    const dedication = compose.onAir ? compose.message.trim() : ""
    try {
      await api.requestTrack(token, compose.candidate, dedication)
      if (generation.current !== gen) return
      setSent({
        title: compose.candidate.title,
        artist: compose.candidate.channel,
        message: dedication || undefined,
        position: state.queue.length + 1,
      })
      setCompose(null)
      setQuery("")
      setResults([])
      setSearched(false)
      refresh()
    } catch (e) {
      if (generation.current !== gen) return
      setSendError(messageOf(e))
    } finally {
      if (generation.current === gen) setSendBusy(false)
    }
  }, [api, token, compose, sendBusy, state.queue.length, refresh])

  // state.playheadMs, never Date.now(): it is the ear-synced clock, and it is
  // the state change that makes the bar re-render at all - nowPlaying keeps
  // object identity between ticks.
  const progress = state.nowPlaying
    ? progressOf(state.nowPlaying, state.playheadMs)
    : { elapsedS: 0, remainingS: 0, fraction: 0 }

  const goRequest = () => {
    setTab("request")
    setSent(null)
  }
  const goMyQueue = () => {
    setTab("queue")
    setQueueFilter("mine")
    setSent(null)
  }

  const onAirView = (layout: "phone" | "rail") => (
    <OnAirView
      layout={layout}
      nowPlaying={state.nowPlaying}
      status={state.status}
      mode={state.mode}
      listeners={state.listeners}
      progress={progress}
      playerState={state.playerState}
      volumeControllable={state.volumeControllable}
      signedIn={signedIn}
      upNext={state.queue}
      onPlay={state.play}
      onPause={state.pause}
      onVolume={state.setVolume}
      onMute={state.setMuted}
      onRequest={goRequest}
      onSignIn={() => void signIn()}
      onSeeQueue={() => {
        setTab("queue")
        setQueueFilter("next")
      }}
    />
  )

  const requestView = (layout: "phone" | "column") => (
    <RequestView
      layout={layout}
      query={query}
      onQuery={setQuery}
      onSubmit={() => void search()}
      onClear={() => {
        setQuery("")
        setResults([])
        setSearched(false)
        setSearchError(null)
      }}
      busy={searchBusy}
      searched={searched}
      results={results}
      error={searchError}
      signedIn={signedIn}
      onSignIn={() => void signIn()}
      onPick={(candidate) => {
        setSent(null)
        setSendError(null)
        setCompose({ candidate, message: "", onAir: true })
      }}
    />
  )

  const queueView = (layout: "phone" | "rail") => (
    <QueueView
      layout={layout}
      filter={queueFilter}
      onFilter={setQueueFilter}
      queue={state.queue}
      history={state.history}
      mine={requests}
      signedIn={signedIn}
      onRequest={goRequest}
      onSignIn={() => void signIn()}
    />
  )

  const composeProps = {
    signature,
    busy: sendBusy,
    error: sendError,
    onMessage: (message: string) =>
      setCompose((c) => (c ? { ...c, message } : c)),
    onToggleAir: () => setCompose((c) => (c ? { ...c, onAir: !c.onAir } : c)),
    onCancel: () => {
      setCompose(null)
      setSendError(null)
    },
    onSend: () => void send(),
  }

  return (
    <main className="relative flex h-svh flex-col overflow-hidden">
      {/* biome-ignore lint/a11y/useMediaCaption: live radio stream has no caption track */}
      <audio ref={audioRef} className="hidden" />

      {isDesktop ? (
        // The tablet composition, stretched: the rails hold their widths and
        // the request column absorbs whatever the window gives it.
        <div className="flex min-h-0 flex-1">
          <div
            className="flex w-[322px] shrink-0 flex-col"
            style={{ borderRight: "1px solid var(--radio-line)" }}
          >
            {onAirView("rail")}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            {requestView("column")}
            {compose && (
              <Compose layout="dock" state={compose} {...composeProps} />
            )}
            {!compose && sent && (
              <Sent
                layout="dock"
                state={sent}
                onSeeQueue={goMyQueue}
                onDone={() => setSent(null)}
              />
            )}
          </div>
          <div
            className="flex w-[352px] shrink-0 flex-col"
            style={{ borderLeft: "1px solid var(--radio-line)" }}
          >
            {queueView("rail")}
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col">
            {tab === "now" && onAirView("phone")}
            {tab === "request" && requestView("phone")}
            {tab === "queue" && queueView("phone")}
          </div>
          <NavBar
            tab={tab}
            onTab={(next) => {
              setTab(next)
              setSent(null)
            }}
          />
          {compose && (
            <Compose layout="phone" state={compose} {...composeProps} />
          )}
          {!compose && sent && (
            <Sent
              layout="phone"
              state={sent}
              onSeeQueue={goMyQueue}
              onDone={() => {
                setSent(null)
                setTab("now")
              }}
            />
          )}
        </>
      )}
    </main>
  )
}
