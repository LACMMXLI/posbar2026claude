# ADR-001 — Monorepo pnpm/Turborepo y servicios separados en Coolify

**Estado:** aceptado · **Fase:** 01 · **Fecha:** 2026-09-05

## Contexto

El sistema se construye en 26 fases ejecutadas por agentes con contexto limitado. Hace falta que una fase toque pocas carpetas y que API y web compartan contratos sin leerse mutuamente. A la vez, cada pieza desplegada debe poder reiniciarse y escalarse por separado.

## Opciones

1. Repos separados por aplicación → contratos duplicados o publicados en un registro; fricción alta.
2. Monorepo con un solo servicio desplegado (API sirviendo la web) → despliegue acoplado, reinicio de la API tumba la web.
3. **Monorepo pnpm + Turborepo, un servicio de Coolify por pieza** (api, worker, web, postgres, redis).

## Decisión

Opción 3. `packages/contracts` (Zod, ESM) es la frontera: `apps/web` importa de él en tiempo de ejecución; `apps/api` (CommonJS) importa **solo tipos** para no depender del formato de módulo. `pos-api` y `pos-worker` comparten imagen (`deploy/api/Dockerfile`) y difieren en el comando. `pos-web` es Nginx con estáticos.

## Consecuencias

- Una fase equivale a una o dos carpetas; la lista blanca de cada encargo es una ruta.
- Reiniciar la API no interrumpe la web (validación de la fase 01).
- Los Dockerfiles se construyen con contexto en la raíz del repo; Coolify debe configurarse así.
- Cuando un módulo de la API necesite un esquema Zod en ejecución (validación de entrada, fase 05), se decidirá entre `require(esm)` (Node ≥ 22.12) o emitir contracts en doble formato; queda anotado como deuda en `docs/PROJECT_STATE.md`.
