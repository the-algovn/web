import type { ConnMode } from "../lib/radio-client"

// Distinct from OnAirLamp. The lamp answers "is the station broadcasting";
// this answers "is my page current". A healthy live connection says nothing —
// silence is the good state.
const LABEL: Partial<Record<ConnMode, string>> = {
  connecting: "ĐANG KẾT NỐI",
  polling: "CẬP NHẬT CHẬM",
  offline: "MẤT KẾT NỐI",
}

export function ConnectionBadge({ mode }: { mode: ConnMode }) {
  const label = LABEL[mode]
  if (!label) return null
  return (
    <span
      role="status"
      className="radio-mono px-2 py-1 text-[9.5px] font-bold tracking-[0.12em]"
      style={{
        color: "var(--radio-ink-55)",
        border: "1px solid var(--radio-line-firm)",
      }}
    >
      {label}
    </span>
  )
}
