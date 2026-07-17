# Build context is the REPO ROOT: podman build -f apps/console/Dockerfile .
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages ./packages
COPY apps/console ./apps/console
RUN pnpm install --frozen-lockfile
# Vite inlines import.meta.env at build time. The console has its OWN Actions
# variable (VITE_CONSOLE_OIDC_CLIENT_ID) because VITE_OIDC_CLIENT_ID belongs to
# the-button — a different Zitadel app. Sharing it breaks one of the two.
ARG VITE_OIDC_CLIENT_ID=placeholder
ENV VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID
# VITE_ENABLE_LAB deliberately unset: radio-lab is local-only, so a prod build
# ships the shell without the benches.
RUN pnpm --filter console build

FROM nginx:1.27-alpine AS runtime
COPY apps/console/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/console/dist /usr/share/nginx/html/console
EXPOSE 80
