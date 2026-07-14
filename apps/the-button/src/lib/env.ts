// Build-time configuration. Production values are baked in as defaults so a
// plain `pnpm build` and the Docker image work without a .env file (the repo
// .gitignore excludes .env*). Any VITE_* var set at build time overrides.
export const env = {
  oidcAuthority: import.meta.env.VITE_OIDC_AUTHORITY ?? "https://id.algovn.com",
  // Set after Zitadel onboarding (T19); empty means sign-in cannot start yet.
  oidcClientId: import.meta.env.VITE_OIDC_CLIENT_ID ?? "",
  apiBase: import.meta.env.VITE_API_BASE ?? "https://api.algovn.com/the-button",
  eventsUrl: import.meta.env.VITE_EVENTS_URL ?? "https://api.algovn.com/events/the-button.counter",
}
