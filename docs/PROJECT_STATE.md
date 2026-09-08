# Estado del proyecto

<!-- tope: 150 líneas -->

Segundo archivo que lee todo agente (después de `CLAUDE.md`). Se actualiza al iniciar y al terminar cada fase. Los encargos están en `docs/phases/`.

## Fases

| Fase  | Estado                                  | Módulos entregados                                  | Notas y deuda                                                                                                                                                                                  |
| ----- | --------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01    | 🟡 local lista                          | infra, health, contracts/health, db (esqueleto)     | `pnpm verify` en verde. Repo subido a GitHub. Falta despliegue en Coolify y validación pública. Ver «Pendiente de la fase 01».                                                                 |
| 02    | 🟡 código listo, verificación pendiente | tenancy, businesses, branches, platform (entidades) | `pnpm verify` en verde (sin PostgreSQL en este entorno: 4 pruebas de integración quedan `skipped`, ver «Pendiente de la fase 02»). No se marca terminada hasta correrlas contra Postgres real. |
| 03    | ⬜ pendiente                            | auth                                                | Bloqueada por 02                                                                                                                                                                               |
| 04    | ⬜ pendiente                            | iam                                                 | Bloqueada por 03                                                                                                                                                                               |
| 05    | ⬜ pendiente                            | audit, common                                       | Bloqueada por 04                                                                                                                                                                               |
| 06    | ⬜ pendiente                            | pruebas de aislamiento · **puerta**                 | Bloqueada por 05                                                                                                                                                                               |
| 07–26 | ⬜ pendiente                            | ver `docs/phases/`                                  | —                                                                                                                                                                                              |

## Pendiente de la fase 01 (requiere acción humana)

- Crear los cinco servicios en Coolify siguiendo `deploy/README.md` y confirmar `/health` en verde desde la URL pública.
- Reiniciar solo `pos-api` y comprobar que `pos-web` sigue sirviéndose.
- Instalar Docker en el equipo de desarrollo si se quiere usar `pnpm dev` completo.

## Pendiente de la fase 02 (requiere PostgreSQL real)

Este entorno de desarrollo no tenía Docker/Postgres disponibles; todo el código de la fase 02 se escribió y se verificó (tipos, lint, build, arranque real de la API con `require(esm)`) pero **no** se corrió contra una base de datos. Antes de marcar la fase terminada, con `pnpm dev` levantado:

- Aplicar la migración `packages/db/prisma/migrations/20260908120000_init_tenancy/` (fue escrita a mano; validar con `prisma migrate diff` o correr `prisma migrate dev` y comparar).
- Correr `pnpm --filter @posbar/db prisma:seed` y confirmar los dos negocios de semilla.
- Correr `pnpm --filter @posbar/api test` con `DATABASE_URL`/`DATABASE_APP_URL` presentes: deben pasar `tenant-isolation.integration.spec.ts`, `rls-role.integration.spec.ts` y `rls-catalog.integration.spec.ts` (hoy quedan `skipped`).
- Rotar la contraseña de desarrollo del rol `posbar_app` (`posbar_app_dev`, fijada en la migración) antes de cualquier despliegue real.

## Decisiones vigentes

- [ADR-001](decisions/ADR-001-monorepo-y-servicios-coolify.md) — monorepo pnpm/Turborepo y un servicio de Coolify por pieza.
- [ADR-002](decisions/ADR-002-tenancy-rls-y-runtime-esm.md) — convención GUC de RLS, escape de plataforma como método único, y `require(esm)` para que `apps/api` consuma `@posbar/db`/`@posbar/contracts` en runtime.

## Deuda técnica aceptada

- Migración `init_tenancy` escrita a mano (sin Postgres para generarla con `prisma migrate dev`); pendiente de validar — ver «Pendiente de la fase 02».
- IDs con `gen_random_uuid()` en base de datos, no UUIDv7 en cliente: el sobre de comando idempotente completo (regla 3 de `CLAUDE.md`) llega con `packages/contracts`/interceptores en la fase 05, como ya prevenía `docs/API_CONVENTIONS.md`.
- La extensión de Prisma que inyecta `business_id` (capa de conveniencia, no la barrera real) solo cubre `create`/`createMany`/`upsert`/`findMany`/`count`/`updateMany`/`deleteMany`; `findUnique`/`update`/`delete` dependen enteramente de RLS.
- `pnpm test:isolation` sigue siendo un marcador que devuelve éxito; se implementa en la fase 06.
- El worker no registra colas; solo demuestra arranque y conectividad a Redis (BullMQ en la fase 18).
- Sin OpenTelemetry todavía; solo Pino (fase 26).

## Trampas conocidas

- Los Dockerfiles asumen **contexto de build en la raíz del repo** (`docker build -f deploy/api/Dockerfile .`). Configurar Coolify igual.
- `VITE_API_URL` es una variable **de compilación**: cambiarla exige reconstruir `pos-web`.
- Vitest necesita `unplugin-swc` en la API para que la inyección por constructor de NestJS funcione (esbuild no emite metadatos de decoradores).
- La prueba de integración de `/health` se omite si faltan `DATABASE_URL`/`REDIS_URL`; en CI siempre corre. Las tres pruebas de aislamiento de la fase 02 siguen el mismo patrón con `DATABASE_URL`/`DATABASE_APP_URL`.
- `packages/db` y `packages/contracts` son ESM (`"type": "module"`) pero `apps/api` es CommonJS: sin la condición `"require"` en su `exports` (ver ADR-002), la API compila y tipa en verde pero **falla al arrancar de verdad** con `ERR_PACKAGE_PATH_NOT_EXPORTED`. Si se agrega un paquete ESM nuevo consumido por la API, repetir esa condición o el arranque se rompe en silencio hasta ejecutarlo.
- `DATABASE_APP_URL` (rol `posbar_app`, sin `BYPASSRLS`) es obligatoria desde la fase 02: si la API llega a conectarse con `DATABASE_URL` (el rol dueño/superusuario) en vez de `DATABASE_APP_URL`, RLS queda completamente bypaseado sin ningún error visible.
