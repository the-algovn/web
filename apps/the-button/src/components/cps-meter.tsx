// The value carries its own "/s" unit so it never collides with a bare number
// elsewhere on the page.
export function CpsMeter({ cps, history }: { cps: number; history: number[] }) {
  const max = Math.max(1, ...history)
  return (
    <div className="tb-meter">
      <div className="tb-meter-h">
        <span>CLICKS / SEC</span>
      </div>
      <div data-testid="cps-value" className="tb-cps-val tabular-nums">
        {cps}
        <span className="tb-cps-unit">/s</span>
      </div>
      <div className="tb-spark" aria-hidden>
        {history.map((h, i) => (
          <i
            // biome-ignore lint/suspicious/noArrayIndexKey: decorative aria-hidden sparkline segments are purely positional; heights repeat, so no content-derived key is unique
            key={i}
            data-testid="cps-bar"
            style={{ height: `${Math.max(8, (h / max) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  )
}
