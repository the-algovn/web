import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createFakeAudio, type FakeAudio } from "../../test-utils/fake-audio"
import { usePlayer } from "../use-player"

vi.mock("../api", () => ({ artifactUrl: (id: string) => `art:${id}` }))

const t1 = { ytId: "a", title: "One", artifactId: "art-1" }
const t2 = { ytId: "b", title: "Two", artifactId: "art-2" }
const t3 = { ytId: "c", title: "Three", artifactId: "art-3" }

describe("usePlayer", () => {
  let audio: FakeAudio
  beforeEach(() => {
    audio = createFakeAudio()
  })

  it("loads a track by index and plays it", async () => {
    const { result } = renderHook(() => usePlayer({ audio: audio as unknown as HTMLAudioElement }))
    act(() => result.current.setQueue([t1, t2]))
    act(() => result.current.load(0))
    expect(audio.src).toBe("art:art-1")
    await waitFor(() => expect(result.current.status).toBe("playing"))
    expect(result.current.track?.ytId).toBe("a")
    expect(result.current.canNext).toBe(true)
    expect(result.current.canPrev).toBe(false)
  })

  it("toggles pause and play", async () => {
    const { result } = renderHook(() => usePlayer({ audio: audio as unknown as HTMLAudioElement }))
    act(() => result.current.setQueue([t1]))
    act(() => result.current.load(0))
    await waitFor(() => expect(result.current.status).toBe("playing"))
    act(() => result.current.toggle())
    expect(result.current.status).toBe("paused")
  })

  it("steps next/prev within the page and clamps at edges", async () => {
    const { result } = renderHook(() => usePlayer({ audio: audio as unknown as HTMLAudioElement }))
    act(() => result.current.setQueue([t1, t2, t3]))
    act(() => result.current.load(0))
    act(() => result.current.next())
    expect(result.current.track?.ytId).toBe("b")
    act(() => result.current.prev())
    expect(result.current.track?.ytId).toBe("a")
    act(() => result.current.prev()) // clamp
    expect(result.current.track?.ytId).toBe("a")
  })

  it("auto-advances on ended, stops at the last row", async () => {
    const { result } = renderHook(() => usePlayer({ audio: audio as unknown as HTMLAudioElement }))
    act(() => result.current.setQueue([t1, t2]))
    act(() => result.current.load(0))
    act(() => audio.emit("ended"))
    expect(result.current.track?.ytId).toBe("b")
    act(() => audio.emit("ended"))
    expect(result.current.status).toBe("idle")
    expect(result.current.track).toBeNull()
  })

  it("keeps showing the loaded track and disables next/prev when it is off-page", async () => {
    const { result } = renderHook(() => usePlayer({ audio: audio as unknown as HTMLAudioElement }))
    act(() => result.current.setQueue([t1, t2]))
    act(() => result.current.load(0))
    act(() => result.current.setQueue([t2, t3])) // paged away; t1 gone
    expect(result.current.track?.ytId).toBe("a") // still shown
    expect(result.current.canNext).toBe(false)
    expect(result.current.canPrev).toBe(false)
    act(() => result.current.next())
    act(() => result.current.prev())
    expect(result.current.track?.ytId).toBe("a") // next/prev inert at index -1
  })

  it("seeks and sets volume through the audio element", () => {
    const { result } = renderHook(() => usePlayer({ audio: audio as unknown as HTMLAudioElement }))
    act(() => result.current.seek(30))
    expect(audio.currentTime).toBe(30)
    act(() => result.current.setVolume(0.5))
    expect(audio.volume).toBe(0.5)
    expect(result.current.volume).toBe(0.5)
  })
})
