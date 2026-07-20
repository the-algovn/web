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

export function createHlsPlayer(
  audio: HTMLAudioElement,
  opts: { streamUrl: string },
): RadioPlayer {
  const hub = stateHub("idle")
  let hls: import("hls.js").default | null = null
  let attached = false
  audio.addEventListener("playing", () => hub.set("playing"))
  audio.addEventListener("pause", () => hub.set("paused"))
  audio.addEventListener("waiting", () => hub.set("stalled"))

  async function attach() {
    if (attached) return
    attached = true
    // Safari plays HLS natively; elsewhere use hls.js (lazy — never loaded in jsdom).
    if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      audio.src = opts.streamUrl
      return
    }
    const Hls = (await import("hls.js")).default
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
      // hls.js exposes PROGRAM-DATE-TIME per fragment; map audible currentTime to it.
      const level = hls?.currentLevel ?? -1
      const details = level >= 0 ? hls?.levels?.[level]?.details : undefined
      const frag = details?.fragments?.find(
        (f) =>
          audio.currentTime >= f.start &&
          audio.currentTime < f.start + f.duration,
      )
      if (frag && typeof frag.programDateTime === "number") {
        return frag.programDateTime + (audio.currentTime - frag.start) * 1000
      }
      return null
    },
    destroy() {
      hls?.destroy()
      hls = null
    },
  }
}
