import { useSignInCallback } from "@algovn/auth"
import { completeSignIn } from "../lib/auth"

export function Callback({ onDone }: { onDone: () => void }) {
  const { error } = useSignInCallback(completeSignIn, onDone)
  return (
    <main className="flex min-h-svh items-center justify-center p-6 text-sm">
      {error ? (
        <p className="text-destructive">sign-in failed: {error}</p>
      ) : (
        <p className="text-muted-foreground">signing you in…</p>
      )}
    </main>
  )
}
