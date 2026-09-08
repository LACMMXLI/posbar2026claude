# ADR-002 — Convención de aislamiento de tenant y `require(esm)` en `apps/api`

**Estado:** aceptado · **Fase:** 02 · **Fecha:** 2026-09-08

## Contexto

La fase 02 introduce el primer acceso real a PostgreSQL y las primeras dependencias en tiempo de ejecución entre `apps/api` (CommonJS) y los paquetes ESM `packages/db`/`packages/contracts`. ADR-001 ya había señalado esta tensión y la había diferido a la fase 05.

## Decisión 1 — Convención GUC para RLS

Cada tabla con `business_id` usa una política `USING/WITH CHECK (business_id = current_setting('app.business_id', true)::uuid)`; `businesses` (raíz del tenant) se filtra por su propio `id`; las tablas de plataforma usan `current_setting('app.realm', true) = 'platform'`. `TenantPrismaService` fija ambos GUC con `set_config(..., true)` (parametrizado, sin interpolar SQL) dentro de una transacción — equivalente a `SET LOCAL` pero sin riesgo de inyección. Toda fase posterior que agregue una tabla con `business_id` repite este patrón; no se discute de nuevo (regla 4 de `CLAUDE.md`).

## Decisión 2 — Escape de plataforma como método, no como rol adicional

En vez de una segunda cadena de conexión con `BYPASSRLS`, el reino de plataforma se resuelve fijando `app.realm = 'platform'` en la misma conexión `posbar_app` (que nunca tiene `BYPASSRLS`). El único llamador posible es `TenantPrismaService.withPlatform()`. Esto evita un tercer rol de PostgreSQL y mantiene un solo punto de auditoría en código.

## Decisión 3 — `apps/api` sí puede `require()` los paquetes ESM

Al construir `TenantPrismaService` se descubrió que `apps/api` (CommonJS) necesita **valores** en tiempo de ejecución de `@posbar/db` (`PrismaClient`) y `@posbar/contracts` (esquemas Zod para validar cuerpos de petición), no solo tipos. Con el `exports` map original (`{"types", "import"}`) Node fallaba en el arranque real con `ERR_PACKAGE_PATH_NOT_EXPORTED` — no llegaba siquiera a la interoperabilidad ESM/CJS, el resolutor de `require` no encontraba una condición válida.

**Opciones:**

1. Mantener solo tipos desde `apps/api` y validar con Zod en un paquete aparte (retrasa la fase).
2. Emitir ambos paquetes en doble formato (CJS+ESM) — más robusto, más build.
3. **Agregar la condición `"require"` al `exports` de ambos paquetes, apuntando al mismo `dist/index.js` ESM**, apoyándose en `require(esm)` (estable desde Node 22.12).

Se eligió la opción 3 por ser el cambio mínimo y porque el motor del proyecto ya exige Node ≥ 22. Se verificó en este entorno (Node 25.8.0): `node -e "require('./dist/main.js')"` arranca la API completa (incluye `TenancyModule`, `BusinessesModule`, `BranchesModule`) sin error de resolución.

## Consecuencias

- `packages/db/package.json` y `packages/contracts/package.json` ganan `"require": "./dist/index.js"` en su `exports`.
- Deuda que sigue abierta (heredada de ADR-001): si algún entorno de despliegue corre Node 22.0–22.11 sin `require(esm)` estable, esto falla en el arranque. Si aparece, la opción 2 (doble formato) queda como plan B — anotado aquí para no rediscutirlo desde cero.
- No se reabre ADR-001; esta decisión resuelve el punto que dejó pendiente, no lo contradice.
