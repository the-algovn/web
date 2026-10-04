export type PlayerState =
  | "idle"
  | "connecting"
  | "playing"
  | "paused"
  | "stalled"
  | "error"

export interface RadioPlayer {
  play(): Promise<void>
  pause(): void
  setVolume(v: number): void
  getState(): PlayerState
  onState(cb: (s: PlayerState) => void): () => void
  currentProgramDateTime(): number | null
  destroy(): void
}

function stateHub(initial: PlayerState) {
  let state = initial
  const subs = new Set<(s: PlayerState) => void>()
  return {
    get: () => state,
    set: (s: PlayerState) => {
      state = s
      subs.forEach((cb) => {
        cb(s)
      })
    },
    on: (cb: (s: PlayerState) => void) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
  }
}

export function createFakePlayer(): RadioPlayer & {
  emit(s: PlayerState): void
  setPdt(ms: number | null): void
} {
  const hub = stateHub("idle")
  let pdt: number | null = null
  return {
    play: async () => hub.set("playing"),
    pause: () => hub.set("paused"),
    setVolume: () => {},
    getState: hub.get,
    onState: hub.on,
    currentProgramDateTime: () => pdt,
    destroy: () => {},
    emit: hub.set,
    setPdt: (ms) => {
      pdt = ms
    },
  }
}

type HlsCtor = typeof import("hls.js").default

const loadHlsJs = async (): Promise<HlsCtor> => (await import("hls.js")).default

// Safari's non-standard start date of the HLS timeline (the first
// PROGRAM-DATE-TIME); an Invalid Date until the playlist is parsed.
type NativeHlsAudio = HTMLAudioElement & { getStartDate?: () => Date }

/**
 * Creates the live stream player bound to an audio element.
 *
 * @param audio - the element that plays the stream.
 * @param opts.streamUrl - the HLS playlist URL.
 * @param opts.loadHls - loads the hls.js constructor; defaults to a lazy import.
 * @returns a RadioPlayer whose currentProgramDateTime() is the wall time of
 *   what is audible now, or null while it is not yet known.
 */
export function createHlsPlayer(
  audio: NativeHlsAudio,
  opts: { streamUrl: string; loadHls?: () => Promise<HlsCtor> },
): RadioPlayer {
  const hub = stateHub("idle")
  let hls: InstanceType<HlsCtor> | null = null
  let attached = false
  audio.addEventListener("playing", () => hub.set("playing"))
  audio.addEventListener("pause", () => hub.set("paused"))
  audio.addEventListener("waiting", () => hub.set("stalled"))

  async function attach() {
    if (attached) return
    attached = true
    // Native only where it can report PROGRAM-DATE-TIME (Safari/iOS), which
    // ear-sync needs. Chromium also plays HLS natively but without
    // getStartDate, so there the UI would fall back to wall clock and run
    // ahead of the audio by the whole stream latency.
    if (
      audio.canPlayType("application/vnd.apple.mpegurl") &&
      typeof audio.getStartDate === "function"
    ) {
      audio.src = opts.streamUrl
      return
    }
    const Hls = await (opts.loadHls ?? loadHlsJs)()
    if (!Hls.isSupported()) {
      audio.src = opts.streamUrl
      return
    }
    hls = new Hls({ enableWorker: true, lowLatencyMode: false })
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) hub.set("error")
    })
    hls.loadSource(opts.streamUrl)
    hls.attachMedia(audio)
  }

  function nativeProgramDateTime(): number | null {
    const start = audio.getStartDate?.().getTime()
    if (start === undefined || Number.isNaN(start)) return null
    return start + audio.currentTime * 1000
  }

  return {
    async play() {
      hub.set("connecting")
      await attach()
      await audio.play()
    },
    pause() {
      audio.pause()
    },
    setVolume(v) {
      audio.volume = Math.max(0, Math.min(1, v))
    },
    getState: hub.get,
    onState: hub.on,
    currentProgramDateTime() {
      if (hls) return hls.playingDate?.getTime() ?? null
      return nativeProgramDateTime()
    },
    destroy() {
      hls?.destroy()
      hls = null
    },
  }
}
