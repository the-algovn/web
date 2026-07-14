import { beforeEach, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { announceUnlocks, createUnlockAnnouncer } from "../unlocks"

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

beforeEach(() => {
  vi.mocked(toast.success).mockClear()
})

it("toasts each unlock with server copy when present", () => {
  announceUnlocks([
    { id: "mvh", title: "Minimum Viable Human", description: "server copy" },
    { id: "nice", title: "Nice." },
  ])
  expect(toast.success).toHaveBeenCalledTimes(2)
  expect(toast.success).toHaveBeenNthCalledWith(1, "Minimum Viable Human", {
    description: "server copy",
  })
  // falls back to the client catalog copy when the server omits fields
  expect(toast.success).toHaveBeenNthCalledWith(2, "Nice.", {
    description: "Your total crossed 69. Nice.",
  })
})

it("survives unknown achievement ids", () => {
  announceUnlocks([{ id: "mystery" }])
  expect(toast.success).toHaveBeenCalledWith("achievement unlocked", { description: undefined })
})

it("dedupes by id: a re-render or a duplicate response toasts each achievement once", () => {
  const announce = createUnlockAnnouncer()
  announce([{ id: "mvh", title: "Minimum Viable Human" }])
  // same id arrives again (duplicate response), alongside one genuinely new one
  announce([{ id: "mvh", title: "Minimum Viable Human" }, { id: "nice", title: "Nice." }])
  expect(toast.success).toHaveBeenCalledTimes(2)
  expect(toast.success).toHaveBeenNthCalledWith(1, "Minimum Viable Human", {
    description: "You clicked the button. Once. Welcome to the revolution.",
  })
  expect(toast.success).toHaveBeenNthCalledWith(2, "Nice.", {
    description: "Your total crossed 69. Nice.",
  })
})
