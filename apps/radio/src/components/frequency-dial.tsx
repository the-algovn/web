export function FrequencyDial() {
  return (
    <div
      aria-hidden
      className="relative"
      style={{
        width: 118, height: 118, borderRadius: "50%",
        background: "conic-gradient(from 210deg, #2a2d36, #14151a 60%, #2a2d36)",
        boxShadow: "inset 0 0 0 1px #33353f",
      }}
    >
      <div style={{ position: "absolute", inset: 14, borderRadius: "50%", background: "var(--background)", boxShadow: "inset 0 2px 8px #000" }} />
      <span
        style={{
          position: "absolute", top: 6, left: "50%", width: 2, height: 12,
          background: "var(--radio-amber)", transform: "translateX(-50%) rotate(35deg)",
          transformOrigin: "50% 53px", boxShadow: "0 0 8px var(--radio-amber)",
        }}
      />
      <span
        className="absolute inset-0 grid place-items-center font-mono text-lg"
        style={{ color: "var(--radio-amber)", textShadow: "0 0 10px color-mix(in srgb, var(--radio-amber) 40%, transparent)" }}
      >
        42.0
      </span>
    </div>
  )
}
