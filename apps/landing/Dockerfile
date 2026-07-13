# Build context is the REPO ROOT: podman build -f apps/landing/Dockerfile .
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages ./packages
COPY apps/landing ./apps/landing
RUN pnpm install --frozen-lockfile
RUN pnpm --filter landing build
RUN mkdir -p /app/apps/landing/public

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/apps/landing/.next/standalone ./
COPY --from=build /app/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=build /app/apps/landing/public ./apps/landing/public
USER node
EXPOSE 3000
CMD ["node", "apps/landing/server.js"]
