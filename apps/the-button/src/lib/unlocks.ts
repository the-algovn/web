import { toast } from "sonner"
import type { Achievement } from "./api"
import { ACHIEVEMENT_CATALOG } from "./catalog"

// Instant unlock toasts fed by SubmitClicksResponse.unlocked (spec §10).
export function announceUnlocks(unlocked: Achievement[]): void {
  for (const achievement of unlocked) {
    const fallback = ACHIEVEMENT_CATALOG.find(entry => entry.id === achievement.id)
    toast.success(achievement.title ?? fallback?.title ?? "achievement unlocked", {
      description: achievement.description ?? fallback?.description,
    })
  }
}

// A re-render or a duplicate SubmitClicksResponse must not re-toast the same
// achievement twice — the returned function remembers ids it has already
// announced across calls (one instance lives for the lifetime of the page).
export function createUnlockAnnouncer(): (unlocked: Achievement[]) => void {
  const announced = new Set<string>()
  return unlocked => {
    const fresh = unlocked.filter(a => a.id !== undefined && !announced.has(a.id))
    for (const a of fresh) announced.add(a.id!)
    announceUnlocks(fresh)
  }
}
