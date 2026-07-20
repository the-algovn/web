/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OIDC_AUTHORITY?: string
  readonly VITE_OIDC_CLIENT_ID?: string
  readonly VITE_API_BASE?: string
}

// TypeScript 6's noUncheckedSideEffectImports (default true) checks that
// side-effect-only imports resolve to *something* typed. vite/client's
// ambient `declare module '*.css' {}` only matches specifiers literally ending
// in `.css`; these packages are imported by bare name and resolve to CSS via
// their package.json `exports` map, so they need their own declarations.
declare module "@fontsource-variable/geist"
declare module "@fontsource-variable/geist-mono"
