# Build context is the REPO ROOT: podman build -f apps/radio/Dockerfile .
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages ./packages
COPY apps/radio ./apps/radio
RUN pnpm install --frozen-lockfile

# Build-time SPA config. Defaults reproduce the mock image exactly (an ARG
# without a default would become an empty-string ENV, and env.ts's `??`
# fallback does not treat "" as absent). CI overrides both for prod.
ARG VITE_USE_MOCK=true
ARG VITE_STREAM_URL=https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
ENV VITE_USE_MOCK=$VITE_USE_MOCK
ENV VITE_STREAM_URL=$VITE_STREAM_URL

RUN pnpm --filter radio build

FROM nginx:1.27-alpine AS runtime
COPY apps/radio/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/radio/dist /usr/share/nginx/html/radio
EXPOSE 80
