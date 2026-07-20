// Read-only decode of the access token payload (the gateway verified the
// signature; services and SPAs never re-verify — platform convention).
export function rolesFromToken(accessToken: string): string[] {
  try {
    const seg = accessToken.split(".")[1]
    if (!seg) return []
    const payload = JSON.parse(
      atob(seg.replace(/-/g, "+").replace(/_/g, "/")),
    ) as Record<string, unknown>
    const roles = payload["urn:zitadel:iam:org:project:roles"]
    return roles && typeof roles === "object" ? Object.keys(roles) : []
  } catch {
    return []
  }
}
