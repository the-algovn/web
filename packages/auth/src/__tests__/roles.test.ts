import { describe, expect, it } from "vitest"
import { rolesFromToken } from "../index"

function fakeJwt(payload: object): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
  return `${b64({ alg: "RS256" })}.${b64(payload)}.sig`
}

describe("rolesFromToken", () => {
  it("extracts role keys from the zitadel claim", () => {
    const tok = fakeJwt({
      sub: "1",
      "urn:zitadel:iam:org:project:roles": { admin: { "123": "algovn" } },
    })
    expect(rolesFromToken(tok)).toEqual(["admin"])
  })
  it("returns empty for missing claim or garbage", () => {
    expect(rolesFromToken(fakeJwt({ sub: "1" }))).toEqual([])
    expect(rolesFromToken("not-a-jwt")).toEqual([])
  })
  it("returns empty when the payload segment decodes but isn't valid JSON", () => {
    expect(rolesFromToken("a.YWJj.c")).toEqual([])
  })
})
