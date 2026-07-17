import { expect, it } from "vitest"
import { userManager } from "../auth"

it("binds console's basePath and the Zitadel roles scope", () => {
  expect(userManager.settings.authority).toBe("https://id.algovn.com")
  expect(userManager.settings.redirect_uri).toBe(`${window.location.origin}/console/callback`)
  expect(userManager.settings.post_logout_redirect_uri).toBe(`${window.location.origin}/console/`)
  expect(userManager.settings.scope).toBe("openid profile urn:zitadel:iam:org:projects:roles")
})
