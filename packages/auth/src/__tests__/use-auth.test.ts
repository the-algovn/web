import { act, renderHook, waitFor } from "@testing-library/react"
import { User, type UserManager } from "oidc-client-ts"
import { expect, it, vi } from "vitest"
import { useAuth } from "../index"

function makeUser(accessToken: string, expiresAt?: number): User {
  return new User({
    access_token: accessToken,
    token_type: "Bearer",
    expires_at: expiresAt,
    profile: { sub: "user-1", iss: "https://id.algovn.com", aud: "app", exp: 0, iat: 0 },
  })
}

function fakeManager(initial: User | null) {
  const loaded: ((u: User) => void)[] = []
  const unloaded: (() => void)[] = []
  const manager = {
    getUser: vi.fn().mockResolvedValue(initial),
    events: {
      addUserLoaded: (cb: (u: User) => void) => loaded.push(cb),
      removeUserLoaded: (cb: (u: User) => void) => {
        const i = loaded.indexOf(cb)
        if (i >= 0) loaded.splice(i, 1)
      },
      addUserUnloaded: (cb: () => void) => unloaded.push(cb),
      removeUserUnloaded: (cb: () => void) => {
        const i = unloaded.indexOf(cb)
        if (i >= 0) unloaded.splice(i, 1)
      },
    },
  }
  return {
    manager: manager as unknown as UserManager,
    emitLoaded: (u: User) => loaded.forEach(cb => cb(u)),
    emitUnloaded: () => unloaded.forEach(cb => cb()),
    listenerCount: () => loaded.length + unloaded.length,
  }
}

it("exposes the already signed-in user and its access token", async () => {
  const { manager } = fakeManager(makeUser("tok-1"))
  const { result } = renderHook(() => useAuth(manager))
  await waitFor(() => expect(result.current.user).not.toBeNull())
  expect(result.current.token).toBe("tok-1")
})

it("treats an expired user as signed out", async () => {
  // expires_at one second after the epoch — long past.
  const { manager } = fakeManager(makeUser("stale", 1))
  const { result } = renderHook(() => useAuth(manager))
  await waitFor(() => expect(manager.getUser).toHaveBeenCalled())
  expect(result.current.user).toBeNull()
  expect(result.current.token).toBeNull()
})

it("starts signed out when there is no stored user", async () => {
  const { manager } = fakeManager(null)
  const { result } = renderHook(() => useAuth(manager))
  await waitFor(() => expect(manager.getUser).toHaveBeenCalled())
  expect(result.current.user).toBeNull()
  expect(result.current.token).toBeNull()
})

it("picks up a user loaded after mount", async () => {
  const { manager, emitLoaded } = fakeManager(null)
  const { result } = renderHook(() => useAuth(manager))
  await waitFor(() => expect(manager.getUser).toHaveBeenCalled())
  act(() => emitLoaded(makeUser("fresh")))
  expect(result.current.token).toBe("fresh")
})

it("clears the user when the manager unloads it", async () => {
  const { manager, emitUnloaded } = fakeManager(makeUser("tok-1"))
  const { result } = renderHook(() => useAuth(manager))
  await waitFor(() => expect(result.current.token).toBe("tok-1"))
  act(() => emitUnloaded())
  expect(result.current.user).toBeNull()
  expect(result.current.token).toBeNull()
})

it("removes both event listeners on unmount", async () => {
  const { manager, listenerCount } = fakeManager(null)
  const { unmount } = renderHook(() => useAuth(manager))
  await waitFor(() => expect(listenerCount()).toBe(2))
  unmount()
  expect(listenerCount()).toBe(0)
})
