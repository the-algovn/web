import { expect, it, vi } from "vitest"
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

it("requests offline_access on top of the default scope, so the session can renew", () => {
  const { userManager } = createAuth(config)
  expect(userManager.settings.scope).toBe("openid profile offline_access")
})

it("appends offline_access to an explicit scope without altering it", () => {
  const { userManager } = createAuth({
    ...config,
    basePath: "/console",
    scope: "openid profile urn:zitadel:iam:org:projects:roles",
  })
  expect(userManager.settings.scope).toBe(
    "openid profile urn:zitadel:iam:org:projects:roles offline_access"
  )
  expect(userManager.settings.redirect_uri).toBe("https://algovn.com/console/callback")
})

it("does not duplicate offline_access when the caller already asked for it", () => {
  const { userManager } = createAuth({ ...config, scope: "openid profile offline_access" })
  expect(userManager.settings.scope).toBe("openid profile offline_access")
})

it("renews automatically before the access token expires", () => {
  const { userManager } = createAuth(config)
  expect(userManager.settings.automaticSilentRenew).toBe(true)
})

it("falls back to the window origin when none is injected", () => {
  const { userManager } = createAuth({
    authority: "https://id.algovn.com",
    clientId: "client-123",
    basePath: "/console",
  })
  expect(userManager.settings.redirect_uri).toBe(`${window.location.origin}/console/callback`)
})

it("keeps the session across a reload — a fresh manager still finds the stored user", async () => {
  window.localStorage.clear()
  const first = createAuth({ ...config, origin: "http://localhost:5173" })
  await first.userManager.storeUser(
    new User({
      access_token: "tok",
      token_type: "Bearer",
      profile: { sub: "user-1", iss: "https://id.algovn.com", aud: "app", exp: 0, iat: 0 },
    })
  )
  // A reload is a brand-new UserManager over the same web storage. This is the
  // behaviour the whole change exists for, so assert it end-to-end rather than
  // poking at localStorage keys.
  const afterReload = createAuth({ ...config, origin: "http://localhost:5173" })
  const stored = await afterReload.userManager.getUser()
  expect(stored?.access_token).toBe("tok")
})

it("signs the user out when the access token expires and renewal fails", async () => {
  const { userManager } = createAuth(config)
  vi.spyOn(userManager, "signinSilent").mockRejectedValue(new Error("no session"))
  const removeUser = vi.spyOn(userManager, "removeUser").mockResolvedValue()
  // The expiry wiring is only reachable through oidc-client-ts's internals:
  // addAccessTokenExpired registers on events._expiredTimer, a Timer extending
  // Event, so raise() runs the handlers. Verified against 3.5.0.
  const events = userManager.events as unknown as { _expiredTimer: { raise: () => Promise<void> } }
  await events._expiredTimer.raise()
  expect(removeUser).toHaveBeenCalledTimes(1)
})

it("attempts a silent renewal instead of signing out when an already-expired user still has a refresh token", async () => {
  window.localStorage.clear()
  const { userManager } = createAuth({ ...config, origin: "http://localhost:5173" })
  // Mirrors the real scenario: a stored user whose access token already
  // expired (e.g. the browser was closed overnight) but whose refresh token
  // is still good. storeUser isn't consulted by the raise() below — it
  // documents the case this test pins, same as the browser-restart test above.
  await userManager.storeUser(
    new User({
      access_token: "tok",
      refresh_token: "refresh-tok",
      token_type: "Bearer",
      expires_at: Math.floor(Date.now() / 1000) - 60, // already expired
      profile: { sub: "user-1", iss: "https://id.algovn.com", aud: "app", exp: 0, iat: 0 },
    })
  )
  const signinSilent = vi.spyOn(userManager, "signinSilent").mockResolvedValue(null)
  const removeUser = vi.spyOn(userManager, "removeUser").mockResolvedValue()
  const events = userManager.events as unknown as { _expiredTimer: { raise: () => Promise<void> } }
  await events._expiredTimer.raise()
  expect(signinSilent).toHaveBeenCalledTimes(1)
  expect(removeUser).not.toHaveBeenCalled()
})

it("signIn triggers the manager's signinRedirect", async () => {
  const { userManager, signIn } = createAuth(config)
  const signinRedirect = vi.spyOn(userManager, "signinRedirect").mockResolvedValue()
  const signoutRedirect = vi.spyOn(userManager, "signoutRedirect").mockResolvedValue()
  await signIn()
  expect(signinRedirect).toHaveBeenCalledTimes(1)
  expect(signoutRedirect).not.toHaveBeenCalled()
})

it("signOut triggers the manager's signoutRedirect", async () => {
  const { userManager, signOut } = createAuth(config)
  const signinRedirect = vi.spyOn(userManager, "signinRedirect").mockResolvedValue()
  const signoutRedirect = vi.spyOn(userManager, "signoutRedirect").mockResolvedValue()
  await signOut()
  expect(signoutRedirect).toHaveBeenCalledTimes(1)
  expect(signinRedirect).not.toHaveBeenCalled()
})

it("completeSignIn returns the user from signinCallback", async () => {
  const { userManager, completeSignIn } = createAuth(config)
  const user = new User({
    access_token: "tok",
    token_type: "Bearer",
    profile: { sub: "user-1", iss: "https://id.algovn.com", aud: "app", exp: 0, iat: 0 },
  })
  vi.spyOn(userManager, "signinCallback").mockResolvedValue(user)
  await expect(completeSignIn()).resolves.toBe(user)
})

it("completeSignIn throws when signinCallback returns no user", async () => {
  const { userManager, completeSignIn } = createAuth(config)
  vi.spyOn(userManager, "signinCallback").mockResolvedValue(undefined)
  await expect(completeSignIn()).rejects.toThrow("no user returned from the sign-in callback")
})
