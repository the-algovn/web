import { useCallback, useEffect, useRef, useState } from "react"
import type { Track } from "./media"

export type PlayerStatus = "idle" | "playing" | "paused" | "error"

export interface Player {
  status: PlayerStatus
  track: Track | null
  loadedYtId: string | null
  currentTime: number
  duration: number
  volume: number
  canPrev: boolean
  canNext: boolean
  setQueue: (tracks: Track[]) => void
  load: (index: number) => void
  toggle: () => void
  seek: (t: number) => void
  setVolume: (v: number) => void
  next: () => void
  prev: () => void
  stop: () => void
}

function indexOf(track: Track | null, queue: Track[]): number {
  return track?.ytId ? queue.findIndex((x) => x.ytId === track.ytId) : -1
}

export function usePlayer(opts: {
  audio?: HTMLAudioElement
  // Lazily resolve an artifact id to a playable (presigned) URL when a track
  // is loaded — artifacts live in MinIO and are only reachable via a
  // time-limited presigned URL, so there is no static URL to build.
  resolveUrl: (artifactId: string) => Promise<string>
}): Player {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  if (audioRef.current === null) {
    audioRef.current = opts.audio ?? new Audio()
  }
  const audio = audioRef.current
  const { resolveUrl } = opts

  const [queue, setQueueRender] = useState<Track[]>([])
  const [loaded, setLoaded] = useState<Track | null>(null)
  const [status, setStatus] = useState<PlayerStatus>("idle")
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)

  // Refs mirror queue/loaded so event handlers read fresh values without
  // re-subscribing on every render.
  const queueRef = useRef<Track[]>([])
  const loadedRef = useRef<Track | null>(null)

  const playAudio = useCallback(() => {
    const p = audio.play() as Promise<void> | undefined
    if (p && typeof p.then === "function") {
      p.then(() => setStatus("playing")).catch(() => setStatus("error"))
    } else {
      setStatus("playing")
    }
  }, [audio])

  const load = useCallback(
    (index: number) => {
      const t = queueRef.current[index]
      if (!t) return
      loadedRef.current = t
      setLoaded(t)
      setCurrentTime(0)
      setDuration(0)
      resolveUrl(t.artifactId ?? "")
        .then((url) => {
          if (loadedRef.current?.ytId !== t.ytId) return // superseded by a newer load
          audio.src = url
          playAudio()
        })
        .catch(() => {
          if (loadedRef.current?.ytId === t.ytId) setStatus("error")
        })
    },
    [audio, playAudio, resolveUrl],
  )

  const stop = useCallback(() => {
    audio.pause()
    loadedRef.current = null
    setLoaded(null)
    setStatus("idle")
    setCurrentTime(0)
  }, [audio])

  const toggle = useCallback(() => {
    if (!loadedRef.current) return
    if (audio.paused) {
      playAudio()
    } else {
      audio.pause()
      setStatus("paused")
    }
  }, [audio, playAudio])

  const seek = useCallback(
    (t: number) => {
      audio.currentTime = t
      setCurrentTime(t)
    },
    [audio],
  )

  const setVolume = useCallback(
    (v: number) => {
      audio.volume = v
      setVolumeState(v)
    },
    [audio],
  )

  const next = useCallback(() => {
    const i = indexOf(loadedRef.current, queueRef.current)
    if (i >= 0 && i < queueRef.current.length - 1) load(i + 1)
  }, [load])

  const prev = useCallback(() => {
    const i = indexOf(loadedRef.current, queueRef.current)
    if (i > 0) load(i - 1)
  }, [load])

  const setQueue = useCallback((tracks: Track[]) => {
    queueRef.current = tracks
    setQueueRender(tracks)
  }, [])

  useEffect(() => {
    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => setDuration(audio.duration)
    const onErr = () => setStatus("error")
    const onEnded = () => {
      const i = indexOf(loadedRef.current, queueRef.current)
      if (i >= 0 && i < queueRef.current.length - 1) load(i + 1)
      else stop()
    }
    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("loadedmetadata", onMeta)
    audio.addEventListener("error", onErr)
    audio.addEventListener("ended", onEnded)
    return () => {
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("loadedmetadata", onMeta)
      audio.removeEventListener("error", onErr)
      audio.removeEventListener("ended", onEnded)
    }
  }, [audio, load, stop])

  const activeIndex = indexOf(loaded, queue)
  return {
    status,
    track: loaded,
    loadedYtId: loaded?.ytId ?? null,
    currentTime,
    duration,
    volume,
    canPrev: activeIndex > 0,
    canNext: activeIndex >= 0 && activeIndex < queue.length - 1,
    setQueue,
    load,
    toggle,
    seek,
    setVolume,
    next,
    prev,
    stop,
  }
}
