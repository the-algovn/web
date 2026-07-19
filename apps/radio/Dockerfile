# Build context is the REPO ROOT: podman build -f apps/radio/Dockerfile .
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages ./packages
COPY apps/radio ./apps/radio
RUN pnpm install --frozen-lockfile
RUN pnpm --filter radio build

FROM nginx:1.27-alpine AS runtime
COPY apps/radio/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/radio/dist /usr/share/nginx/html/radio
EXPOSE 80
