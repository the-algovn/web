import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Testing Library's auto-cleanup only self-registers when it finds a global
// `afterEach` (see @testing-library/react/dist/index.js). This project doesn't
// set `test.globals: true`, so `afterEach` isn't global and DOM from one `it()`
// leaks into the next within a file, causing "multiple elements" query errors
// once tests share matching text/roles. Register cleanup explicitly instead.
afterEach(() => {
  cleanup()
})

// Newer Node versions define global `localStorage`/`sessionStorage` accessors that
// return undefined without `--localstorage-file`. Vitest's jsdom environment only
// copies a fixed allowlist of keys onto the test global when the key already exists
// there, so these two get shadowed instead of falling through to jsdom's real,
// per-window implementations. Restore them from the environment's JSDOM instance.
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

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

HTMLElement.prototype.hasPointerCapture ??= () => false
HTMLElement.prototype.setPointerCapture ??= () => {}
HTMLElement.prototype.releasePointerCapture ??= () => {}
HTMLElement.prototype.scrollIntoView ??= () => {}
