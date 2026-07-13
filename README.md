# the-algovn/web

Web monorepo: the `@algovn/ui` design system + Next.js apps.

## Layout

- `packages/ui` — design system: full shadcn sweep, charts, AppShell, composites, dark-first tokens
- `packages/config` — shared tsconfig + ESLint flat configs
- `apps/showcase` — living documentation (`pnpm --filter showcase dev`)
- `apps/landing` — algovn.com landing page, phone-launcher UI (`pnpm --filter landing dev`)

## Commands

```bash
pnpm install
pnpm dev          # turbo dev (showcase on :3000)
pnpm turbo lint typecheck test build
```

## Adding an app

1. `cd apps && pnpm dlx create-next-app@latest <name> --ts --eslint --tailwind --app --src-dir --use-pnpm`
   - `create-next-app` drops its own lockfile/`.git`/`node_modules`/`pnpm-workspace.yaml` inside the new app dir — delete them so the app joins the root workspace instead of shadowing it.
2. `pnpm add --filter <name> "@algovn/ui@workspace:*"`
3. `transpilePackages: ["@algovn/ui"]` in next.config
4. globals.css: `@import "@algovn/ui/globals.css";` + `@source "../../../../packages/ui/src";`
5. Wrap layout in `ThemeProvider`, set Geist font variables on `<html>`

Pin the new app's `react`/`react-dom` to the same range as `packages/ui` (`^19.2.7` today) so pnpm dedupes the peer-resolved react packages instead of installing a second copy.
