import { cn } from "@algovn/ui/lib/utils"

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
      onClick={e => {
        onMash()
        const r = e.currentTarget.getBoundingClientRect()
        onParticle(r.left + r.width / 2, r.top + r.height / 2)
      }}
      className={cn(
        "bg-primary text-primary-foreground size-40 rounded-full text-xl font-semibold shadow-lg sm:size-48",
        "transition-transform duration-75 select-none active:scale-90",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]"
      )}
    >
      the button
    </button>
  )
}
