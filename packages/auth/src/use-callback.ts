import { useEffect, useRef, useState } from "react"

// Finishes the PKCE code exchange. IMPORTANT for callers: the onDone handler
// must swap the view with history.replaceState — a full navigation would
// reload the page and wipe the in-memory user store.
export function useSignInCallback(
  complete: () => Promise<unknown>,
  onDone: () => void
): { error: string | null } {
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return // StrictMode double-mount: the code is single-use
    started.current = true
    complete()
      .then(() => onDone())
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [complete, onDone])
  return { error }
}
