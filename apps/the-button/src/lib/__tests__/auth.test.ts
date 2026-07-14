import { expect, it } from "vitest"
import { User } from "oidc-client-ts"
import { createUserManager } from "../auth"

it("builds PKCE settings from the origin and the Zitadel authority", () => {
  const um = createUserManager("https://algovn.com")
  expect(um.settings.authority).toBe("https://id.algovn.com")
  expect(um.settings.redirect_uri).toBe("https://algovn.com/the-button/callback")
  expect(um.settings.post_logout_redirect_uri).toBe("https://algovn.com/the-button/")
  expect(um.settings.response_type).toBe("code")
  expect(um.settings.scope).toBe("openid profile")
})

it("keeps the signed-in user in memory only — never web storage", async () => {
  const um = createUserManager("http://localhost:5173")
  window.sessionStorage.clear()
  window.localStorage.clear()
  await um.storeUser(
    new User({
      access_token: "tok",
      token_type: "Bearer",
      profile: { sub: "user-1", iss: "https://id.algovn.com", aud: "app", exp: 0, iat: 0 },
    })
  )
  expect(window.sessionStorage.length).toBe(0)
  expect(window.localStorage.length).toBe(0)
  const stored = await um.getUser()
  expect(stored?.access_token).toBe("tok")
})
