import type { ConnMode } from "../lib/radio-client"

// Distinct from OnAirLamp. The lamp answers "is the station broadcasting";
// this answers "is my page current". A healthy live connection says nothing —
// silence is the good state.
const LABEL: Partial<Record<ConnMode, string>> = {
  connecting: "đang kết nối",
  polling: "đang cập nhật chậm",
  offline: "mất kết nối",
}

export function ConnectionBadge({ mode }: { mode: ConnMode }) {
  const label = LABEL[mode]
  if (!label) return null
  return (
    <span
      role="status"
      className="rounded-full px-2 py-0.5 font-mono text-[10px] text-[color:var(--muted-foreground)]"
      style={{ background: "color-mix(in srgb, currentColor 10%, transparent)" }}
    >
      {label}
    </span>
  )
}
