import { StrictMode } from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import { useSignInCallback } from "../index"

it("completes the exchange and signals done", async () => {
  const complete = vi.fn().mockResolvedValue({ access_token: "tok" })
  const onDone = vi.fn()
  renderHook(() => useSignInCallback(complete, onDone))
  await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
  expect(complete).toHaveBeenCalledTimes(1)
})

it("calls complete exactly once under a StrictMode double-mount", async () => {
  // React re-runs effects in StrictMode. The PKCE code is single-use, so a
  // second exchange would fail — the ref guard must suppress it.
  const complete = vi.fn().mockResolvedValue({ access_token: "tok" })
  const onDone = vi.fn()
  renderHook(() => useSignInCallback(complete, onDone), { wrapper: StrictMode })
  await waitFor(() => expect(onDone).toHaveBeenCalled())
  expect(complete).toHaveBeenCalledTimes(1)
})

it("surfaces the failure message and does not signal done", async () => {
  const complete = vi.fn().mockRejectedValue(new Error("code expired"))
  const onDone = vi.fn()
  const { result } = renderHook(() => useSignInCallback(complete, onDone))
  await waitFor(() => expect(result.current.error).toBe("code expired"))
  expect(onDone).not.toHaveBeenCalled()
})

it("stringifies a non-Error rejection", async () => {
  const complete = vi.fn().mockRejectedValue("boom")
  const onDone = vi.fn()
  const { result } = renderHook(() => useSignInCallback(complete, onDone))
  await waitFor(() => expect(result.current.error).toBe("boom"))
})
