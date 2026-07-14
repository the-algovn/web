import { apps } from "@/config/apps"
import { profile } from "@/config/profile"

export type VNode =
  | { kind: "file"; content: string }
  | { kind: "remote"; url: string }
  | { kind: "dir"; children: Record<string, VNode> }

export type VFS = Record<string, VNode>

/** the encoded vault payload — decoded only by the decrypt command at display time */
export const VAULT_BLOB = "bnl0Ymlhe3BoZWZiZV9qbmZfZXJueX0="

export function createFilesystem(): VFS {
  const projects: Record<string, VNode> = {}
  for (const app of apps) {
    projects[app.id] = {
      kind: "file",
      content: [
        `name:        ${app.name}`,
        `description: ${app.description}`,
        `status:      ${app.status}`,
        `href:        ${app.href}`,
      ].join("\n"),
    }
  }
  return {
    projects: { kind: "dir", children: projects },
    "README.md": {
      kind: "file",
      content: [
        `# ${profile.name.toLowerCase()}`,
        "",
        `${profile.title.toLowerCase()}.`,
        `${profile.bio.toLowerCase()}`,
        "",
        "this page is a terminal. but you already knew that.",
      ].join("\n"),
    },
    "contact.txt": {
      kind: "file",
      content: [`mail:      ${profile.email}`, `linkedin:  ${profile.linkedin}`].join("\n"),
    },
    "finders.txt": { kind: "remote", url: "/finders.txt" },
    ".plan": {
      kind: "file",
      content: [
        "todo:",
        "  [x] build the page",
        "  [x] hide the terminal",
        "  [x] encrypt the good stuff",
        "  [ ] wait",
        "",
        "the good stuff is encrypted in .vault.",
        "the key is the answer to everything.",
      ].join("\n"),
    },
    ".vault": {
      kind: "file",
      content: `${VAULT_BLOB}\n\nusage: decrypt .vault <key>`,
    },
  }
}

export function resolvePath(fs: VFS, path: string): VNode | null {
  const parts = path
    .replace(/^\.\//, "")
    .split("/")
    .filter(Boolean)
  let node: VNode = { kind: "dir", children: fs }
  for (const part of parts) {
    if (node.kind !== "dir") return null
    const next: VNode | undefined = node.children[part]
    if (!next) return null
    node = next
  }
  return node
}
