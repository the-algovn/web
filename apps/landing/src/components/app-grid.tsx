import Link from "next/link"
import { apps, type AppTile } from "@/config/apps"

function TileFace({ app }: { app: AppTile }) {
  const Icon = app.icon
  return (
    <span className={`flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br ${app.gradient} shadow-lg`}>
      <Icon className="size-8 text-white" aria-hidden />
    </span>
  )
}

export function AppGrid() {
  return (
    <ul className="grid grid-cols-4 gap-x-4 gap-y-6 sm:grid-cols-5 md:grid-cols-6">
      {apps.map((app) => (
        <li key={app.id} className="flex flex-col items-center gap-1.5">
          {app.status === "live" ? (
            <Link href={app.href} className="transition-transform duration-150 active:scale-90">
              <TileFace app={app} />
            </Link>
          ) : (
            <span className="relative inline-block cursor-default opacity-50" title="Coming soon">
              <TileFace app={app} />
              <span
                aria-hidden
                className="absolute -top-1 -right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white/90"
              >
                soon
              </span>
            </span>
          )}
          <span className="max-w-20 truncate text-xs font-medium text-white/90">{app.name}</span>
          {app.status === "soon" && <span className="sr-only">(coming soon)</span>}
        </li>
      ))}
    </ul>
  )
}
