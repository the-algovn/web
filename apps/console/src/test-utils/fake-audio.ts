import { vi } from "vitest"

// Minimal HTMLAudioElement stand-in for jsdom (which implements no media API).
// `emit` fires media events the hook subscribes to.
export class FakeAudio extends EventTarget {
  src = ""
  currentTime = 0
  duration = 0
  volume = 1
  paused = true
  play = vi.fn(async () => {
    this.paused = false
  })
  pause = vi.fn(() => {
    this.paused = true
  })
  emit(type: string) {
    this.dispatchEvent(new Event(type))
  }
}

export function createFakeAudio(): FakeAudio {
  return new FakeAudio()
}
