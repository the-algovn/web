import { useEffect, useRef, useState } from "react"
import { completeSignIn } from "../lib/auth"

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
    <main className="flex min-h-svh items-center justify-center p-6 text-sm">
      {error ? <p className="text-destructive">sign-in failed: {error}</p> : <p className="text-muted-foreground">signing you in…</p>}
    </main>
  )
}
