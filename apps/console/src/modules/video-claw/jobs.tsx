import { Badge } from "@algovn/ui/badge"
import { Button } from "@algovn/ui/button"
import { EmptyState } from "@algovn/ui/empty-state"
import { Skeleton } from "@algovn/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@algovn/ui/table"
import { Play, RefreshCw, ScrollText } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { labCall } from "../../lib/api"
import { useAuth } from "../../lib/use-auth"

interface Source {
  id: string; name: string
}

interface CrawlJob {
  id: string; sourceId: string; status: string
  pagesScraped: number; videosFound: number; videosNew: number; videosDownloaded: number
  error?: string; createdAt: string
}

interface Video {
  id: string; title: string; downloadStatus: string
  filePath?: string; downloadError?: string; downloadedAt?: string
}

const STATUS_COLOR: Record<string, "default"|"secondary"|"destructive"|"outline"> = {
  pending: "secondary", running: "default", done: "outline", failed: "destructive",
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function Jobs() {
  const { token } = useAuth()
  const [jobs, setJobs] = useState<CrawlJob[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const [startSourceId, setStartSourceId] = useState("")

  const fetchSources = useCallback(async () => {
    if (!token) return
    try {
      const r = await labCall<{sources: Source[]}>(token, "/video-claw/sources", {})
      setSources(r.sources ?? [])
    } catch { /* non-critical */ }
  }, [token])

  useEffect(() => { void fetchSources() }, [fetchSources])

  const fetchJobs = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const r = await labCall<{jobs: CrawlJob[]}>(token, "/video-claw/jobs/list", {})
      setJobs(r.jobs ?? [])
    } catch (e) { toast.error(msg(e)) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { void fetchJobs() }, [fetchJobs])

  const fetchVideos = async (jobId: string) => {
    if (!token) return
    setSelectedJob(jobId)
    setVideosLoading(true)
    try {
      const r = await labCall<{videos: Video[]}>(token, "/video-claw/videos/list", { crawlJobId: jobId, limit: 100 })
      setVideos(r.videos ?? [])
    } catch (e) { toast.error(msg(e)) }
    finally { setVideosLoading(false) }
  }

  const startCrawl = async (sourceId: string) => {
    if (!token) return
    try {
      await labCall(token, "/video-claw/jobs/start", { sourceId })
      toast.success("Crawl started")
      void fetchJobs()
    } catch (e) { toast.error(msg(e)) }
  }

  const retryDownload = async (videoId: string) => {
    if (!token) return
    try {
      await labCall(token, "/video-claw/videos/retry", { videoId })
      toast.success("Retrying download")
      if (selectedJob) void fetchVideos(selectedJob)
    } catch (e) { toast.error(msg(e)) }
  }

  if (loading) return <Skeleton className="h-64" />

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Video Claw · Jobs</h1>
          <p className="text-muted-foreground text-sm">Start and monitor crawl jobs.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="border-input bg-background text-sm border rounded-md px-2 py-1.5"
            value={startSourceId}
            onChange={e => setStartSourceId(e.target.value)}>
            <option value="">Source…</option>
            {sources.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Button size="sm" onClick={() => { startCrawl(startSourceId); setStartSourceId("") }}
            disabled={!startSourceId}>
            <Play className="mr-1 size-4" /> Start
          </Button>
          <Button size="sm" variant="outline" onClick={fetchJobs}>
            <RefreshCw className="mr-1 size-4" /> Refresh
          </Button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <EmptyState icon={<ScrollText />} title="No jobs" description="Start a crawl from the Sources page." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Pages</TableHead>
              <TableHead>Found</TableHead>
              <TableHead>New</TableHead>
              <TableHead>Downloaded</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map(j => (
              <TableRow key={j.id}>
                <TableCell>
                  <Badge variant={STATUS_COLOR[j.status] ?? "secondary"}>{j.status}</Badge>
                  {j.error ? <div className="text-destructive mt-1 text-xs">{j.error}</div> : null}
                </TableCell>
                <TableCell className="text-xs">{new Date(j.createdAt).toLocaleString()}</TableCell>
                <TableCell>{j.pagesScraped}</TableCell>
                <TableCell>{j.videosFound}</TableCell>
                <TableCell>{j.videosNew}</TableCell>
                <TableCell>{j.videosDownloaded}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => fetchVideos(j.id)}>
                    <ScrollText className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Video list for selected job */}
      {selectedJob ? (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Videos</h2>
          {videosLoading ? <Skeleton className="h-32" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="max-w-64 truncate text-xs">{v.title}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLOR[v.downloadStatus] ?? "secondary"}>
                        {v.downloadStatus}
                      </Badge>
                      {v.downloadError ? (
                        <div className="text-destructive mt-1 text-xs">{v.downloadError}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {v.filePath ?? "-"}
                    </TableCell>
                    <TableCell>
                      {v.downloadStatus === "failed" ? (
                        <Button variant="ghost" size="icon" onClick={() => retryDownload(v.id)}>
                          <RefreshCw className="size-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}
    </div>
  )
}
