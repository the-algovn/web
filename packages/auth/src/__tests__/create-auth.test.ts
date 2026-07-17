import { expect, it } from "vitest"
import { User } from "oidc-client-ts"
import { createAuth } from "../index"

const config = {
  authority: "https://id.algovn.com",
  clientId: "client-123",
  basePath: "/the-button",
  origin: "https://algovn.com",
}

it("builds PKCE settings from the injected origin, authority and basePath", () => {
  const { userManager } = createAuth(config)
  expect(userManager.settings.authority).toBe("https://id.algovn.com")
  expect(userManager.settings.client_id).toBe("client-123")
  expect(userManager.settings.redirect_uri).toBe("https://algovn.com/the-button/callback")
  expect(userManager.settings.post_logout_redirect_uri).toBe("https://algovn.com/the-button/")
  expect(userManager.settings.response_type).toBe("code")
})

it("defaults the scope to openid profile", () => {
  const { userManager } = createAuth(config)
  expect(userManager.settings.scope).toBe("openid profile")
})

it("uses an explicit scope when one is given", () => {
  const { userManager } = createAuth({
    ...config,
    basePath: "/console",
    scope: "openid profile urn:zitadel:iam:org:projects:roles",
  })
  expect(userManager.settings.scope).toBe("openid profile urn:zitadel:iam:org:projects:roles")
  expect(userManager.settings.redirect_uri).toBe("https://algovn.com/console/callback")
})

it("falls back to the window origin when none is injected", () => {
  const { userManager } = createAuth({
    authority: "https://id.algovn.com",
    clientId: "client-123",
    basePath: "/console",
  })
  expect(userManager.settings.redirect_uri).toBe(`${window.location.origin}/console/callback`)
})

it("keeps the signed-in user in memory only — never web storage", async () => {
  const { userManager } = createAuth({ ...config, origin: "http://localhost:5173" })
  window.sessionStorage.clear()
  window.localStorage.clear()
  await userManager.storeUser(
    new User({
      access_token: "tok",
      token_type: "Bearer",
      profile: { sub: "user-1", iss: "https://id.algovn.com", aud: "app", exp: 0, iat: 0 },
    })
  )
  expect(window.sessionStorage.length).toBe(0)
  expect(window.localStorage.length).toBe(0)
  const stored = await userManager.getUser()
  expect(stored?.access_token).toBe("tok")
})
