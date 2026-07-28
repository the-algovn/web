import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Explicit cleanup: test.globals is off, so Testing Library's auto-cleanup
// doesn't self-register (same rationale as the radio app).
afterEach(() => {
  cleanup()
})

// Restore jsdom's storage implementations shadowed by Node's global accessors —
// next-themes and oidc-client-ts touch localStorage/sessionStorage.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window
if (jsdomWindow) {
  window.localStorage ??= jsdomWindow.localStorage
  window.sessionStorage ??= jsdomWindow.sessionStorage
}

window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia

// The stage paints to a canvas. jsdom has no 2D context, and the painter is
// deliberately untested — stub just enough that mounting it never throws.
HTMLCanvasElement.prototype.getContext ??= (() => null) as never
