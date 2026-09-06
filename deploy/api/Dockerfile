# Imagen compartida por pos-api y pos-worker (mismo build, distinto comando).
# Construir desde la raíz del repo:  docker build -f deploy/api/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile --filter @posbar/api... --ignore-scripts

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY packages/db packages/db
COPY apps/api apps/api
RUN pnpm --filter @posbar/contracts build \
 && pnpm --filter @posbar/db build \
 && pnpm --filter @posbar/api build \
 && pnpm --filter @posbar/api deploy --prod --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /out ./
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://127.0.0.1:${API_PORT:-3000}/health >/dev/null || exit 1
# pos-api (por defecto). Para pos-worker sobrescribir el comando: node dist/worker.js
CMD ["node", "dist/main.js"]
