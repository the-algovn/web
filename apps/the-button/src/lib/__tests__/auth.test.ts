import { expect, it } from "vitest"
import { userManager } from "../auth"

it("binds the-button's basePath, authority and default scope", () => {
  expect(userManager.settings.authority).toBe("https://id.algovn.com")
  expect(userManager.settings.redirect_uri).toBe(`${window.location.origin}/the-button/callback`)
  expect(userManager.settings.post_logout_redirect_uri).toBe(`${window.location.origin}/the-button/`)
  expect(userManager.settings.scope).toBe("openid profile")
})
