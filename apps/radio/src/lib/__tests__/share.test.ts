import { afterEach, describe, expect, it, vi } from "vitest"
import { share } from "../share"

const INPUT = { title: "Tần Số 42", url: "https://algovn.com/radio" }

function stubNavigator(over: Record<string, unknown>) {
  vi.stubGlobal("navigator", { ...over })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("share", () => {
  it("uses the native share sheet when present", async () => {
    const native = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share: native })
    await expect(share(INPUT)).resolves.toBe("shared")
    expect(native).toHaveBeenCalledWith(INPUT)
  })

  it("falls back to the clipboard when the share sheet is dismissed", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubNavigator({
      share: vi.fn().mockRejectedValue(new Error("dismissed")),
      clipboard: { writeText },
    })
    await expect(share(INPUT)).resolves.toBe("copied")
    expect(writeText).toHaveBeenCalledWith(INPUT.url)
  })

  it("uses the clipboard when there is no share sheet at all", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ clipboard: { writeText } })
    await expect(share(INPUT)).resolves.toBe("copied")
  })

  it("reports unsupported when neither path works", async () => {
    stubNavigator({})
    await expect(share(INPUT)).resolves.toBe("unsupported")
  })
})
