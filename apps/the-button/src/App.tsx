import { useEffect, useRef, useState } from "react"
import { AchievementsGrid } from "./components/achievements-grid"
import { ActivityFeed } from "./components/activity-feed"
import { Callback } from "./components/callback"
import { ClickButton } from "./components/click-button"
import { ComboMeter } from "./components/combo-meter"
import { Counter } from "./components/counter"
import { CpsMeter } from "./components/cps-meter"
import { GoalsPanel } from "./components/goals-panel"
import { Hud } from "./components/hud"
import { Leaderboard } from "./components/leaderboard"
import { MilestoneBanner } from "./components/milestone-banner"
import { ParticleLayer, useParticles } from "./components/particles"
import { ProgressBar } from "./components/progress-bar"
import { TargetHeadline } from "./components/target-headline"
import { WhyGrid } from "./components/why-grid"
import { XpBar } from "./components/xp-bar"
import { emptyFeed, pushTotal } from "./lib/activity"
import {
  getCounter,
  getLeaderboard,
  getPlayerState,
  issueChallenge,
  playerStateFromSnapshot,
  type QuestProgress,
  submitClicks,
} from "./lib/api"
import { signIn } from "./lib/auth"
import { Batcher } from "./lib/batcher"
import { runBench } from "./lib/bench"
import { type CatalogEntry, mergeCatalog } from "./lib/catalog"
import { type ComboState, comboXpBonus, createCombo } from "./lib/combo"
import { pruneRecent } from "./lib/cps"
import { mergeDisplayTotal } from "./lib/display-total"
import { env } from "./lib/env"
import { createEtaEstimator, type Eta } from "./lib/eta"
import { LeaderboardStream, type Row } from "./lib/leaderboardStream"
import { levelState } from "./lib/level"
import { LiveCounter, type LiveMode } from "./lib/liveCounter"
import { PlayerStream, type UserFrame } from "./lib/playerStream"
import { nextMilestone } from "./lib/progress"
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
function rowsOf(
  entries:
    | { rank: number; displayName?: string; clicks?: string }[]
    | undefined,
): Row[] | undefined {
  if (!entries || entries.length === 0) return undefined
  return entries.map((e) => ({
    rank: e.rank,
    name: e.displayName ?? "",
    clicks: Number(e.clicks ?? "0"),
  }))
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
  const [prevInputs, setPrevInputs] = useState<{
    total: number | null
    pending: number
  }>({
    total: null,
    pending: 0,
  })
  // What "you contributed" shows: same floor pattern as `display` above, but
  // over myTotal + pending. Under pure-ack, `pending` drops to 0 the instant
  // a submit is acked, while `myTotal` only rises later when the per-user SSE
  // frame lands — without the floor this dips by the batch size then pops
  // back up. See lib/display-total.ts.
  const [myDisplay, setMyDisplay] = useState(0)
  const [prevMyInputs, setPrevMyInputs] = useState<{
    myTotal: number | null
    pending: number
  }>({
    myTotal: null,
    pending: 0,
  })
  const [catalog, setCatalog] = useState<CatalogEntry[]>(() =>
    mergeCatalog(undefined),
  )
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [eta, setEta] = useState<Eta>({ seconds: null, text: "calculating…" })
  const [board, setBoard] = useState<{ allTime: Row[]; thisWeek: Row[] }>({
    allTime: [],
    thisWeek: [],
  })
  const [myRank, setMyRank] = useState<{ allTime?: number; weekly?: number }>(
    {},
  )
  const [quests, setQuests] = useState<QuestProgress[]>([])
  const [streak, setStreak] = useState<{
    current: number
    best: number
    lastDay: string
  }>({
    current: 0,
    best: 0,
    lastDay: "",
  })

  // Cosmetic gamification (never affects submitted clicks).
  const [combo, setCombo] = useState<ComboState>({
    heat: 0,
    multiplier: 1,
    label: "idle",
  })
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
  // One announcer for the page's lifetime so a token renewal (which re-runs
  // the per-user SSE effect below) never re-toasts an already-seen unlock.
  const announceRef = useRef(createUnlockAnnouncer())
  const { particles, emit, remove } = useParticles()

  useEffect(() => {
    const solver = createWorkerSolver()
    batcherRef.current = new Batcher({
      api: { issueChallenge, submitClicks },
      solver,
      getToken: () => tokenRef.current,
      onPendingChange: setPending,
      onStallChange: setStalled,
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

  // Signed-out users get no player-state seed — just the client fallback
  // catalog (the initial mergeCatalog(undefined) state) plus getCounter/
  // getLeaderboard below.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    getPlayerState(token)
      .then((res) => {
        if (cancelled) return
        const ps = playerStateFromSnapshot(res)
        // `prev ??` stops a token renewal from re-seeding a snapshot that is
        // now stale relative to submits that have already landed.
        setMyTotal((prev) => prev ?? ps.total)
        setMyRank({ allTime: ps.allTimeRank, weekly: ps.weeklyRank })
        setCatalog(mergeCatalog(ps.achievements))
        setQuests(ps.quests)
        setStreak(ps.streak)
        const latest = ps.milestones
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

  // Per-user live updates: total, ranks, quest progress, streak and new
  // unlocks all arrive over the authenticated per-user SSE channel (the
  // batcher itself only reads nextChallenge — see lib/batcher.ts).
  useEffect(() => {
    if (!token) return
    const onFrame = (f: UserFrame) => {
      setMyTotal(f.total)
      setMyRank({ allTime: f.allTimeRank, weekly: f.weeklyRank })
      setQuests(f.questProgress)
      setStreak(f.streak)
      announceRef.current(f.unlocked)
      // A server id may not be in the currently-rendered catalog at all (the
      // static fallback only has 12 of the ~20 server ids) — add it rather
      // than dropping the unlock on the floor.
      setCatalog((prev) => {
        const now = new Date().toISOString()
        const byId = new Map(prev.map((entry) => [entry.id, entry]))
        for (const a of f.unlocked) {
          const existing = byId.get(a.id)
          byId.set(
            a.id,
            existing
              ? { ...existing, unlockedAt: now }
              : {
                  id: a.id,
                  title: a.title,
                  description: a.description,
                  unlockedAt: now,
                },
          )
        }
        return Array.from(byId.values())
      })
    }
    const stream = new PlayerStream({
      url: env.eventsPlayerUrl,
      getToken: () => tokenRef.current,
      onFrame,
    })
    stream.start()
    return () => stream.stop()
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
          setMyRank({
            allTime: res.myAllTimeRank ?? 0,
            weekly: res.myWeeklyRank ?? 0,
          })
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
  if (prevMyInputs.myTotal !== myTotal || prevMyInputs.pending !== pending) {
    setPrevMyInputs({ myTotal, pending })
    setMyDisplay((prev) => mergeDisplayTotal(myTotal, pending, prev) ?? prev)
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
  const myClicks = myDisplay
  let toNext: number | null = null
  if (total !== null) {
    const m = nextMilestone(total)
    if (m) toNext = m.threshold - total
  }

  return (
    <>
      <div className="tb-grid-bg" aria-hidden />
      <main className="tb-main relative z-10 mx-auto w-full max-w-6xl p-4 sm:p-6">
        <div className="tb-app">
          <Hud
            mode={mode}
            level={lvl.level}
            streakDays={streak.current > 0 ? streak.current : null}
            rank={myRank.allTime ?? null}
          />

          <div className="tb-grid">
            {/* LEFT column — the personal story: play, then the goal, then what you
                can earn. */}
            <div className="tb-col-left">
              <section className="tb-area-hero" aria-label="the button">
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
                  <b
                    className="text-primary tabular-nums"
                    data-testid="your-clicks"
                  >
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
                  <ComboMeter
                    multiplier={combo.multiplier}
                    heat={combo.heat}
                    label={combo.label}
                  />
                  <CpsMeter cps={cps} history={cpsHistory} />
                </div>
                <XpBar
                  level={lvl.level}
                  pct={lvl.pct}
                  xpIntoLevel={lvl.xpIntoLevel}
                  xpForNext={lvl.xpForNext}
                />
              </section>
              <TargetHeadline total={total} users={users} eta={eta.text} />
              <GoalsPanel
                quests={quests}
                streak={streak}
                signedIn={Boolean(token)}
              />
              <AchievementsGrid entries={catalog} />
            </div>

            {/* RIGHT rail — community proof. */}
            <div className="tb-col-right">
              <Leaderboard
                allTime={board.allTime}
                thisWeek={board.thisWeek}
                myRank={myRank}
                myName={user?.profile?.name ?? null}
              />
              <ActivityFeed items={feed.items} />
            </div>

            {/* WHY — full-width flavor row across both columns. */}
            <div className="tb-why">
              <WhyGrid />
            </div>
          </div>
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
