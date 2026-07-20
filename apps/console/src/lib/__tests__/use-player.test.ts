import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { createFakeAudio, type FakeAudio } from "../../test-utils/fake-audio"
import { usePlayer } from "../use-player"

const t1 = { ytId: "a", title: "One", artifactId: "art-1" }
const t2 = { ytId: "b", title: "Two", artifactId: "art-2" }
const t3 = { ytId: "c", title: "Three", artifactId: "art-3" }

const resolveUrl = (id: string) => Promise.resolve(`art:${id}`)

function render(audio: FakeAudio) {
  return renderHook(() =>
    usePlayer({ audio: audio as unknown as HTMLAudioElement, resolveUrl }),
  )
}

describe("usePlayer", () => {
  let audio: FakeAudio
  beforeEach(() => {
    audio = createFakeAudio()
  })

  it("loads a track by index and plays it", async () => {
    const { result } = render(audio)
    act(() => result.current.setQueue([t1, t2]))
    await act(async () => {
      result.current.load(0)
    })
    expect(audio.src).toBe("art:art-1")
    expect(result.current.status).toBe("playing")
    expect(result.current.track?.ytId).toBe("a")
    expect(result.current.canNext).toBe(true)
    expect(result.current.canPrev).toBe(false)
  })

  it("toggles pause and play", async () => {
    const { result } = render(audio)
    act(() => result.current.setQueue([t1]))
    await act(async () => {
      result.current.load(0)
    })
    expect(result.current.status).toBe("playing")
    act(() => result.current.toggle())
    expect(result.current.status).toBe("paused")
  })

  it("steps next/prev within the page and clamps at edges", async () => {
    const { result } = render(audio)
    act(() => result.current.setQueue([t1, t2, t3]))
    await act(async () => {
      result.current.load(0)
    })
    await act(async () => {
      result.current.next()
    })
    expect(result.current.track?.ytId).toBe("b")
    await act(async () => {
      result.current.prev()
    })
    expect(result.current.track?.ytId).toBe("a")
    await act(async () => {
      result.current.prev() // clamp
    })
    expect(result.current.track?.ytId).toBe("a")
  })

  it("auto-advances on ended, stops at the last row", async () => {
    const { result } = render(audio)
    act(() => result.current.setQueue([t1, t2]))
    await act(async () => {
      result.current.load(0)
    })
    await act(async () => {
      audio.emit("ended")
    })
    expect(result.current.track?.ytId).toBe("b")
    await act(async () => {
      audio.emit("ended")
    })
    expect(result.current.status).toBe("idle")
    expect(result.current.track).toBeNull()
  })

  it("keeps showing the loaded track and disables next/prev when it is off-page", async () => {
    const { result } = render(audio)
    act(() => result.current.setQueue([t1, t2]))
    await act(async () => {
      result.current.load(0)
    })
    act(() => result.current.setQueue([t2, t3])) // paged away; t1 gone
    expect(result.current.track?.ytId).toBe("a") // still shown
    expect(result.current.canNext).toBe(false)
    expect(result.current.canPrev).toBe(false)
    await act(async () => {
      result.current.next()
    })
    await act(async () => {
      result.current.prev()
    })
    expect(result.current.track?.ytId).toBe("a") // next/prev inert at index -1
  })

  it("seeks and sets volume through the audio element", () => {
    const { result } = render(audio)
    act(() => result.current.seek(30))
    expect(audio.currentTime).toBe(30)
    act(() => result.current.setVolume(0.5))
    expect(audio.volume).toBe(0.5)
    expect(result.current.volume).toBe(0.5)
  })
})
