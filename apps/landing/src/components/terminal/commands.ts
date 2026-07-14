import { resolvePath, type VFS } from "./filesystem"

export type CommandResult = { lines: string[]; clear?: boolean; stagger?: boolean }

export type Session = { planSeen: boolean; unknownHinted: boolean }

export type CommandCtx = {
  fs: VFS
  session: Session
  reducedMotion: boolean
  fetchText: (url: string) => Promise<string>
  setTheme: (target: "light" | "dark" | "toggle") => string
  toggleCrt: () => boolean
  startMatrix: () => void
  triggerGlitch: () => void
}

type Handler = (args: string[], ctx: CommandCtx) => CommandResult | Promise<CommandResult>

export function rot13(s: string): string {
  return s.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base)
  })
}

const HELP_LINES = [
  "available commands:",
  "",
  "  whoami   pwd      ls       cat      echo     date",
  "  clear    cd       sudo     rm       cowsay   fortune",
  "  exit     matrix   crt      theme    help",
]

function ls(args: string[], ctx: CommandCtx): CommandResult {
  const flags = args.filter((a) => a.startsWith("-")).join("")
  const all = flags.includes("a")
  const path = args.find((a) => !a.startsWith("-"))
  const node = path ? resolvePath(ctx.fs, path) : ({ kind: "dir", children: ctx.fs } as const)
  if (!node) return { lines: [`ls: ${path}: No such file or directory`] }
  if (node.kind !== "dir") return { lines: [path as string] }
  const names = Object.entries(node.children)
    .filter(([name]) => all || !name.startsWith("."))
    .map(([name, child]) => (child.kind === "dir" ? `${name}/` : name))
  return { lines: [names.join("  ")] }
}

async function cat(args: string[], ctx: CommandCtx): Promise<CommandResult> {
  const path = args[0]
  if (!path) return { lines: ["usage: cat <file>"] }
  const node = resolvePath(ctx.fs, path)
  if (!node) return { lines: [`cat: ${path}: No such file or directory`] }
  if (node.kind === "dir") return { lines: [`cat: ${path}: Is a directory`] }
  if (node.kind === "remote") {
    try {
      return { lines: (await ctx.fetchText(node.url)).split("\n") }
    } catch {
      return { lines: [`cat: ${path}: connection lost`] }
    }
  }
  if (path.replace(/^\.\//, "") === ".plan") ctx.session.planSeen = true
  return { lines: node.content.split("\n") }
}

const REGISTRY: Record<string, Handler> = {
  help: () => ({ lines: HELP_LINES }),
  whoami: () => ({ lines: ["duc le — software engineer"] }),
  pwd: () => ({ lines: ["/home/duc"] }),
  ls,
  cat,
  echo: (args) => ({ lines: [args.join(" ")] }),
  date: () => ({ lines: [new Date().toString()] }),
  clear: () => ({ lines: [], clear: true }),
  cd: () => ({ lines: ["you're already home."] }),
}

/** Every runnable command except decrypt — used by help-adjacent tooling and tab completion. */
export const COMMAND_NAMES = Object.keys(REGISTRY).filter((name) => name !== "decrypt")

export async function runCommand(input: string, ctx: CommandCtx): Promise<CommandResult> {
  const trimmed = input.trim()
  if (!trimmed) return { lines: [] }
  const [name, ...args] = trimmed.split(/\s+/)
  const handler = REGISTRY[name]
  if (!handler) {
    const hint = ctx.session.unknownHinted ? "" : " (try 'help')"
    ctx.session.unknownHinted = true
    return { lines: [`command not found: ${name}${hint}`] }
  }
  return handler(args, ctx)
}
