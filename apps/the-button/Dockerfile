# Build context is the REPO ROOT: podman build -f apps/the-button/Dockerfile .
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages ./packages
COPY apps/the-button ./apps/the-button
RUN pnpm install --frozen-lockfile
# Vite inlines import.meta.env at build time. "placeholder" until the Zitadel
# SPA app exists (T19) — then set the VITE_OIDC_CLIENT_ID Actions variable.
ARG VITE_OIDC_CLIENT_ID=placeholder
ENV VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID
RUN pnpm --filter the-button build

FROM nginx:1.27-alpine AS runtime
COPY apps/the-button/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/the-button/dist /usr/share/nginx/html/the-button
EXPOSE 80
