import { type RefObject, useEffect, useMemo, useRef, useState } from "react"
import { startHeartbeat } from "./heartbeat"
import { createNowPlayingSync } from "./nowplaying-sync"
import type { PlayerState, RadioPlayer } from "./player"
import type {
  ConnMode,
  HistoryItem,
  NowPlaying,
  QueueItem,
  RadioClient,
} from "./radio-client"
import { deriveStationState, type StationStatus } from "./station-state"
import { volumeIsControllable } from "./volume-support"

export interface RadioState {
  status: StationStatus
  mode: ConnMode
  nowPlaying: NowPlaying | null
  playheadMs: number
  queue: QueueItem[]
  history: HistoryItem[]
  listeners: number
  playerState: PlayerState
  volumeControllable: boolean
  play(): void
  pause(): void
  setVolume(v: number): void
}

export interface UseRadioDeps {
  client: RadioClient
  createPlayer: (audio: HTMLAudioElement) => RadioPlayer
  playheadClock?: () => number
}

export function useRadio(
  audioRef: RefObject<HTMLAudioElement | null>,
  deps: UseRadioDeps,
): RadioState {
  const { client } = deps
  const [sync] = useState(() => createNowPlayingSync())
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [listeners, setListeners] = useState(0)
  const [mode, setMode] = useState<ConnMode>("connecting")
  const [playerState, setPlayerState] = useState<PlayerState>("idle")
  const [offAir, setOffAir] = useState(false)
  const [playheadMs, setPlayheadMs] = useState(() => Date.now())
  const [volumeControllable, setVolumeControllable] = useState(false)
  const playerRef = useRef<RadioPlayer | null>(null)

  // Initial reads + subscriptions + heartbeat.
  useEffect(() => {
    let alive = true
    void client.getNowPlaying().then((np) => {
      if (!alive) return
      if (np) {
        sync.ingest(np)
        setListeners(np.listeners)
        setOffAir(false)
      } else {
        setOffAir(true)
      }
    })
    void client.getQueue().then((q) => alive && setQueue(q))
    void client.getHistory().then((h) => alive && setHistory(h))
    const unNp = client.subscribeNowPlaying((np) => {
      if (np) {
        sync.ingest(np)
        setListeners(np.listeners)
        setOffAir(false)
        void client.getHistory().then((h) => alive && setHistory(h))
      } else {
        setOffAir(true)
      }
    }, setMode)
    const unQ = client.subscribeQueue(setQueue)
    const stopHb = startHeartbeat(client)
    return () => {
      alive = false
      unNp()
      unQ()
      stopHb()
    }
  }, [client, sync])

  // Ear-sync loop: pick the audible now-playing off the playhead clock.
  useEffect(() => {
    const clock =
      deps.playheadClock ??
      (() => playerRef.current?.currentProgramDateTime() ?? Date.now())
    const tick = () => {
      const at = clock()
      setPlayheadMs(at)
      setNowPlaying(sync.current(at))
    }
    const id = setInterval(tick, 500)
    tick()
    return () => clearInterval(id)
  }, [deps.playheadClock, sync])

  const play = () => {
    const audio = audioRef.current
    if (!audio) return
    if (!playerRef.current) {
      const p = deps.createPlayer(audio)
      p.onState(setPlayerState)
      playerRef.current = p
      // Probe once, on the real element, after the player owns it — iOS
      // Safari accepts the write and ignores it.
      setVolumeControllable(volumeIsControllable(audio))
    }
    void playerRef.current.play()
  }
  const pause = () => playerRef.current?.pause()
  const setVolume = (v: number) => playerRef.current?.setVolume(v)

  useEffect(() => () => playerRef.current?.destroy(), [])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) setVolumeControllable(volumeIsControllable(audio))
  }, [audioRef])

  const status = useMemo(
    () => deriveStationState({ mode, playerState, nowPlaying, offAir }),
    [mode, playerState, nowPlaying, offAir],
  )

  return {
    status,
    mode,
    nowPlaying,
    playheadMs,
    queue,
    history,
    listeners,
    playerState,
    volumeControllable,
    play,
    pause,
    setVolume,
  }
}
