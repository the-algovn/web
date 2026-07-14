import { resolvePath, type VFS, VAULT_BLOB } from "./filesystem"

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

export const FORTUNES = [
  "it works on my machine.",
  "there are only two hard things in computer science: cache invalidation and naming things.",
  "the best code is no code at all.",
  "premature optimization is the root of all evil. — donald knuth",
  "weeks of coding can save you hours of planning.",
  "a good programmer looks both ways before crossing a one-way street.",
  "99 little bugs in the code. take one down, patch it around. 127 little bugs in the code.",
  "documentation is a love letter that you write to your future self.",
  "talk is cheap. show me the code. — linus torvalds",
  "simplicity is prerequisite for reliability. — dijkstra",
  "first, solve the problem. then, write the code.",
  "any sufficiently advanced bug is indistinguishable from a feature.",
]

function cowsay(args: string[]): CommandResult {
  const msg = args.join(" ") || "moo"
  return {
    lines: [
      ` ${"_".repeat(msg.length + 2)}`,
      `< ${msg} >`,
      ` ${"-".repeat(msg.length + 2)}`,
      "        \\   ^__^",
      "         \\  (oo)\\_______",
      "            (__)\\       )\\/\\",
      "                ||----w |",
      "                ||     ||",
    ],
  }
}

function rm(args: string[], ctx: CommandCtx): CommandResult {
  const flags = args.filter((a) => a.startsWith("-")).join("")
  const target = args.find((a) => !a.startsWith("-"))
  const nuking = flags.includes("r") && flags.includes("f") && (target === "/" || target === "/*")
  if (!nuking) return { lines: [`rm: cannot remove '${target ?? ""}': Permission denied`] }
  if (!ctx.reducedMotion) ctx.triggerGlitch()
  return {
    stagger: true,
    lines: [
      "removing /home/duc/projects ...",
      "removing /home/duc/README.md ...",
      "removing /etc ...",
      "removing /usr/bin ...",
      "removing /boot ...",
      "rm: cannot remove '/proc/consciousness': Operation not permitted",
      "...",
      "filesystem restored from snapshot. nice try.",
    ],
  }
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
  sudo: (args) =>
    args.join(" ") === "make me a sandwich"
      ? { lines: ["Okay."] }
      : { lines: ["duc is not in the sudoers file. This incident will be reported."] },
  rm,
  cowsay: (args) => cowsay(args),
  fortune: () => ({ lines: [FORTUNES[Math.floor(Math.random() * FORTUNES.length)]] }),
  exit: () => ({ lines: ["there is no escape."] }),
  logout: () => ({ lines: ["there is no escape."] }),
  matrix: (_args, ctx) => {
    if (ctx.reducedMotion) return { lines: ["motion is reduced — no rain today."] }
    ctx.startMatrix()
    return { lines: ["follow the white rabbit… (press any key to wake up)"] }
  },
  crt: (_args, ctx) => ({ lines: [`crt: ${ctx.toggleCrt() ? "on" : "off"}`] }),
  theme: (args, ctx) => {
    const target = args[0]
    if (target && target !== "light" && target !== "dark")
      return { lines: ["usage: theme [light|dark]"] }
    return { lines: [`theme: ${ctx.setTheme(target ?? "toggle")}`] }
  },
  decrypt: (args) => {
    const [target, key] = args
    if (!target) return { lines: ["usage: decrypt .vault <key>"] }
    if (target.replace(/^\.\//, "") !== ".vault")
      return { lines: [`decrypt: ${target}: not encrypted`] }
    if (key !== "42")
      return { lines: ["decryption failed. think bigger. or smaller. or… deeper."] }
    return {
      lines: [
        "┌────────────────────────────────┐",
        "│    VAULT OPENED — WELL DUG.    │",
        "└────────────────────────────────┘",
        "",
        `  ${rot13(atob(VAULT_BLOB))}`,
        "",
        "  email this flag to minhducle.dev@gmail.com",
        "  subject: 'i found it' — and you enter finders.txt",
      ],
    }
  },
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
