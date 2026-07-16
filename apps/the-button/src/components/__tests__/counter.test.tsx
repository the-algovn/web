import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { Counter } from "../counter"

// Fake timers (same convention as batcher.test.ts / liveCounter.test.ts) make
// the 600ms rAF tween deterministic instead of racing real wall-clock time,
// which flaked under CI load when turbo ran other apps' builds concurrently.
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it("renders em dash when total is null", () => {
  render(<Counter total={null} />)
  expect(screen.getByTestId("counter")).toHaveTextContent("—")
})

it("renders CURRENT_COUNT label and tweens to the grouped total", async () => {
  render(<Counter total={12345} />)
  expect(screen.getByText("CURRENT_COUNT")).toBeInTheDocument()
  await vi.advanceTimersByTimeAsync(600)
  // number is split into per-character spans, so assert on textContent
  const el = screen.getByTestId("counter")
  expect(el.textContent?.replace(/\s/g, "")).toContain("12,345")
})
