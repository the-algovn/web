import { useEffect, useRef, useState } from "react"
import { Button } from "@algovn/ui/button"
import { Callback } from "./components/callback"
import { ClickButton } from "./components/click-button"
import { Counter } from "./components/counter"
import { Taglines } from "./components/taglines"
import { issueChallenge, submitClicks } from "./lib/api"
import { signIn } from "./lib/auth"
import { Batcher } from "./lib/batcher"
import { runBench } from "./lib/bench"
import { LiveCounter, type LiveMode } from "./lib/liveCounter"
import { createWorkerSolver } from "./lib/solverClient"
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
  const { user, token } = useAuth()
  const tokenRef = useRef<string | null>(null)
  useEffect(() => {
    tokenRef.current = token
  }, [token])
  const [total, setTotal] = useState<number | null>(null)
  const [mode, setMode] = useState<LiveMode>("connecting")
  const [myTotal, setMyTotal] = useState<number | null>(null)
  const [pending, setPending] = useState(0)
  const batcherRef = useRef<Batcher | null>(null)

  useEffect(() => {
    const solver = createWorkerSolver()
    batcherRef.current = new Batcher({
      api: { issueChallenge, submitClicks },
      solver,
      getToken: () => tokenRef.current,
      onUserTotal: setMyTotal,
      onPendingChange: setPending,
      onError: err => console.error("submit failed", err),
    })
    return () => {
      batcherRef.current = null
      solver.terminate()
    }
  }, [])

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

  const benchRan = useRef(false)
  useEffect(() => {
    if (benchRan.current) return
    if (new URLSearchParams(window.location.search).has("bench")) {
      benchRan.current = true
      void runBench()
    }
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
        <ClickButton
          onMash={() => batcherRef.current?.click()}
          myTotal={myTotal}
          pending={pending}
        />
      ) : (
        <Button size="lg" onClick={() => void signIn()}>
          sign in to contribute
        </Button>
      )}
    </main>
  )
}
