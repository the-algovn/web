import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Explicit cleanup: test.globals is off, so Testing Library's auto-cleanup
// doesn't self-register (same rationale as packages/ui/vitest.setup.ts).
afterEach(() => {
  cleanup()
})

// Restore jsdom's storage implementations shadowed by Node's global accessors
// (same workaround as packages/ui/vitest.setup.ts) — next-themes and
// oidc-client-ts touch localStorage/sessionStorage.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window
if (jsdomWindow) {
  window.localStorage ??= jsdomWindow.localStorage
  window.sessionStorage ??= jsdomWindow.sessionStorage
}

window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia

// Tests never hit the network: individual tests stub their own responses
// with vi.stubGlobal("fetch", ...).
globalThis.fetch = () => Promise.reject(new Error("network disabled in tests"))

// jsdom implements neither EventSource nor Worker; units under test receive
// injected fakes — these stubs only keep incidental construction from throwing.
class EventSourceStub {
  onopen: (() => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  close() {}
}
globalThis.EventSource ??= EventSourceStub as unknown as typeof EventSource

class WorkerStub {
  onmessage: ((e: MessageEvent) => void) | null = null
  postMessage() {}
  terminate() {}
}
globalThis.Worker ??= WorkerStub as unknown as typeof Worker
