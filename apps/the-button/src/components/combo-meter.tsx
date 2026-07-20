function heatBand(heat: number): "idle" | "on" | "warm" | "hot" {
  if (heat <= 0) return "idle"
  if (heat >= 75) return "hot"
  if (heat >= 40) return "warm"
  return "on"
}

export function ComboMeter({
  multiplier,
  heat,
  label,
}: {
  multiplier: number
  heat: number
  label: string
}) {
  const band = heatBand(heat)
  return (
    <div className="tb-meter">
      <div className="tb-meter-h">
        <span>COMBO</span>
        <span>{label}</span>
      </div>
      <div data-testid="combo-value" data-heat={band} className="tb-combo-val">
        ×{multiplier.toFixed(1)}
      </div>
      <div className="tb-heat">
        <i
          data-testid="combo-heat"
          data-heat={band}
          style={{ width: `${heat}%` }}
        />
      </div>
    </div>
  )
}
