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

it("shows a placeholder before the first total arrives", () => {
  render(<Counter total={null} />)
  expect(screen.getByTestId("counter")).toHaveTextContent("—")
})

it("tweens to the new total", async () => {
  const { rerender } = render(<Counter total={null} />)
  rerender(<Counter total={1234} />)
  await vi.advanceTimersByTimeAsync(600)
  expect(screen.getByTestId("counter")).toHaveTextContent("1,234")
})
