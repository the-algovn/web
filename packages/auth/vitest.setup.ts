import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Explicit cleanup: test.globals is off, so Testing Library's auto-cleanup
// doesn't self-register (same rationale as packages/ui/vitest.setup.ts).
// localStorage is cleared too: the auth package now persists the signed-in user
// there, so without this a stored user leaks into the next test.
afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

// Restore jsdom's storage implementations shadowed by Node's global accessors
// (same workaround as packages/ui/vitest.setup.ts) — oidc-client-ts touches
// localStorage/sessionStorage.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window
if (jsdomWindow) {
  window.localStorage ??= jsdomWindow.localStorage
  window.sessionStorage ??= jsdomWindow.sessionStorage
}

// Tests never hit the network: individual tests stub their own responses
// with vi.stubGlobal("fetch", ...).
globalThis.fetch = () => Promise.reject(new Error("network disabled in tests"))
