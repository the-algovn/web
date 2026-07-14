import { describe, expect, it } from "vitest"
import { createFilesystem } from "./filesystem"
import { runCommand, type CommandCtx } from "./commands"

export function makeCtx(overrides: Partial<CommandCtx> = {}): CommandCtx {
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
