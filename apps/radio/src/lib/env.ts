// Build-time configuration. Vite inlines import.meta.env at build. Defaults are
// baked in so a plain `pnpm build` and the Docker image work with no .env file.
// useMock defaults true (dev/local builds); prod CI flips it off via Docker build-args.
export const env = {
  useMock: import.meta.env.VITE_USE_MOCK !== "false",
  streamUrl:
    import.meta.env.VITE_STREAM_URL ??
    "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  apiBase: import.meta.env.VITE_API_BASE ?? "https://api.algovn.com/radio",
  eventsUrl: import.meta.env.VITE_EVENTS_URL ?? "https://api.algovn.com/events",
  oidcAuthority: import.meta.env.VITE_OIDC_AUTHORITY || "https://id.algovn.com",
  // radio-web public client (Zitadel) — no client exists yet; CI injects the
  // real id via vars.VITE_RADIO_OIDC_CLIENT_ID once the app is registered.
  oidcClientId: import.meta.env.VITE_OIDC_CLIENT_ID || "placeholder",
}
