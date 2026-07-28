/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_OIDC_AUTHORITY?: string
  readonly VITE_OIDC_CLIENT_ID?: string
}

// TypeScript 6's noUncheckedSideEffectImports (default true) checks that
// side-effect-only imports resolve to *something* typed. vite/client's ambient
// `declare module '*.css'` only matches specifiers literally ending in `.css`;
// these packages are imported by bare name and resolve to CSS via their
// package.json `exports` map, so they need their own declarations.
declare module "@fontsource-variable/geist"
declare module "@fontsource-variable/geist-mono"

// Safari still ships the prefixed constructor; the unprefixed one is optional
// there, so both are declared and the app picks whichever exists.
interface Window {
  webkitAudioContext?: typeof AudioContext
}
