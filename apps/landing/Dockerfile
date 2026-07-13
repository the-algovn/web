# Build context is the REPO ROOT: podman build -f apps/landing/Dockerfile .
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages ./packages
COPY apps/landing ./apps/landing
RUN pnpm install --frozen-lockfile
RUN pnpm --filter landing build

FROM nginx:alpine AS runtime
COPY apps/landing/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/landing/out /usr/share/nginx/html
EXPOSE 80
