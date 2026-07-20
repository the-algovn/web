export type Tab = "play" | "ranks" | "goals" | "stats"

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "play", icon: "＋", label: "PLAY" },
  { id: "ranks", icon: "🏆", label: "RANKS" },
  { id: "goals", icon: "🎯", label: "GOALS" },
  { id: "stats", icon: "📊", label: "STATS" },
]

export function TabBar({
  active,
  onChange,
}: {
  active: Tab
  onChange: (t: Tab) => void
}) {
  return (
    <nav className="tb-tabbar" aria-label="sections">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-current={active === t.id}
          onClick={() => onChange(t.id)}
          className={`tb-tab ${active === t.id ? "tb-tab-on" : ""}`}
        >
          <span className="tb-tab-ic" aria-hidden>
            {t.icon}
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}
