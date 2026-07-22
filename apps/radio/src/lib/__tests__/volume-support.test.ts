import { describe, expect, it } from "vitest"
import { volumeIsControllable } from "../volume-support"

// A stand-in for HTMLAudioElement whose `volume` accepts writes.
function writableAudio(initial = 0.8): HTMLAudioElement {
  let v = initial
  return {
    get volume() {
      return v
    },
    set volume(next: number) {
      v = next
    },
  } as HTMLAudioElement
}

// iOS Safari's behaviour: the write is accepted but silently ignored.
function readOnlyAudio(fixed = 1): HTMLAudioElement {
  return {
    get volume() {
      return fixed
    },
    set volume(_next: number) {
      /* ignored, exactly as on iOS */
    },
  } as HTMLAudioElement
}

describe("volumeIsControllable", () => {
  it("is true when a written value reads back", () => {
    expect(volumeIsControllable(writableAudio())).toBe(true)
  })

  it("is false when the write is silently ignored", () => {
    expect(volumeIsControllable(readOnlyAudio())).toBe(false)
  })

  it("restores the original volume after probing", () => {
    const audio = writableAudio(0.42)
    volumeIsControllable(audio)
    expect(audio.volume).toBeCloseTo(0.42)
  })

  it("is false when the setter throws", () => {
    const audio = {
      get volume() {
        return 1
      },
      set volume(_next: number) {
        throw new Error("nope")
      },
    } as HTMLAudioElement
    expect(volumeIsControllable(audio)).toBe(false)
  })
})
