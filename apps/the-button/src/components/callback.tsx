import { useEffect, useRef, useState } from "react"
import { completeSignIn } from "../lib/auth"

// Finishes the PKCE code exchange. IMPORTANT: onDone must swap the view with
// history.replaceState — a full navigation would reload the page and wipe the
// in-memory user store.
export function Callback({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return // StrictMode double-mount: the code is single-use
    started.current = true
    completeSignIn()
      .then(() => onDone())
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [onDone])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      {error ? (
        <>
          <p className="text-destructive text-sm">sign-in failed: {error}</p>
          <a className="text-primary text-sm underline underline-offset-4" href="/the-button/">
            back to the button
          </a>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">signing you in…</p>
      )}
    </main>
  )
}
