// One flag decides first visit vs revisit: finishing OR skipping the intro
// slideshow sets it. When storage is blocked (private mode), we report "seen"
// rather than replaying the intro on every visit.
const KEY = "tb:intro:v1"

export function introSeen(storage: Storage = localStorage): boolean {
  try {
    return storage.getItem(KEY) === "done"
  } catch {
    return true
  }
}

export function markIntroSeen(storage: Storage = localStorage): void {
  try {
    storage.setItem(KEY, "done")
  } catch {
    // best-effort: a blocked store just means the intro replays next visit
  }
}
