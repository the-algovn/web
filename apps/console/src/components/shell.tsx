import { useEffect, useState } from "react"
import { registry } from "../modules/registry"
import { EnvBadge } from "./env-badge"

function moduleFromHash(): string {
  const id = window.location.hash.replace(/^#\/?/, "")
  return registry.some(m => m.id === id) ? id : "home"
}

export function Shell({ roles, topRight }: { roles: string[]; topRight?: React.ReactNode }) {
  const [active, setActive] = useState(moduleFromHash)
  useEffect(() => {
    const onHash = () => setActive(moduleFromHash())
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  const visible = registry.filter(m => m.requiredRole === null || roles.includes(m.requiredRole))
  const groups = [...new Set(visible.map(m => m.group))]
  const Active = (visible.find(m => m.id === active) ?? visible[0]!).component

  return (
    <div className="flex min-h-svh">
      <aside className="border-border bg-sidebar w-56 shrink-0 border-r p-3">
        <div className="mb-4 flex items-center justify-between px-2">
          <span className="font-mono text-sm font-bold">algovn</span>
          <EnvBadge />
        </div>
        {groups.map(g => (
          <div key={g} className="mb-4">
            <div className="text-muted-foreground px-2 pb-1 text-[11px] font-medium uppercase tracking-wider">{g}</div>
            {visible.filter(m => m.group === g).map(m => (
              <a
                key={m.id}
                href={`#/${m.id}`}
                aria-current={m.id === active}
                className="text-foreground/80 hover:bg-accent aria-[current=true]:bg-accent flex items-center gap-2 rounded px-2 py-1.5 text-sm"
              >
                <m.icon className="size-4" />
                {m.title}
              </a>
            ))}
          </div>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border flex h-12 items-center justify-end border-b px-4">{topRight}</header>
        <main className="min-w-0 flex-1 overflow-auto">
          <Active />
        </main>
      </div>
    </div>
  )
}
