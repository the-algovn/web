import { useEffect, useRef, useState } from "react"
import { AchievementsGrid } from "./components/achievements-grid"
import { ActivityFeed } from "./components/activity-feed"
import { Callback } from "./components/callback"
import { ClickButton } from "./components/click-button"
import { ComboMeter } from "./components/combo-meter"
import { Counter } from "./components/counter"
import { CpsMeter } from "./components/cps-meter"
import { Hud } from "./components/hud"
import { Leaderboard } from "./components/leaderboard"
import { MilestoneBanner } from "./components/milestone-banner"
import { ParticleLayer, useParticles } from "./components/particles"
import { ProgressBar } from "./components/progress-bar"
import { Quests } from "./components/quests"
import { SessionStats } from "./components/session-stats"
import { TabBar, type Tab } from "./components/tab-bar"
import { TargetHeadline } from "./components/target-headline"
import { WhyGrid } from "./components/why-grid"
import { XpBar } from "./components/xp-bar"
import {
  getCounter,
  getLeaderboard,
  issueChallenge,
  listAchievements,
  submitClicks,
} from "./lib/api"
import { emptyFeed, pushTotal } from "./lib/activity"
import { signIn } from "./lib/auth"
import { Batcher } from "./lib/batcher"
import { runBench } from "./lib/bench"
import { mergeCatalog, type CatalogEntry } from "./lib/catalog"
import { nextMilestone } from "./lib/progress"
import { comboXpBonus, createCombo, type ComboState } from "./lib/combo"
import { pruneRecent } from "./lib/cps"
import { createEtaEstimator, type Eta } from "./lib/eta"
import { mergeDisplayTotal } from "./lib/display-total"
import { LeaderboardStream, type Row } from "./lib/leaderboardStream"
import { levelState } from "./lib/level"
import { LiveCounter, type LiveMode } from "./lib/liveCounter"
import { createWorkerSolver } from "./lib/solverClient"
import { createUnlockAnnouncer } from "./lib/unlocks"
import { useAuth } from "./lib/use-auth"
import { addComboBonus, loadComboBonus } from "./lib/xp-store"

// No router: the app has exactly two views — the page and the OIDC callback.
export default function App() {
  const [isCallback, setIsCallback] = useState(() =>
    window.location.pathname.endsWith("/callback"),
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

// Empty is treated the same as absent so the initial GET's `?? prev` never
// clobbers a board the live SSE stream already populated (the GET can resolve
// after the first stream frame, and an empty snapshot carries no information —
// the stream is the authoritative ongoing source).
function rowsOf(entries: { rank: number; displayName?: string; clicks?: string }[] | undefined): Row[] | undefined {
  if (!entries || entries.length === 0) return undefined
  return entries.map((e) => ({ rank: e.rank, name: e.displayName ?? "", clicks: Number(e.clicks ?? "0") }))
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
  // What the big counter shows: server truth plus this user's not-yet-landed
  // clicks, floored so it can never tick backward. See lib/display-total.ts.
  const [display, setDisplay] = useState<number | null>(null)
  const [stalled, setStalled] = useState(false)
  const [prevInputs, setPrevInputs] = useState<{ total: number | null; pending: number }>({
    total: null,
    pending: 0,
  })
  const [catalog, setCatalog] = useState<CatalogEntry[]>(() =>
    mergeCatalog(undefined),
  )
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [eta, setEta] = useState<Eta>({ seconds: null, text: "calculating…" })
  const [board, setBoard] = useState<{ allTime: Row[]; thisWeek: Row[] }>({ allTime: [], thisWeek: [] })
  const [myRank, setMyRank] = useState<{ allTime?: number; weekly?: number }>({})

  // Cosmetic gamification (never affects submitted clicks).
  const [tab, setTab] = useState<Tab>("play")
  const [combo, setCombo] = useState<ComboState>({ heat: 0, multiplier: 1, label: "idle" })
  // Lazy init (not an effect): reads the persisted cosmetic bonus once at
  // mount without an extra post-mount render.
  const [xpBonus, setXpBonus] = useState(() => loadComboBonus())
  const [cps, setCps] = useState(0)
  const [cpsHistory, setCpsHistory] = useState<number[]>([])
  const [feed, setFeed] = useState(emptyFeed)

  const batcherRef = useRef<Batcher | null>(null)
  const etaRef = useRef(createEtaEstimator())
  const comboRef = useRef(createCombo())
  const clickTimesRef = useRef<number[]>([])
  const lastCpsRef = useRef(0)
  const { particles, emit, remove } = useParticles()

  useEffect(() => {
    const solver = createWorkerSolver()
    const announce = createUnlockAnnouncer()
    batcherRef.current = new Batcher({
      api: { issueChallenge, submitClicks },
      solver,
      getToken: () => tokenRef.current,
      onUserTotal: setMyTotal,
      onRank: (allTime, weekly) => setMyRank({ allTime, weekly }),
      onPendingChange: setPending,
      onStallChange: setStalled,
      onUnlocked: (unlocked) => {
        announce(unlocked)
        setCatalog((prev) =>
          prev.map((entry) => {
            const hit = unlocked.find((a) => a.id === entry.id)
            return hit
              ? {
                  ...entry,
                  unlockedAt: hit.unlockedAt ?? new Date().toISOString(),
                }
              : entry
          }),
        )
      },
      onError: (err) => console.error("submit failed", err),
    })
    return () => {
      batcherRef.current?.dispose()
      batcherRef.current = null
      solver.terminate()
    }
  }, [])

  useEffect(() => {
    const live = new LiveCounter({
      onEvent: (event) => {
        if (event.type === "counter") {
          setTotal(event.total)
          if (event.users !== undefined) setUsers(event.users)
          etaRef.current.sample(event.total)
          setEta(etaRef.current.eta())
          setFeed((f) => pushTotal(f, event.total))
        } else {
          setMilestone((current) =>
            higher(current, { threshold: event.threshold, title: event.title }),
          )
        }
      },
      onModeChange: setMode,
    })
    live.start()
    return () => live.stop()
  }, [])

  useEffect(() => {
    const stream = new LeaderboardStream({ onFrame: setBoard })
    stream.start()
    return () => stream.stop()
  }, [])

  // Decay the combo and recompute clicks/sec on a fixed tick. Skipped when
  // there is nothing to report: no recent clicks, combo already fully decayed
  // before and after this tick, and the last displayed cps was already 0 —
  // otherwise this timer would re-render Home forever, even at rest.
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now()
      const wasIdle = comboRef.current.state().heat === 0
      const next = comboRef.current.tick(now)
      clickTimesRef.current = pruneRecent(clickTimesRef.current, now)
      const c = clickTimesRef.current.length
      if (c === 0 && next.heat === 0 && wasIdle && lastCpsRef.current === 0) {
        return
      }
      setCombo(next)
      setCps(c)
      setCpsHistory((h) => [...h.slice(-15), c])
      lastCpsRef.current = c
    }, 250)
    return () => clearInterval(id)
  }, [])

  // One-shot snapshot on mount seeds total + users before the first SSE frame.
  useEffect(() => {
    let cancelled = false
    getCounter()
      .then((res) => {
        if (cancelled) return
        if (res.total !== undefined) {
          const t = Number(res.total)
          setTotal((prev) => (prev === null ? t : prev))
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
      .then((res) => {
        if (cancelled) return
        setCatalog(mergeCatalog(res.catalog))
        // Seed once. protojson omits zero-valued fields, so an authed user
        // with zero clicks sends no userTotalClicks — indistinguishable on the
        // wire from an anonymous response, hence the local `if (token)`. And
        // `prev ??` stops a token renewal from re-seeding a snapshot that is
        // now stale relative to submits that have already landed.
        if (token) setMyTotal((prev) => prev ?? Number(res.userTotalClicks ?? 0))
        const latest = (res.milestones ?? [])
          .map((m) => ({
            threshold: Number(m.threshold ?? "0"),
            title: m.title ?? "",
          }))
          .filter((m) => m.threshold > 0 && m.title !== "")
          .sort((a, b) => b.threshold - a.threshold)[0]
        if (latest) setMilestone((current) => higher(current, latest))
      })
      .catch(() => {
        // offline/unreachable: the fallback catalog is already rendered
      })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    getLeaderboard(token ?? undefined)
      .then((res) => {
        if (cancelled) return
        setBoard((prev) => ({
          allTime: rowsOf(res.allTime) ?? prev.allTime,
          thisWeek: rowsOf(res.thisWeek) ?? prev.thisWeek,
        }))
        if (res.myAllTimeRank || res.myWeeklyRank) {
          setMyRank({ allTime: res.myAllTimeRank ?? 0, weekly: res.myWeeklyRank ?? 0 })
        }
      })
      .catch(() => {})
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

  // Fold the monotonic floor in as inputs change, using React's documented
  // "adjust state during render" pattern (no effect: avoids the extra render
  // set-state-in-effect flags, and no render-time ref access).
  if (prevInputs.total !== total || prevInputs.pending !== pending) {
    setPrevInputs({ total, pending })
    setDisplay((prev) => mergeDisplayTotal(total, pending, prev ?? 0))
  }

  // One real click per press. Combo only drives cosmetic juice + XP bonus.
  function handleMash() {
    const now = performance.now()
    const s = comboRef.current.press(now)
    setCombo(s)
    clickTimesRef.current = pruneRecent([...clickTimesRef.current, now], now)
    setCps(clickTimesRef.current.length)
    const bonus = comboXpBonus(s.multiplier)
    if (bonus > 0) setXpBonus(addComboBonus(bonus))
    batcherRef.current?.click()
  }

  const lvl = levelState(myTotal ?? 0, xpBonus)
  const myClicks = (myTotal ?? 0) + pending
  let toNext: number | null = null
  if (total !== null) {
    const m = nextMilestone(total)
    if (m) toNext = m.threshold - total
  }

  return (
    <>
      <div className="tb-grid-bg" aria-hidden />
      <main className="tb-main relative z-10 mx-auto w-full max-w-6xl p-4 sm:p-6">
        <div className="tb-app" data-tab={tab}>
          <Hud mode={mode} level={lvl.level} streakDays={null} rank={myRank.allTime ?? null} />

          <div className="tb-grid">
            {/* STATS — mission/context band across the top */}
            <div className="tb-area-lore" data-group="stats">
              <SessionStats total={total} users={users} />
              <div className="tb-box p-4 text-left font-mono text-xs">
                <span className="text-muted-foreground">ETA: </span>
                <span className="text-primary font-bold">{eta.text}</span>
              </div>
              <TargetHeadline />
              <WhyGrid />
            </div>

            {/* PLAY — left play column */}
            <section className="tb-area-hero" data-group="play" aria-label="the button">
              <MilestoneBanner milestone={milestone} />
              <Counter
                total={display}
                secondary={
                  toNext !== null ? (
                    <div className="hidden shrink-0 text-right font-mono sm:block">
                      <div className="text-muted-foreground text-[0.65rem] tracking-widest">
                        TO NEXT
                      </div>
                      <div className="text-primary text-xl font-bold tabular-nums sm:text-2xl">
                        {toNext.toLocaleString("en-US")}
                      </div>
                    </div>
                  ) : undefined
                }
              />
              <p className="text-muted-foreground font-mono text-xs">
                you contributed{" "}
                <b className="text-primary tabular-nums" data-testid="your-clicks">
                  {myClicks.toLocaleString("en-US")}
                </b>{" "}
                clicks
                {stalled && (
                  <span className="text-muted-foreground ml-2" role="status">
                    ⚠ retrying
                  </span>
                )}
              </p>
              <ProgressBar total={total} />
              {user ? (
                <ClickButton onMash={handleMash} onParticle={emit} />
              ) : (
                <button
                  type="button"
                  onClick={() => void signIn()}
                  className="tb-ghost focus-visible:ring-ring/50 flex w-full items-center justify-center gap-3 px-8 py-6 font-mono text-xl font-bold tracking-widest outline-none focus-visible:ring-[3px]"
                >
                  <span className="text-2xl font-normal" aria-hidden>
                    ▶
                  </span>
                  <span>SIGN IN TO CONTRIBUTE</span>
                </button>
              )}
              <div className="tb-meters">
                <ComboMeter multiplier={combo.multiplier} heat={combo.heat} label={combo.label} />
                <CpsMeter cps={cps} history={cpsHistory} />
              </div>
              <XpBar level={lvl.level} pct={lvl.pct} xpIntoLevel={lvl.xpIntoLevel} xpForNext={lvl.xpForNext} />
            </section>

            {/* SIDE — right column: live social (RANKS) over progression (GOALS),
                stacked so the column fills the hero's height instead of leaving a void */}
            <div className="tb-area-side">
              <div data-group="ranks">
                <Leaderboard
                  allTime={board.allTime}
                  thisWeek={board.thisWeek}
                  myRank={myRank}
                  myName={user?.profile?.name ?? null}
                />
              </div>
              <div data-group="ranks">
                <ActivityFeed items={feed.items} />
              </div>
              <div data-group="goals">
                <Quests />
              </div>
              <div data-group="goals">
                <AchievementsGrid entries={catalog} />
              </div>
            </div>

          </div>

          <TabBar active={tab} onChange={setTab} />
        </div>

        <footer className="text-muted-foreground mt-6 flex items-center justify-center gap-3 font-mono text-xs">
          <span>made with questionable decisions</span>
          <span className="opacity-30">•</span>
          <span>the button</span>
        </footer>
        <ParticleLayer particles={particles} onDone={remove} />
      </main>
    </>
  )
}
