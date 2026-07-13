import { Badge } from "@algovn/ui/badge"
import { Button } from "@algovn/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@algovn/ui/card"

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-10">
      <Card>
        <CardHeader>
          <CardTitle>@algovn/ui smoke test</CardTitle>
          <CardDescription>If this card is themed, the pipeline works.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Badge>instrument panel</Badge>
        </CardContent>
      </Card>
    </main>
  )
}
