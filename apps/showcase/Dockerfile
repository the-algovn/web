# Build context is the REPO ROOT: podman build -f apps/showcase/Dockerfile .
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages ./packages
COPY apps/showcase ./apps/showcase
RUN pnpm install --frozen-lockfile
RUN pnpm --filter showcase build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/apps/showcase/.next/standalone ./
COPY --from=build /app/apps/showcase/.next/static ./apps/showcase/.next/static
COPY --from=build /app/apps/showcase/public ./apps/showcase/public
USER node
EXPOSE 3000
CMD ["node", "apps/showcase/server.js"]
