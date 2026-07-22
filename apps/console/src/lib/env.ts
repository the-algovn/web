// Build-time config. Vite folds import.meta.env at build time, so these
// defaults are the baked prod values — the Tiltfile serve_env overrides them
// for local dev.
export const env = {
  oidcAuthority: import.meta.env.VITE_OIDC_AUTHORITY ?? "https://id.algovn.com",
  oidcClientId:
    import.meta.env.VITE_OIDC_CLIENT_ID ?? "SET_VITE_OIDC_CLIENT_ID",
  apiBase: import.meta.env.VITE_API_BASE ?? "https://api.algovn.com/radio-lab",
  radioApiBase:
    import.meta.env.VITE_RADIO_API_BASE ?? "https://api.algovn.com/radio",
  eventsUrl: import.meta.env.VITE_EVENTS_URL ?? "https://api.algovn.com/events",
}
