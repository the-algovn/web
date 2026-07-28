// Build-time configuration. Vite inlines import.meta.env at build. Defaults are
// baked in so a plain `pnpm build` and the Docker image work with no .env file.
export const env = {
  apiBase: import.meta.env.VITE_API_BASE ?? "https://api.algovn.com/the-race",
  oidcAuthority: import.meta.env.VITE_OIDC_AUTHORITY || "https://id.algovn.com",
  // the-race public client (Zitadel). No client is registered yet — creating a
  // room stays disabled until CI injects a real id here. Watching a shared race
  // never needs one.
  oidcClientId: import.meta.env.VITE_OIDC_CLIENT_ID || "placeholder",
}

/** Signing in is only possible once a real Zitadel client exists. */
export const authConfigured = env.oidcClientId !== "placeholder"
