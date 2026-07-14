import { useEffect, useRef, useState } from "react"
import { Button } from "@algovn/ui/button"
import { AchievementsGrid } from "./components/achievements-grid"
import { Callback } from "./components/callback"
import { ClickButton } from "./components/click-button"
import { Counter } from "./components/counter"
import { MilestoneBanner } from "./components/milestone-banner"
import { Taglines } from "./components/taglines"
import { issueChallenge, listAchievements, submitClicks } from "./lib/api"
import { signIn } from "./lib/auth"
import { Batcher } from "./lib/batcher"
import { runBench } from "./lib/bench"
import { mergeCatalog, type CatalogEntry } from "./lib/catalog"
import { LiveCounter, type LiveMode } from "./lib/liveCounter"
import { createWorkerSolver } from "./lib/solverClient"
import { createUnlockAnnouncer } from "./lib/unlocks"
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

type Milestone = { threshold: number; title: string }

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
  const [catalog, setCatalog] = useState<CatalogEntry[]>(() => mergeCatalog(undefined))
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const batcherRef = useRef<Batcher | null>(null)

  useEffect(() => {
    const solver = createWorkerSolver()
    // One announcer per mount: it remembers ids it has already toasted, so a
    // re-render or a duplicate SubmitClicksResponse never re-toasts them.
    const announce = createUnlockAnnouncer()
    batcherRef.current = new Batcher({
      api: { issueChallenge, submitClicks },
      solver,
      getToken: () => tokenRef.current,
      onUserTotal: setMyTotal,
      onPendingChange: setPending,
      onUnlocked: unlocked => {
        announce(unlocked)
        setCatalog(prev =>
          prev.map(entry => {
            const hit = unlocked.find(a => a.id === entry.id)
            return hit
              ? { ...entry, unlockedAt: hit.unlockedAt ?? new Date().toISOString() }
              : entry
          })
        )
      },
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
        else setMilestone({ threshold: event.threshold, title: event.title })
      },
      onModeChange: setMode,
    })
    live.start()
    return () => live.stop()
  }, [])

  // Catalog + reached milestones on load; personalized when a token exists
  // (the anonymous rule still forwards the verified Authorization header).
  useEffect(() => {
    let cancelled = false
    listAchievements(token ?? undefined)
      .then(res => {
        if (cancelled) return
        setCatalog(mergeCatalog(res.catalog))
        const latest = (res.milestones ?? [])
          .map(m => ({ threshold: Number(m.threshold ?? "0"), title: m.title ?? "" }))
          .filter(m => m.threshold > 0 && m.title !== "")
          .sort((a, b) => b.threshold - a.threshold)[0]
        if (latest) setMilestone(current => (current ? current : latest))
      })
      .catch(() => {
        // offline/unreachable: the fallback catalog is already rendered
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const benchRan = useRef(false)
  useEffect(() => {
    if (benchRan.current) return
    if (new URLSearchParams(window.location.search).has("bench")) {
      benchRan.current = true
      void runBench()
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col items-center justify-center gap-8 p-6 text-center">
      <header className="space-y-3">
        <h1 className="font-mono text-3xl font-semibold tracking-tight sm:text-4xl">the button</h1>
        <Taglines />
      </header>
      <MilestoneBanner milestone={milestone} />
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
      <AchievementsGrid entries={catalog} />
    </main>
  )
}
