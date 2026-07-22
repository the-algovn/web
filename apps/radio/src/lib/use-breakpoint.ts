import { useEffect, useState } from "react"

// The deck breaks at 1024px. @algovn/ui's useIsMobile hardcodes 768px, which
// is the wrong threshold for this layout — hence a local hook.
const DESKTOP_MIN_PX = 1024

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_MIN_PX}px)`)
    const onChange = () => setIsDesktop(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isDesktop
}
