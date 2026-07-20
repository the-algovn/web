import { COMMAND_NAMES, type Session } from "./commands"
import { resolvePath, type VFS } from "./filesystem"

function fileCandidates(fs: VFS, token: string): string[] {
  const slash = token.lastIndexOf("/")
  const dirPath = slash === -1 ? "" : token.slice(0, slash)
  const dir = dirPath
    ? resolvePath(fs, dirPath)
    : ({ kind: "dir", children: fs } as const)
  if (dir?.kind !== "dir") return []
  return Object.entries(dir.children).map(
    ([name, node]) =>
      (dirPath ? `${dirPath}/` : "") + name + (node.kind === "dir" ? "/" : ""),
  )
}

/** Returns the completed buffer, or null when no single unambiguous completion exists. */
export function complete(
  buffer: string,
  fs: VFS,
  session: Session,
): string | null {
  if (!buffer) return null
  const endsWithSpace = /\s$/.test(buffer)
  const parts = buffer.trim().split(/\s+/)
  const last = endsWithSpace ? "" : parts[parts.length - 1]
  if (!last) return null
  const completingCommand = parts.length === 1 && !endsWithSpace
  const pool = completingCommand
    ? [...COMMAND_NAMES, ...(session.planSeen ? ["decrypt"] : [])]
    : fileCandidates(fs, last)
  const matches = pool.filter((c) => c.startsWith(last) && c !== last)
  if (matches.length !== 1) return null
  return buffer.slice(0, buffer.length - last.length) + matches[0]
}
