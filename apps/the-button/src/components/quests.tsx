// Phase 1 placeholder. Phase 2 replaces the body with live streak + daily
// quests from GetPlayerProgress / ListQuests.
export function Quests() {
  return (
    <section aria-label="daily quests" className="tb-box p-4 text-left">
      <h2 className="text-muted-foreground mb-3 font-mono text-sm">{"// daily quests"}</h2>
      <p className="text-muted-foreground font-mono text-xs">syncing your streak &amp; quests…</p>
    </section>
  )
}
