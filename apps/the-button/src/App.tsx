import { useEffect, useRef, useState } from "react"
import { Button } from "@algovn/ui/button"
import { AchievementsGrid } from "./components/achievements-grid"
import { Callback } from "./components/callback"
import { ClickButton } from "./components/click-button"
import { Counter } from "./components/counter"
import { MilestoneBanner } from "./components/milestone-banner"
import { ParticleLayer, useParticles } from "./components/particles"
import { PersonalStats } from "./components/personal-stats"
import { ProgressBar } from "./components/progress-bar"
import { SessionStats } from "./components/session-stats"
import { StatusBar } from "./components/status-bar"
import { TargetHeadline } from "./components/target-headline"
import { WhyGrid } from "./components/why-grid"
import { getCounter, issueChallenge, listAchievements, submitClicks } from "./lib/api"
import { signIn } from "./lib/auth"
import { Batcher } from "./lib/batcher"
import { runBench } from "./lib/bench"
import { mergeCatalog, type CatalogEntry } from "./lib/catalog"
import { createEtaEstimator, type Eta } from "./lib/eta"
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

// The banner shows the highest milestone reached, whichever source saw it
// first: a late SSE frame must not clobber a higher one from the snapshot,
// and the snapshot must not be ignored just because SSE landed first.
function higher(current: Milestone | null, next: Milestone): Milestone {
  return current && current.threshold >= next.threshold ? current : next
}

function Home() {
  const { user, token } = useAuth()
  const tokenRef = useRef<string | null>(null)
  useEffect(() => {
    tokenRef.current = token
  }, [token])
  const [total, setTotal] = useState<number | null>(null)
  const [users, setUsers] = useState<number | null>(null)
  const [mode, setMode] = useState<LiveMode>("connecting")
  const [myTotal, setMyTotal] = useState<number | null>(null)
  const [pending, setPending] = useState(0)
  const [catalog, setCatalog] = useState<CatalogEntry[]>(() => mergeCatalog(undefined))
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [eta, setEta] = useState<Eta>({ seconds: null, text: "calculating…" })
  const batcherRef = useRef<Batcher | null>(null)
  const etaRef = useRef(createEtaEstimator())
  const { particles, emit, remove } = useParticles()

  useEffect(() => {
    const solver = createWorkerSolver()
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
        if (event.type === "counter") {
          setTotal(event.total)
          if (event.users !== undefined) setUsers(event.users)
          etaRef.current.sample(event.total)
          setEta(etaRef.current.eta())
        } else {
          setMilestone(current => higher(current, { threshold: event.threshold, title: event.title }))
        }
      },
      onModeChange: setMode,
    })
    live.start()
    return () => live.stop()
  }, [])

  // One-shot snapshot on mount seeds total + users before the first SSE frame.
  useEffect(() => {
    let cancelled = false
    getCounter()
      .then(res => {
        if (cancelled) return
        if (res.total !== undefined) {
          const t = Number(res.total)
          setTotal(prev => (prev === null ? t : prev))
          etaRef.current.sample(t)
          setEta(etaRef.current.eta())
        }
        if (res.totalUsers !== undefined) setUsers(Number(res.totalUsers))
      })
      .catch(() => {
        // offline/unreachable: SSE (or polling) fills total; users stays —
      })
    return () => {
      cancelled = true
    }
  }, [])

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
        if (latest) setMilestone(current => higher(current, latest))
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
    <>
      <div className="tb-grid-bg" aria-hidden />
      <main className="relative z-10 mx-auto flex min-h-svh max-w-3xl flex-col items-center gap-6 p-6 text-center">
      <StatusBar mode={mode} eta={eta} />
      <header className="space-y-2">
        <h1 className="font-mono text-3xl font-semibold tracking-tight sm:text-4xl">THE BUTTON.</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          One button. One goal. Millions of humans.
        </p>
      </header>
      <MilestoneBanner milestone={milestone} />
      <WhyGrid />
      <TargetHeadline />
      <Counter total={total} />
      <ProgressBar total={total} />
      {user ? (
        <ClickButton onMash={() => batcherRef.current?.click()} onParticle={emit} />
      ) : (
        <Button size="lg" onClick={() => void signIn()}>
          sign in to contribute
        </Button>
      )}
      {user && <PersonalStats myTotal={myTotal} pending={pending} total={total} />}
      <SessionStats total={total} users={users} />
      <AchievementsGrid entries={catalog} />
      <footer className="text-muted-foreground mt-4 font-mono text-xs">
        made with questionable decisions · the button
      </footer>
      <ParticleLayer particles={particles} onDone={remove} />
      </main>
    </>
  )
}
