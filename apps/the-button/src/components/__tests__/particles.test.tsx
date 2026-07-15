import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useParticles } from "../particles"

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

afterEach(() => vi.unstubAllGlobals())

describe("useParticles", () => {
  it("emits a particle when motion is allowed", () => {
    setReducedMotion(false)
    const { result } = renderHook(() => useParticles())
    act(() => result.current.emit(10, 20))
    expect(result.current.particles).toHaveLength(1)
  })
  it("emits nothing when reduced motion is preferred", () => {
    setReducedMotion(true)
    const { result } = renderHook(() => useParticles())
    act(() => result.current.emit(10, 20))
    expect(result.current.particles).toHaveLength(0)
  })
  it("removes a particle by id", () => {
    setReducedMotion(false)
    const { result } = renderHook(() => useParticles())
    act(() => result.current.emit(10, 20))
    const id = result.current.particles[0]!.id
    act(() => result.current.remove(id))
    expect(result.current.particles).toHaveLength(0)
  })
})
