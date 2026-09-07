import { describe, expect, it } from "vitest"
import { registry } from "../registry"

describe("module registry", () => {
  it("has unique kebab-case ids and complete descriptors", () => {
    const ids = registry.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const m of registry) {
      // A single colon namespaces a product's modules (video-claw:sources).
      // The id IS the URL hash - moduleFromHash matches the whole remainder
      // against it - so these are bookmarkable and cannot be renamed to plain
      // kebab-case without breaking existing links.
      expect(m.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*(:[a-z0-9]+(-[a-z0-9]+)*)?$/)
      expect(m.title.length).toBeGreaterThan(0)
      expect(m.group.length).toBeGreaterThan(0)
      expect(m.component).toBeDefined()
      expect([null, "admin"]).toContain(m.requiredRole)
    }
  })
})
