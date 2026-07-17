import { useSignInCallback } from "@algovn/auth"
import { completeSignIn } from "../lib/auth"

// IMPORTANT: onDone must swap the view with history.replaceState — a full
// navigation would reload the page and wipe the in-memory user store.
export function Callback({ onDone }: { onDone: () => void }) {
  const { error } = useSignInCallback(completeSignIn, onDone)

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
