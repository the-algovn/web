import { describe, expect, it, vi } from "vitest"
import type { ApiClient } from "@algovn/api"
import {
  createRequestApi,
  parseCandidate,
  parseTrackRequest,
} from "../request-client"

describe("parseCandidate", () => {
  it("accepts protojson with omitted zero fields", () => {
    expect(
      parseCandidate({ ytId: "a", title: "T", channel: "C", durationS: 240 }),
    ).toEqual({ ytId: "a", title: "T", channel: "C", durationS: 240 })
    // protojson omits zero-valued fields — durationS may be absent
    expect(parseCandidate({ ytId: "a", title: "T" })).toEqual({
      ytId: "a",
      title: "T",
      durationS: 0,
    })
    expect(parseCandidate({ title: "no id" })).toBeNull()
    expect(parseCandidate("nope")).toBeNull()
  })
})

describe("parseTrackRequest", () => {
  it("parses a full record and defaults optionals", () => {
    const r = parseTrackRequest({
      id: "r1", source: "listener", requestedByName: "Ngọc", ytId: "a",
      title: "T", durationS: 240, status: "approved", createdAt: "2026-07-22T01:00:00Z",
    })
    expect(r?.status).toBe("approved")
    expect(r?.requestedByName).toBe("Ngọc")
    expect(parseTrackRequest({ id: "r1", ytId: "a", title: "T" })).toBeNull() // no status/source
  })
})

describe("createRequestApi", () => {
  it("hits the three routes with the bearer token", async () => {
    const request = vi.fn(
      async (_verb: string, path: string, _body?: unknown, _token?: string) => {
        if (path === "/search")
          return { candidates: [{ ytId: "a", title: "T", durationS: 100 }] }
        if (path === "/requests")
          return {
            request: {
              id: "r1", source: "listener", ytId: "a", title: "T",
              durationS: 100, status: "ready", createdAt: "2026-07-22T01:00:00Z",
            },
          }
        return {
          requests: [
            { id: "r1", source: "listener", ytId: "a", title: "T",
              durationS: 100, status: "aired", createdAt: "2026-07-22T01:00:00Z" },
          ],
        }
      },
    ) as unknown as ApiClient["request"]
    const api = createRequestApi({ request })

    const cs = await api.search("tok", "đen vâu")
    expect(cs).toHaveLength(1)
    expect(request).toHaveBeenCalledWith("POST", "/search", { query: "đen vâu" }, "tok")

    const r = await api.requestTrack("tok", cs[0]!)
    expect(r.status).toBe("ready")
    expect(request).toHaveBeenCalledWith(
      "POST", "/requests",
      { candidate: { ytId: "a", title: "T", durationS: 100 } }, "tok",
    )

    const mine = await api.myRequests("tok")
    expect(mine[0]?.status).toBe("aired")
    expect(request).toHaveBeenCalledWith("GET", "/requests/mine", undefined, "tok")
  })
})
