import { describe, expect, it } from "vitest"
import { createFilesystem } from "./filesystem"
import { runCommand, type CommandCtx, FORTUNES, COMMAND_NAMES } from "./commands"

function makeCtx(overrides: Partial<CommandCtx> = {}): CommandCtx {
  return {
    fs: createFilesystem(),
    session: { planSeen: false, unknownHinted: false },
    reducedMotion: false,
    fetchText: async () => "remote-content",
    setTheme: () => "dark",
    toggleCrt: () => true,
    startMatrix: () => {},
    triggerGlitch: () => {},
    ...overrides,
  }
}

describe("unix basics", () => {
  it("whoami", async () => {
    expect((await runCommand("whoami", makeCtx())).lines).toEqual(["duc le — software engineer"])
  })

  it("pwd", async () => {
    expect((await runCommand("pwd", makeCtx())).lines).toEqual(["/home/duc"])
  })

  it("ls hides dotfiles, in spec order", async () => {
    expect((await runCommand("ls", makeCtx())).lines).toEqual([
      "projects/  README.md  contact.txt  finders.txt",
    ])
  })

  it("ls -la reveals the dotfiles", async () => {
    expect((await runCommand("ls -la", makeCtx())).lines).toEqual([
      "projects/  README.md  contact.txt  finders.txt  .plan  .vault",
    ])
  })

  it("ls projects/ lists app entries", async () => {
    expect((await runCommand("ls projects/", makeCtx())).lines).toEqual(["the-button"])
  })

  it("ls of a missing path errors", async () => {
    expect((await runCommand("ls nope", makeCtx())).lines).toEqual([
      "ls: nope: No such file or directory",
    ])
  })

  it("cat prints a project file", async () => {
    const { lines } = await runCommand("cat projects/the-button", makeCtx())
    expect(lines[0]).toBe("name:        The Button")
    expect(lines).toContain("status:      soon")
  })

  it("cat marks .plan as seen", async () => {
    const ctx = makeCtx()
    await runCommand("cat .plan", ctx)
    expect(ctx.session.planSeen).toBe(true)
  })

  it("cat fetches remote files through ctx.fetchText", async () => {
    const { lines } = await runCommand("cat finders.txt", makeCtx())
    expect(lines).toEqual(["remote-content"])
  })

  it("cat reports connection lost when fetch fails", async () => {
    const ctx = makeCtx({
      fetchText: async () => {
        throw new Error("500")
      },
    })
    expect((await runCommand("cat finders.txt", ctx)).lines).toEqual([
      "cat: finders.txt: connection lost",
    ])
  })

  it("cat on a directory / missing file errors like the real thing", async () => {
    expect((await runCommand("cat projects", makeCtx())).lines).toEqual([
      "cat: projects: Is a directory",
    ])
    expect((await runCommand("cat ghost", makeCtx())).lines).toEqual([
      "cat: ghost: No such file or directory",
    ])
  })

  it("echo prints its arguments", async () => {
    expect((await runCommand("echo hello world", makeCtx())).lines).toEqual(["hello world"])
  })

  it("date prints a non-empty line", async () => {
    const { lines } = await runCommand("date", makeCtx())
    expect(lines).toHaveLength(1)
    expect(lines[0].length).toBeGreaterThan(10)
  })

  it("clear signals the hook", async () => {
    expect(await runCommand("clear", makeCtx())).toEqual({ lines: [], clear: true })
  })

  it("cd is a joke", async () => {
    expect((await runCommand("cd projects", makeCtx())).lines).toEqual(["you're already home."])
  })

  it("help lists playground commands but never decrypt", async () => {
    const { lines } = await runCommand("help", makeCtx())
    const text = lines.join("\n")
    for (const name of ["whoami", "ls", "cat", "matrix", "crt", "theme", "cowsay"]) {
      expect(text).toContain(name)
    }
    expect(text).not.toContain("decrypt")
  })

  it("unknown command hints at help exactly once", async () => {
    const ctx = makeCtx()
    expect((await runCommand("vim", ctx)).lines).toEqual(["command not found: vim (try 'help')"])
    expect((await runCommand("emacs", ctx)).lines).toEqual(["command not found: emacs"])
  })

  it("blank input produces no output", async () => {
    expect((await runCommand("   ", makeCtx())).lines).toEqual([])
  })
})

describe("joke pack", () => {
  it("sudo is denied", async () => {
    expect((await runCommand("sudo reboot", makeCtx())).lines).toEqual([
      "duc is not in the sudoers file. This incident will be reported.",
    ])
  })

  it("sudo make me a sandwich complies", async () => {
    expect((await runCommand("sudo make me a sandwich", makeCtx())).lines).toEqual(["Okay."])
  })

  it("rm -rf / melts down, staggered, and triggers the glitch", async () => {
    let glitched = false
    const ctx = makeCtx({ triggerGlitch: () => (glitched = true) })
    const result = await runCommand("rm -rf /", ctx)
    expect(result.stagger).toBe(true)
    expect(result.lines[result.lines.length - 1]).toBe(
      "filesystem restored from snapshot. nice try.",
    )
    expect(glitched).toBe(true)
  })

  it("rm -rf / skips the glitch under reduced motion", async () => {
    let glitched = false
    const ctx = makeCtx({ reducedMotion: true, triggerGlitch: () => (glitched = true) })
    await runCommand("rm -rf /", ctx)
    expect(glitched).toBe(false)
  })

  it("ordinary rm is denied", async () => {
    expect((await runCommand("rm README.md", makeCtx())).lines).toEqual([
      "rm: cannot remove 'README.md': Permission denied",
    ])
  })

  it("cowsay draws the cow with a sized bubble", async () => {
    const { lines } = await runCommand("cowsay hi", makeCtx())
    expect(lines[1]).toBe("< hi >")
    expect(lines[0]).toBe(" ____")
    expect(lines).toContain("         \\  (oo)\\_______")
  })

  it("cowsay defaults to moo", async () => {
    expect((await runCommand("cowsay", makeCtx())).lines[1]).toBe("< moo >")
  })

  it("fortune draws from the curated list", async () => {
    const { lines } = await runCommand("fortune", makeCtx())
    expect(FORTUNES).toContain(lines[0])
  })

  it("exit and logout are futile", async () => {
    expect((await runCommand("exit", makeCtx())).lines).toEqual(["there is no escape."])
    expect((await runCommand("logout", makeCtx())).lines).toEqual(["there is no escape."])
  })
})

describe("effect commands", () => {
  it("matrix starts the rain", async () => {
    let started = false
    const ctx = makeCtx({ startMatrix: () => (started = true) })
    expect((await runCommand("matrix", ctx)).lines).toEqual([
      "follow the white rabbit… (press any key to wake up)",
    ])
    expect(started).toBe(true)
  })

  it("matrix respects reduced motion", async () => {
    let started = false
    const ctx = makeCtx({ reducedMotion: true, startMatrix: () => (started = true) })
    expect((await runCommand("matrix", ctx)).lines).toEqual(["motion is reduced — no rain today."])
    expect(started).toBe(false)
  })

  it("crt reports the toggled state", async () => {
    expect((await runCommand("crt", makeCtx({ toggleCrt: () => true }))).lines).toEqual(["crt: on"])
    expect((await runCommand("crt", makeCtx({ toggleCrt: () => false }))).lines).toEqual([
      "crt: off",
    ])
  })

  it("theme flips and reports", async () => {
    const calls: string[] = []
    const ctx = makeCtx({
      setTheme: (target) => {
        calls.push(target)
        return "light"
      },
    })
    expect((await runCommand("theme", ctx)).lines).toEqual(["theme: light"])
    expect((await runCommand("theme light", ctx)).lines).toEqual(["theme: light"])
    expect(calls).toEqual(["toggle", "light"])
  })

  it("theme rejects nonsense", async () => {
    expect((await runCommand("theme neon", makeCtx())).lines).toEqual(["usage: theme [light|dark]"])
  })
})

describe("the trail", () => {
  it("decrypt .vault 42 opens the vault", async () => {
    const { lines } = await runCommand("decrypt .vault 42", makeCtx())
    const text = lines.join("\n")
    expect(text).toContain("VAULT OPENED — WELL DUG.")
    expect(text).toContain("algovn{cursor_was_real}")
    expect(text).toContain("email this flag to minhducle.dev@gmail.com")
    expect(text).toContain("subject: 'i found it' — and you enter finders.txt")
  })

  it("wrong key fails cryptically", async () => {
    expect((await runCommand("decrypt .vault 41", makeCtx())).lines).toEqual([
      "decryption failed. think bigger. or smaller. or… deeper.",
    ])
  })

  it("wrong target is not encrypted", async () => {
    expect((await runCommand("decrypt README.md 42", makeCtx())).lines).toEqual([
      "decrypt: README.md: not encrypted",
    ])
  })

  it("bare decrypt shows usage", async () => {
    expect((await runCommand("decrypt", makeCtx())).lines).toEqual([
      "usage: decrypt .vault <key>",
    ])
  })

  it("decrypt is never listed in COMMAND_NAMES or help", async () => {
    expect(COMMAND_NAMES).not.toContain("decrypt")
  })

  it("the full trail plays end to end", async () => {
    const ctx = makeCtx()
    const la = await runCommand("ls -la", ctx)
    expect(la.lines[0]).toContain(".plan")
    await runCommand("cat .plan", ctx)
    expect(ctx.session.planSeen).toBe(true)
    const vault = await runCommand("cat .vault", ctx)
    expect(vault.lines.join("\n")).toContain("usage: decrypt .vault <key>")
    const finale = await runCommand("decrypt .vault 42", ctx)
    expect(finale.lines.join("\n")).toContain("algovn{cursor_was_real}")
  })
})
