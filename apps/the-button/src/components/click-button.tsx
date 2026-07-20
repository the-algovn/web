export function ClickButton({
  onMash,
  onParticle,
}: {
  onMash: () => void
  onParticle: (x: number, y: number) => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        onMash()
        const r = e.currentTarget.getBoundingClientRect()
        onParticle(r.left + r.width / 2, r.top + r.height / 2)
      }}
      className="tb-ghost focus-visible:ring-ring/50 flex w-full max-w-3xl items-center justify-center gap-3 px-8 py-6 font-mono text-xl font-bold tracking-widest select-none outline-none focus-visible:ring-[3px]"
    >
      <span className="text-2xl font-normal" aria-hidden>
        +
      </span>
      <span>CONTRIBUTE</span>
    </button>
  )
}
