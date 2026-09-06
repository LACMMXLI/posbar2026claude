# Convenciones de la API

<!-- tope: 150 líneas -->

> **Estado: plantilla de la fase 01.** Las convenciones completas (envoltura de errores, paginación por cursor, versionado, idempotencia, códigos tipados) se fijan en la fase 05. Se modifica solo con un ADR.

## Vigente desde la fase 01

- **Contratos primero.** Toda respuesta tiene un esquema Zod en `packages/contracts`; el frontend valida contra él. Ejemplo: `healthResponseSchema` → `GET /health`.
- **`x-request-id`.** Si el cliente lo envía, se respeta; si no, la API lo genera. Siempre se devuelve en la respuesta y aparece en todos los logs de la petición.
- **Health check.** `GET /health` → `200` si todo está arriba, `503` si alguna dependencia falla. El cuerpo siempre detalla cada dependencia.
- **Sin estado en el proceso.** La API no guarda nada en memoria entre peticiones; todo lo que deba persistir vive en PostgreSQL o Redis.

## Pendiente (fase 05)

Envoltura de errores · paginación por cursor · versionado · cabecera de idempotencia obligatoria en mutaciones · UUIDv7 generado en cliente · OpenAPI generado desde contratos.
