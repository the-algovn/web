export interface ShareInput {
  title: string
  url: string
}

export type ShareResult = "shared" | "copied" | "unsupported"

// Native sheet first, clipboard second, honest failure third. A dismissed
// share sheet rejects, which is indistinguishable from a real failure — so
// falling through to the clipboard is the friendly reading.
export async function share(input: ShareInput): Promise<ShareResult> {
  const nav = navigator as Navigator & {
    share?: (data: ShareInput) => Promise<void>
  }
  if (typeof nav.share === "function") {
    try {
      await nav.share({ title: input.title, url: input.url })
      return "shared"
    } catch {
      /* dismissed or unavailable — try the clipboard */
    }
  }
  const writeText = navigator.clipboard?.writeText
  if (typeof writeText === "function") {
    try {
      await navigator.clipboard.writeText(input.url)
      return "copied"
    } catch {
      /* blocked — report honestly below */
    }
  }
  return "unsupported"
}
