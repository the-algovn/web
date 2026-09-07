export type Tab = "now" | "request" | "queue"

const TABS: { key: Tab; label: string }[] = [
  { key: "now", label: "ĐANG PHÁT" },
  { key: "request", label: "YÊU CẦU" },
  { key: "queue", label: "HÀNG ĐỢI" },
]

// Phone only. The desktop rails show all three at once, so there is nothing
// left to navigate between.
export function NavBar({
  tab,
  onTab,
}: {
  tab: Tab
  onTab(t: Tab): void
}) {
  return (
    <nav
      aria-label="Khu vực của đài"
      className="grid shrink-0 grid-cols-3"
      style={{
        borderTop: "1px solid rgb(232 233 230 / 0.13)",
        background: "var(--radio-screen)",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      {TABS.map((item) => {
        const on = item.key === tab
        return (
          <button
            key={item.key}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onTab(item.key)}
            className="radio-mono flex h-14 flex-col items-center justify-center gap-[7px] text-[9.5px] font-bold tracking-[0.12em]"
            style={{ color: on ? "var(--radio-ink)" : "var(--radio-ink-50)" }}
          >
            <span
              aria-hidden
              className="size-[5px]"
              style={{
                background: on ? "var(--radio-air)" : "transparent",
                boxShadow: on ? "var(--radio-air-glow)" : "none",
              }}
            />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
