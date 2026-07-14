import { describe, expect, it } from "vitest"
import { complete } from "./completion"
import { createFilesystem } from "./filesystem"
import type { Session } from "./commands"

const fs = createFilesystem()
const fresh = (): Session => ({ planSeen: false, unknownHinted: false })
const seen = (): Session => ({ planSeen: true, unknownHinted: false })

describe("command completion", () => {
  it("completes a unique command prefix", () => {
    expect(complete("who", fs, fresh())).toBe("whoami")
    expect(complete("cow", fs, fresh())).toBe("cowsay")
  })

  it("completes with a leading-space buffer", () => {
    expect(complete(" who", fs, fresh())).toBe(" whoami")
  })

  it("returns null on ambiguity or no match", () => {
    expect(complete("c", fs, fresh())).toBeNull()
    expect(complete("zzz", fs, fresh())).toBeNull()
  })

  it("gates decrypt behind .plan", () => {
    expect(complete("dec", fs, fresh())).toBeNull()
    expect(complete("dec", fs, seen())).toBe("decrypt")
  })
})

describe("file completion", () => {
  it("completes a filename argument", () => {
    expect(complete("cat READ", fs, fresh())).toBe("cat README.md")
    expect(complete("cat fin", fs, fresh())).toBe("cat finders.txt")
  })

  it("completes across a multi-space buffer", () => {
    expect(complete("cat  READ", fs, fresh())).toBe("cat  README.md")
  })

  it("completes directories with a trailing slash and descends", () => {
    expect(complete("ls proj", fs, fresh())).toBe("ls projects/")
    expect(complete("cat projects/the", fs, fresh())).toBe("cat projects/the-button")
  })

  it("completes dotfiles only once the dot is typed", () => {
    expect(complete("cat .p", fs, fresh())).toBe("cat .plan")
    expect(complete("cat ", fs, fresh())).toBeNull()
  })

  it("returns null for a hopeless path", () => {
    expect(complete("cat ghost/x", fs, fresh())).toBeNull()
  })

  it("returns null for an already-complete token", () => {
    expect(complete("cat README.md", fs, fresh())).toBeNull()
  })
})
