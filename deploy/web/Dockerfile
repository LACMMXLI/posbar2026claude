# pos-web: React + Vite compilado y servido por Nginx. Solo estáticos.
# Construir desde la raíz:  docker build -f deploy/web/Dockerfile --build-arg VITE_API_URL=https://api.ejemplo.com .
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
RUN pnpm install --frozen-lockfile --filter @posbar/web... --ignore-scripts
COPY packages/contracts packages/contracts
COPY apps/web apps/web
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter @posbar/contracts build && pnpm --filter @posbar/web build

FROM nginx:1.27-alpine AS runtime
COPY deploy/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
