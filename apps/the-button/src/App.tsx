import { useEffect, useState } from "react"
import { Button } from "@algovn/ui/button"
import { Callback } from "./components/callback"
import { Counter } from "./components/counter"
import { Taglines } from "./components/taglines"
import { signIn } from "./lib/auth"
import { LiveCounter, type LiveMode } from "./lib/liveCounter"
import { useAuth } from "./lib/use-auth"

// No router: the app has exactly two views — the page and the OIDC callback.
export default function App() {
  const [isCallback, setIsCallback] = useState(() =>
    window.location.pathname.endsWith("/callback")
  )
  if (isCallback) {
    return (
      <Callback
        onDone={() => {
          window.history.replaceState(null, "", "/the-button/")
          setIsCallback(false)
        }}
      />
    )
  }
  return <Home />
}

function Home() {
  const { user } = useAuth()
  const [total, setTotal] = useState<number | null>(null)
  const [mode, setMode] = useState<LiveMode>("connecting")

  useEffect(() => {
    const live = new LiveCounter({
      onEvent: event => {
        if (event.type === "counter") setTotal(event.total)
      },
      onModeChange: setMode,
    })
    live.start()
    return () => live.stop()
  }, [])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-6 text-center">
      <header className="space-y-3">
        <h1 className="font-mono text-3xl font-semibold tracking-tight sm:text-4xl">the button</h1>
        <Taglines />
      </header>
      <Counter total={total} />
      <p className="text-muted-foreground text-xs">
        {mode === "live" ? "live" : mode === "polling" ? "live updates degraded — polling" : "connecting…"}
      </p>
      {user ? (
        <p className="text-sm">
          signed in as {user.profile.preferred_username ?? user.profile.sub}
        </p>
      ) : (
        <Button size="lg" onClick={() => void signIn()}>
          sign in to contribute
        </Button>
      )}
    </main>
  )
}
