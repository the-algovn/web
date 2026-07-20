import { Badge } from "@algovn/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@algovn/ui/card"
import Link from "next/link"
import { type AppTile, apps } from "@/config/apps"

function ProjectCard({ app }: { app: AppTile }) {
  return (
    <Card className="h-full rounded-none transition-colors hover:border-primary/60">
      <CardHeader>
        <CardTitle className="text-primary">{app.name}</CardTitle>
        <CardDescription>{app.description}</CardDescription>
        {app.status === "soon" && (
          <CardAction>
            <Badge
              variant="outline"
              className="rounded-none tracking-widest uppercase"
            >
              soon
            </Badge>
          </CardAction>
        )}
      </CardHeader>
    </Card>
  )
}

export function Projects() {
  return (
    <section className="border-b pb-10">
      <p className="text-sm text-muted-foreground">~ $ ls projects/</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {apps.map((app) =>
          app.status === "live" ? (
            <Link key={app.id} href={app.href}>
              <ProjectCard app={app} />
            </Link>
          ) : (
            <ProjectCard key={app.id} app={app} />
          ),
        )}
      </div>
    </section>
  )
}
