import { describe, expect, it } from "vitest"
import { createFilesystem, resolvePath, VAULT_BLOB } from "./filesystem"

describe("createFilesystem", () => {
  const fs = createFilesystem()

  it("has the visible entries in spec order", () => {
    const visible = Object.keys(fs).filter((n) => !n.startsWith("."))
    expect(visible).toEqual([
      "projects",
      "README.md",
      "contact.txt",
      "finders.txt",
    ])
  })

  it("hides .plan and .vault behind dot names", () => {
    expect(Object.keys(fs)).toContain(".plan")
    expect(Object.keys(fs)).toContain(".vault")
  })

  it("mirrors config/apps inside projects/", () => {
    const projects = fs.projects
    if (projects.kind !== "dir") throw new Error("projects is not a dir")
    expect(Object.keys(projects.children)).toContain("the-button")
  })

  it("serves finders.txt from the network", () => {
    expect(fs["finders.txt"]).toEqual({ kind: "remote", url: "/finders.txt" })
  })

  it("stores only the encoded blob in .vault, never the plaintext flag", () => {
    const vault = fs[".vault"]
    if (vault.kind !== "file") throw new Error(".vault is not a file")
    expect(vault.content).toContain(VAULT_BLOB)
    expect(vault.content).toContain("usage: decrypt .vault <key>")
    expect(vault.content).not.toContain("algovn{")
  })

  it(".plan hints at the vault and the key", () => {
    const plan = fs[".plan"]
    if (plan.kind !== "file") throw new Error(".plan is not a file")
    expect(plan.content).toContain("the good stuff is encrypted in .vault.")
    expect(plan.content).toContain("the key is the answer to everything.")
  })
})

describe("resolvePath", () => {
  const fs = createFilesystem()

  it("resolves a top-level file", () => {
    expect(resolvePath(fs, "README.md")?.kind).toBe("file")
  })

  it("resolves nested paths and trailing/leading noise", () => {
    expect(resolvePath(fs, "projects/the-button")?.kind).toBe("file")
    expect(resolvePath(fs, "./projects/")?.kind).toBe("dir")
  })

  it("returns null for missing paths and file-as-dir traversal", () => {
    expect(resolvePath(fs, "nope.txt")).toBeNull()
    expect(resolvePath(fs, "README.md/child")).toBeNull()
  })
})
