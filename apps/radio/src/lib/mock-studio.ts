import type {
  ConnMode,
  HistoryItem,
  NowPlaying,
  QueueItem,
  RadioClient,
} from "./radio-client"

interface ScheduleItem {
  kind: NowPlaying["kind"]
  title: string
  artist?: string
  durationSeconds: number
  dedication?: string
  hasDedication?: boolean // whether this item carries a (hidden) dedication in the queue
}

// A looping đêm-khuya set. Some tracks carry a dedication; a couple of DJ talk
// slots break it up. Recipients live only in `dedication` (the DJ's line that
// airs); the queue exposes hasDedication, never a name.
const SCHEDULE: ScheduleItem[] = [
  {
    kind: "track",
    title: "Em Của Ngày Hôm Qua",
    artist: "Sơn Tùng M-TP",
    durationSeconds: 258,
    dedication: "🌙 Gửi Ngọc — chúc ngủ ngon nha",
    hasDedication: true,
  },
  { kind: "dj", title: "Tiểu Dương Dương tâm sự", durationSeconds: 42 },
  {
    kind: "track",
    title: "Nơi Này Có Anh",
    artist: "Sơn Tùng M-TP",
    durationSeconds: 269,
    hasDedication: true,
  },
  {
    kind: "track",
    title: "Chạy Ngay Đi",
    artist: "Sơn Tùng M-TP",
    durationSeconds: 248,
  },
  {
    kind: "track",
    title: "Lạc Trôi",
    artist: "Sơn Tùng M-TP",
    durationSeconds: 234,
    dedication: "Tặng cả nhà đang thức khuya 💛",
    hasDedication: true,
  },
  { kind: "jingle", title: "Tần Số 42 — nhận diện đài", durationSeconds: 12 },
  {
    kind: "track",
    title: "Muộn Rồi Mà Sao Còn",
    artist: "Sơn Tùng M-TP",
    durationSeconds: 271,
  },
]

function itemAt(index: number): ScheduleItem {
  const item = SCHEDULE[index]
  if (!item) throw new Error(`schedule index out of range: ${index}`)
  return item
}

const CYCLE_SECONDS = SCHEDULE.reduce((s, i) => s + i.durationSeconds, 0)
const TICK_MS = 500
const EPOCH_ANCHOR = 1_700_000_000_000 // schedule item 0 "started" here

export interface MockStudioOptions {
  now?: () => number
  random?: () => number
}

export class MockStudio implements RadioClient {
  private readonly now: () => number
  private readonly random: () => number
  private npSubs = new Set<(np: NowPlaying) => void>()
  private queueSubs = new Set<(q: QueueItem[]) => void>()
  private lastIndex = -1
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(opts: MockStudioOptions = {}) {
    this.now = opts.now ?? Date.now
    this.random = opts.random ?? Math.random
  }

  /** Index into SCHEDULE and seconds elapsed within the current item. */
  private position(): { index: number; elapsed: number; itemStartMs: number } {
    const n = this.now()
    const t = Math.floor((n - EPOCH_ANCHOR) / 1000)
    let rem = ((t % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS
    const cycleStart = EPOCH_ANCHOR + (t - rem) * 1000 // call-independent, integer ms
    let index = 0
    for (const item of SCHEDULE) {
      if (rem < item.durationSeconds) break
      rem -= item.durationSeconds
      index++
    }
    const before = SCHEDULE.slice(0, index).reduce(
      (s, i) => s + i.durationSeconds,
      0,
    )
    return { index, elapsed: rem, itemStartMs: cycleStart + before * 1000 }
  }

  playheadMs(): number {
    return this.now()
  }

  private listeners(): number {
    return 12 + Math.floor(this.random() * 12) // 12–23, drifts with the clock
  }

  private nowPlayingAt(index: number, itemStartMs: number): NowPlaying {
    const item = itemAt(index)
    const np: NowPlaying = {
      kind: item.kind,
      title: item.title,
      startedAt: new Date(itemStartMs).toISOString(),
      durationSeconds: item.durationSeconds,
      listeners: this.listeners(),
    }
    if (item.artist) np.artist = item.artist
    if (item.dedication) np.dedication = item.dedication
    return np
  }

  private queueFrom(index: number): QueueItem[] {
    return [1, 2, 3].map((offset) => {
      const item = itemAt((index + offset) % SCHEDULE.length)
      const q: QueueItem = {
        title: item.title,
        hasDedication: item.hasDedication === true,
      }
      if (item.artist) q.artist = item.artist
      return q
    })
  }

  async getNowPlaying(): Promise<NowPlaying> {
    const { index, itemStartMs } = this.position()
    return this.nowPlayingAt(index, itemStartMs)
  }

  async getQueue(): Promise<QueueItem[]> {
    return this.queueFrom(this.position().index)
  }

  async getHistory(): Promise<HistoryItem[]> {
    const { index, itemStartMs } = this.position()
    return [1, 2, 3, 4].map((back) => {
      const item = itemAt(
        (index - back + SCHEDULE.length * 10) % SCHEDULE.length,
      )
      const airedAt = new Date(
        itemStartMs - back * item.durationSeconds * 1000,
      ).toISOString()
      const h: HistoryItem = { title: item.title, airedAt }
      if (item.artist) h.artist = item.artist
      return h
    })
  }

  private ensureTimer(): void {
    if (this.timer) return
    this.lastIndex = this.position().index
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  private maybeStopTimer(): void {
    if (this.npSubs.size === 0 && this.queueSubs.size === 0 && this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private tick(): void {
    const { index, itemStartMs } = this.position()
    if (index === this.lastIndex) return
    this.lastIndex = index
    const np = this.nowPlayingAt(index, itemStartMs)
    const q = this.queueFrom(index)
    this.npSubs.forEach((cb) => {
      cb(np)
    })
    this.queueSubs.forEach((cb) => {
      cb(q)
    })
  }

  subscribeNowPlaying(
    onEvent: (np: NowPlaying) => void,
    onMode?: (m: ConnMode) => void,
  ): () => void {
    onMode?.("live")
    this.npSubs.add(onEvent)
    const { index, itemStartMs } = this.position()
    onEvent(this.nowPlayingAt(index, itemStartMs)) // immediate, per-subscriber
    this.ensureTimer()
    return () => {
      this.npSubs.delete(onEvent)
      this.maybeStopTimer()
    }
  }

  subscribeQueue(
    onEvent: (q: QueueItem[]) => void,
    onMode?: (m: ConnMode) => void,
  ): () => void {
    onMode?.("live")
    this.queueSubs.add(onEvent)
    onEvent(this.queueFrom(this.position().index)) // immediate
    this.ensureTimer()
    return () => {
      this.queueSubs.delete(onEvent)
      this.maybeStopTimer()
    }
  }

  async heartbeat(_sessionId: string): Promise<void> {
    // presence is a no-op against the mock
  }
}
