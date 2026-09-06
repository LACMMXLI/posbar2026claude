# Arquitectura

<!-- tope: 200 líneas -->

Describe lo que **existe**. Se modifica solo con un ADR. Las decisiones de fondo y su justificación viven en `DEVELOPMENT_PLAN.md` §1.

## Forma general

Monolito modular en el backend (un proceso, módulos con fronteras estrictas), con **servicios de despliegue separados** en Coolify para escalar y reiniciar cada pieza por su cuenta.

## Servicios desplegados

| Servicio      | Tipo          | Estado (fase 01)                                                               |
| ------------- | ------------- | ------------------------------------------------------------------------------ |
| `pos-api`     | NestJS        | Un endpoint `GET /health` que verifica PostgreSQL y Redis. Logs Pino.          |
| `pos-worker`  | Misma imagen  | Arranca, alcanza Redis, latido cada 30 s. Sin colas todavía (BullMQ: fase 18). |
| `pos-web`     | React + Vite  | Estáticos servidos por Nginx. Muestra el estado de `/health`.                  |
| `postgres`    | PostgreSQL 16 | Sin tablas todavía. RLS y roles: fase 02.                                      |
| `redis`       | Redis 7       | Solo para el health check. Colas/WebSocket/rate limit en fases posteriores.    |
| `minio`       | S3            | **No existe aún.** Se introduce en la fase 09.                                 |
| `print-agent` | Node en sitio | Solo esqueleto de paquete. Se implementa en la fase 18.                        |

Detalle de configuración en `deploy/README.md`.

## Stack

| Capa             | Elección                                                     |
| ---------------- | ------------------------------------------------------------ |
| Backend          | NestJS 11 + TypeScript (CommonJS)                            |
| ORM              | Prisma 6, esquema dividido por módulo (`prismaSchemaFolder`) |
| Base de datos    | PostgreSQL 16 con Row Level Security                         |
| Frontend         | React 19 + Vite 7 + TypeScript, PWA                          |
| Datos en cliente | TanStack Query (+ Dexie desde la fase 20)                    |
| UI               | Tailwind + shadcn/ui (desde la fase 07)                      |
| Contratos        | Zod en `packages/contracts`                                  |
| Tiempo real      | Socket.IO + adaptador Redis (fase 12)                        |
| Colas            | BullMQ (fase 18)                                             |
| Pruebas          | Vitest + Supertest (+ Playwright en flujos críticos)         |
| Observabilidad   | Pino (+ OpenTelemetry en la fase 26)                         |

## Monorepo

pnpm workspaces + Turborepo. `turbo run <task>` ejecuta `build | dev | lint | typecheck | test` en cada paquete respetando dependencias (`^build`).

```
apps/api            @posbar/api          src/main.ts (API) · src/worker.ts (worker)
apps/web            @posbar/web          src/App.tsx · src/lib/api/
apps/print-agent    @posbar/print-agent  esqueleto
packages/contracts  @posbar/contracts    ESM. src/health.ts
packages/db         @posbar/db           prisma/schema/*.prisma (solo datasource en fase 01)
deploy/             Dockerfiles (api, web), nginx.conf, *.env.example
scripts/            check-doc-caps.mjs
```

Regla de dependencia: `apps/web → packages/contracts`; `apps/api → packages/contracts, packages/db`. **`apps/web` nunca importa de `apps/api`.** La API importa de contracts solo tipos (`import type`) para no acoplar el formato de módulo.

## Flujo de una petición (fase 01)

1. `pos-web` hace `fetch(VITE_API_URL + '/health')` y valida la respuesta con `healthResponseSchema` (Zod) del paquete de contratos.
2. `pos-api` recibe la petición; `nestjs-pino` genera o propaga `x-request-id` y lo adjunta a todo log de esa petición.
3. `HealthController` → `HealthService`: `SELECT 1` en PostgreSQL (`pg`) y `PING` en Redis (`ioredis`), en paralelo, con 2 s de tiempo límite.
4. Responde `200 {status:'ok'}` o `503 {status:'degraded'}` con el detalle por dependencia. El cuerpo siempre cumple el contrato.

Desde la fase 02 se intercala el resolvedor de contexto de tenant (ver `docs/MULTITENANCY.md`) y desde la fase 05 los interceptores de auditoría e idempotencia (ver `docs/API_CONVENTIONS.md`).

## Configuración

Variables de entorno tipadas en `apps/api/src/config/env.ts`; la API falla al arrancar si falta `DATABASE_URL` o `REDIS_URL`. Plantillas en `.env.example` (local) y `deploy/**/*.env.example` (Coolify).

## Lo que deliberadamente no hay

Kafka/bus de eventos, GraphQL, Kubernetes, microservicios, Elasticsearch, facturación fiscal. Son extraíbles después porque el monolito es modular.
