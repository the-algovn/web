import { Button } from "@algovn/ui/button"
import { EmptyState } from "@algovn/ui/empty-state"
import { Input } from "@algovn/ui/input"
import { Skeleton } from "@algovn/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@algovn/ui/table"
import { Clapperboard, Plus, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { videoClawCall } from "../../lib/api"
import { useAuth } from "../../lib/use-auth"

interface Source {
  id: string; name: string; baseUrls: string[]; enabled: boolean
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function Sources() {
  const { token } = useAuth()
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [urls, setUrls] = useState("")

  const fetch = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const r = await videoClawCall<{sources: Source[]}>(token, "/sources", {})
      setSources(r.sources ?? [])
    } catch (e) { toast.error(msg(e)) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { void fetch() }, [fetch])

  const create = async () => {
    if (!token || !name || !urls) return
    try {
      await videoClawCall(token, "/sources/create", {
        name, baseUrls: urls.split("\n").map(s => s.trim()).filter(Boolean),
      })
      setName(""); setUrls("")
      void fetch()
    } catch (e) { toast.error(msg(e)) }
  }

  const remove = async (id: string) => {
    if (!token) return
    try {
      await videoClawCall(token, "/sources/delete", { id })
      void fetch()
    } catch (e) { toast.error(msg(e)) }
  }

  if (loading) return <Skeleton className="h-64" />
  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Video Claw · Sources</h1>
        <p className="text-muted-foreground text-sm">Define crawl sources and their scrape rules.</p>
      </div>

      {/* Add form */}
      <div className="mb-6 flex gap-2">
        <Input className="w-48" placeholder="Source name" value={name}
          onChange={e => setName(e.target.value)} />
        <Input className="w-64" placeholder="Base URLs (one per line)" value={urls}
          onChange={e => setUrls(e.target.value)} />
        <Button size="sm" onClick={create} disabled={!name || !urls}>
          <Plus className="mr-1 size-4" /> Add
        </Button>
      </div>

      {sources.length === 0 ? (
        <EmptyState icon={<Clapperboard />} title="No sources" description="Add a source to start crawling." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Base URLs</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {s.baseUrls.join(", ")}
                </TableCell>
                <TableCell>{s.enabled ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
