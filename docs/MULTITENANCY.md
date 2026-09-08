# Multi-tenancy (normativo)

<!-- tope: 150 líneas -->

> **Estado: implementado en la fase 02, sin validar contra PostgreSQL real**
> (el entorno donde se escribió no tenía Docker/Postgres disponible). Se cierra
> y congela en la fase 06 tras correr la batería de aislamiento. Ver
> «Pendiente de la fase 02» en `docs/PROJECT_STATE.md`.

Lectura obligatoria en toda fase que toque la base de datos.

## Estrategia

Base compartida, esquema compartido, columna `business_id` en toda tabla operativa. Aislamiento en tres capas independientes; ninguna sustituye a las otras.

## Las tres capas

| Capa                   | Dónde      | Qué garantiza                                                     | Estado |
| ---------------------- | ---------- | ----------------------------------------------------------------- | ------ |
| 1 · Row Level Security | PostgreSQL | Ninguna fila cruza de negocio aunque el SQL omita el filtro       | 🟡     |
| 2 · Contexto de tenant | NestJS     | `TenantContext` (AsyncLocalStorage) + `SET LOCAL` por transacción | 🟡     |
| 3 · Autorización       | Guards     | _pendiente fase 04_                                               | ⬜     |

🟡 = código escrito, sin correr contra Postgres real todavía.

## Las tres capas, en código

1. **RLS.** Migración `packages/db/prisma/migrations/20260908120000_init_tenancy/`.
   Cada tabla con `business_id` lleva `ENABLE` + `FORCE ROW LEVEL SECURITY` y una
   política `USING (business_id = current_setting('app.business_id', true)::uuid)`.
   `businesses` (raíz del tenant) se filtra por su propio `id`. Las tablas de
   plataforma (`platform_users`, `plans`) usan `current_setting('app.realm', true) = 'platform'`.
2. **Contexto.** `apps/api/src/modules/tenancy/tenant-context.ts` —
   `TenantContext` sobre `AsyncLocalStorage`, con dos formas: `{ realm: 'tenant', businessId }`
   o `{ realm: 'platform' }`. `tenant-identity.middleware.ts` lo llena desde la
   cabecera simulada `x-business-id` (hasta que exista auth real en la fase 03).
3. **Prisma.** `apps/api/src/modules/tenancy/tenant-prisma.service.ts` —
   `TenantPrismaService.withTenant(businessId, fn)` abre una transacción, fija
   `app.business_id`/`app.realm` con `set_config(..., true)` (equivalente a `SET LOCAL`,
   pero parametrizado y sin riesgo de inyección) y corre `fn` dentro de
   `TenantContext.run(...)`. Una extensión de Prisma (`$allOperations`) inyecta
   `business_id` en `create`/`createMany`/`upsert` y en el `where` de
   `findMany`/`count`/`updateMany`/`deleteMany` para los modelos con esa columna
   — capa de conveniencia y defensa adicional; el filtro que de verdad no se
   puede saltar es RLS.

## Regla estructural

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido. Prohibido el cliente Prisma crudo fuera de `apps/api/src/modules/tenancy/`. Un solo punto de escape auditado, exclusivo del reino de plataforma: `TenantPrismaService.withPlatform(reason, fn)` — nunca fija `business_id`, deja rastro en log (auditoría real en tabla: fase 05) y ningún módulo de negocio lo usa hasta que exista auth de plataforma (fase 03/04).

## Cómo agregar una tabla nueva

1. Modelo Prisma con `businessId String @map("business_id") @db.Uuid` y relación a `Business`.
2. En la migración: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` + `FORCE ROW LEVEL SECURITY;` +
   `CREATE POLICY tenant_isolation ON ... USING (business_id = NULLIF(current_setting('app.business_id', true), '')::uuid) WITH CHECK (...)`.
3. Si el modelo se consulta con el Prisma extendido, añadir su nombre (primera letra en minúscula) a `TENANT_SCOPED_MODELS` en `tenant-prisma.service.ts`.
4. La prueba de catálogo (`apps/api/test/rls-catalog.integration.spec.ts`) falla automáticamente si la tabla queda sin RLS.

## Roles de PostgreSQL

- `posbar` (o el usuario que corre `prisma migrate`): dueño de las tablas. Único con permiso para crear/alterar políticas o desactivar RLS. Usa `DATABASE_URL`.
- `posbar_app`: `NOSUPERUSER NOBYPASSRLS`, sin ser dueño de nada; solo `SELECT/INSERT/UPDATE/DELETE`. Es el único rol con el que corre `TenantPrismaService` en runtime. Usa `DATABASE_APP_URL`. Creado por la propia migración `init_tenancy` con contraseña de desarrollo (`posbar_app_dev`); en despliegue real hay que rotarla (`ALTER ROLE ... PASSWORD ...`), pendiente de `deploy/README.md`.

## Batería de aislamiento

`pnpm test:isolation` — real desde la fase 06; hoy sigue siendo un marcador que devuelve éxito. Las pruebas de aislamiento propias de esta fase viven en `apps/api/test/tenant-isolation.integration.spec.ts`, `rls-role.integration.spec.ts` y `rls-catalog.integration.spec.ts`: corren con `pnpm --filter @posbar/api test` y se omiten automáticamente si faltan `DATABASE_URL`/`DATABASE_APP_URL` (igual que el health check de la fase 01).
