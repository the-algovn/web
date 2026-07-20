import { useEffect, useState } from "react"
import { presignArtifact } from "../lib/api"
import { useAuth } from "../lib/use-auth"

// Artifacts are private in MinIO; resolve a time-limited presigned URL on demand.
export function PresignedAudio({
  artifactId,
  className,
}: {
  artifactId: string
  className?: string
}) {
  const { token } = useAuth()
  const [src, setSrc] = useState("")
  useEffect(() => {
    if (!token || !artifactId) {
      setSrc("")
      return
    }
    let live = true
    presignArtifact(token, artifactId)
      .then((r) => {
        if (live) setSrc(r.url ?? "")
      })
      .catch(() => {
        if (live) setSrc("")
      })
    return () => {
      live = false
    }
  }, [token, artifactId])
  if (!src) return null
  return (
    <audio controls src={src} className={className}>
      <track kind="captions" />
    </audio>
  )
}
