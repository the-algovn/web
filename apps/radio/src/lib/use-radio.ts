import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import { createNowPlayingSync } from "./nowplaying-sync"
import { startHeartbeat } from "./heartbeat"
import { deriveStationState, type StationStatus } from "./station-state"
import type { RadioPlayer, PlayerState } from "./player"
import type { ConnMode, HistoryItem, NowPlaying, QueueItem, RadioClient } from "./radio-client"

export interface RadioState {
  status: StationStatus
  nowPlaying: NowPlaying | null
  queue: QueueItem[]
  history: HistoryItem[]
  listeners: number
  playerState: PlayerState
  play(): void
  pause(): void
  setVolume(v: number): void
}

export interface UseRadioDeps {
  client: RadioClient
  createPlayer: (audio: HTMLAudioElement) => RadioPlayer
  playheadClock?: () => number
}

export function useRadio(audioRef: RefObject<HTMLAudioElement | null>, deps: UseRadioDeps): RadioState {
  const { client } = deps
  const [sync] = useState(() => createNowPlayingSync())
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [listeners, setListeners] = useState(0)
  const [mode, setMode] = useState<ConnMode>("connecting")
  const [playerState, setPlayerState] = useState<PlayerState>("idle")
  const playerRef = useRef<RadioPlayer | null>(null)

  // Initial reads + subscriptions + heartbeat.
  useEffect(() => {
    let alive = true
    void client.getNowPlaying().then(np => { if (alive) { sync.ingest(np); setListeners(np.listeners) } })
    void client.getQueue().then(q => alive && setQueue(q))
    void client.getHistory().then(h => alive && setHistory(h))
    const unNp = client.subscribeNowPlaying(np => {
      sync.ingest(np)
      setListeners(np.listeners)
      void client.getHistory().then(h => alive && setHistory(h))
    }, setMode)
    const unQ = client.subscribeQueue(setQueue)
    const stopHb = startHeartbeat(client)
    return () => { alive = false; unNp(); unQ(); stopHb() }
  }, [client, sync])

  // Ear-sync loop: pick the audible now-playing off the playhead clock.
  useEffect(() => {
    const clock = deps.playheadClock ?? (() => playerRef.current?.currentProgramDateTime() ?? Date.now())
    const id = setInterval(() => setNowPlaying(sync.current(clock())), 500)
    setNowPlaying(sync.current(clock()))
    return () => clearInterval(id)
  }, [deps.playheadClock, sync])

  const play = () => {
    const audio = audioRef.current
    if (!audio) return
    if (!playerRef.current) {
      const p = deps.createPlayer(audio)
      p.onState(setPlayerState)
      playerRef.current = p
    }
    void playerRef.current.play()
  }
  const pause = () => playerRef.current?.pause()
  const setVolume = (v: number) => playerRef.current?.setVolume(v)

  useEffect(() => () => playerRef.current?.destroy(), [])

  const status = useMemo(
    () => deriveStationState({ mode, playerState, nowPlaying }),
    [mode, playerState, nowPlaying],
  )

  return { status, nowPlaying, queue, history, listeners, playerState, play, pause, setVolume }
}
