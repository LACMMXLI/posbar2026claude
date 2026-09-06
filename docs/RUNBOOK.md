# Runbook de operación

<!-- tope: 200 líneas -->

Se completa en la fase 26; se va llenando desde la 01 con lo que ya se puede operar.

## Desplegar (fase 01)

Ver `deploy/README.md`. Coolify construye desde el repositorio con los Dockerfiles de `deploy/`. Orden: postgres, redis, pos-api, pos-worker, pos-web.

## Verificar salud

- `GET https://api.<dominio>/health` → `200 {status:'ok'}`. Un `503` indica qué dependencia falla en `checks.*.error`.
- `https://pos.<dominio>` muestra api, postgres y redis; se refresca cada 10 s.
- Logs: JSON por línea (Pino). Filtrar por `requestId` para seguir una petición; el valor coincide con la cabecera `x-request-id` que recibe el cliente.

## Revertir

En Coolify, redesplegar el commit anterior del servicio afectado. `pos-web` es estático: revertirlo no afecta a la API ni a los datos.

## Local

```
cp .env.example .env
pnpm install
pnpm dev                 # postgres+redis en Docker + apps en watch
```

Sin Docker: levantar PostgreSQL 16 y Redis 7 por otro medio y ajustar `DATABASE_URL` / `REDIS_URL`.

## Pendiente

Respaldos y restauración, alertas, migraciones sin tiempo fuera, diagnóstico a las dos de la mañana → fase 26.
