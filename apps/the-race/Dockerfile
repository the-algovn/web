# Build context is the REPO ROOT: podman build -f apps/the-race/Dockerfile .
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages ./packages
COPY apps/the-race ./apps/the-race
RUN pnpm install --frozen-lockfile

ARG VITE_OIDC_CLIENT_ID=placeholder
ENV VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID

RUN pnpm --filter the-race build

FROM nginx:1.27-alpine AS runtime
COPY apps/the-race/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/the-race/dist /usr/share/nginx/html/the-race
EXPOSE 80
