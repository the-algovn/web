import { describe, expect, it, vi } from "vitest"
import { createRaceClient } from "../race-client"

// The mock stands in for ApiClient["request"], whose generic signature vi.fn()
// cannot express; the cast is the test double, not a type escape in the app.
const clientWith = (impl: ReturnType<typeof vi.fn>) =>
  createRaceClient({ apiBase: "/the-race", request: impl as never })

describe("createRaceClient", () => {
  it("sends the title and returns a normalized room", async () => {
    const request = vi.fn().mockResolvedValue({
      room: { id: "r1", code: "JVZDHT", title: "Ai trả tiền cà phê?" },
    })

    const room = await clientWith(request).createRoom("Ai trả tiền cà phê?", "tok")

    expect(request).toHaveBeenCalledWith(
      "POST",
      "/rooms",
      { title: "Ai trả tiền cà phê?" },
      "tok",
    )
    expect(room.code).toBe("JVZDHT")
    // createdAtMs was absent from the response; it must still be a number.
    expect(room.createdAtMs).toBe(0)
  })

  it("keeps CreateRace and StartRace as two calls", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ raceId: "race-1", seedCommit: "abc" })
      .mockResolvedValueOnce({})
    const client = clientWith(request)

    const created = await client.createRace("room-1", ["Đức", "Lan"], "tok")
    expect(created).toEqual({ raceId: "race-1", seedCommit: "abc" })

    await client.startRace("race-1", "nonce-hex", "tok")

    // Splitting these is what binds the server to its half of the seed before
    // it sees the nonce — collapsing them would void the fairness guarantee.
    expect(request.mock.calls[0]?.[1]).toBe("/races")
    expect(request.mock.calls[1]?.[1]).toBe("/races/start")
    expect(request.mock.calls[1]?.[2]).toEqual({
      raceId: "race-1",
      clientNonce: "nonce-hex",
    })
  })

  it("reads a preparing race without a package", async () => {
    const request = vi.fn().mockResolvedValue({
      status: "RACE_STATUS_PREPARING",
      prepareStage: "commentating",
    })

    const got = await clientWith(request).getRace("race-1")

    expect(got.status).toBe("RACE_STATUS_PREPARING")
    expect(got.prepareStage).toBe("commentating")
    expect(got.race).toBeNull()
  })

  it("normalizes a ready package", async () => {
    const request = vi.fn().mockResolvedValue({
      status: "RACE_STATUS_READY",
      race: {
        raceId: "race-1",
        duckNames: ["Đức", "Lan"],
        durationMs: 12000,
        lines: [{ text: "bắt đầu", intensity: 3 }],
        ticks: [{ positions: [0, 0] }],
        finishOrder: [1, 0],
        fairness: { seedCommit: "abc", serverSeed: "def", clientNonce: "n" },
      },
    })

    const got = await clientWith(request).getRace("race-1")

    expect(got.race?.lines[0]?.atMs).toBe(0)
    expect(got.race?.ticks[0]?.tMs).toBe(0)
    expect(got.race?.fairness.seed).toBe("")
  })

  it("reads history and its tally, and asks anonymously", async () => {
    const request = vi.fn().mockResolvedValue({
      races: [{ raceId: "race-1", status: "RACE_STATUS_READY", duckNames: ["Đức"] }],
      tally: [{ duckName: "Đức", wins: 1 }],
    })

    const got = await clientWith(request).listRoomRaces("room-1")

    expect(got.races[0]?.winnerIndex).toBe(0)
    expect(got.tally).toEqual([{ duckName: "Đức", wins: 1 }])
    // No token argument: a shared link works for someone who never signs in.
    expect(request).toHaveBeenCalledWith("POST", "/rooms/races", {
      roomId: "room-1",
    })
  })
})
