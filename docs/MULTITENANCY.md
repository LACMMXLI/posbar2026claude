# Multi-tenancy (normativo)

<!-- tope: 150 líneas -->

> **Estado: plantilla de la fase 01.** El contenido normativo se escribe en la fase 02 (implementación) y se cierra en la fase 06 (batería de aislamiento y congelación). Hasta entonces, la referencia es `DEVELOPMENT_PLAN.md` §2.

Lectura obligatoria en toda fase que toque la base de datos.

## Estrategia

Base compartida, esquema compartido, columna `business_id` en toda tabla operativa. Aislamiento en tres capas independientes; ninguna sustituye a las otras.

## Las tres capas

| Capa                   | Dónde      | Qué garantiza       | Estado |
| ---------------------- | ---------- | ------------------- | ------ |
| 1 · Row Level Security | PostgreSQL | _pendiente fase 02_ | ⬜     |
| 2 · Contexto de tenant | NestJS     | _pendiente fase 02_ | ⬜     |
| 3 · Autorización       | Guards     | _pendiente fase 04_ | ⬜     |

## Regla estructural

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido. Prohibido el cliente Prisma crudo fuera de `apps/api/src/modules/tenancy/`. Un solo punto de escape auditado, exclusivo del reino de plataforma.

## Cómo agregar una tabla nueva

_Se documenta en la fase 02 junto con la convención de migración que aplica RLS automáticamente._

## Batería de aislamiento

`pnpm test:isolation` — real desde la fase 06. Hoy es un marcador que devuelve éxito.
