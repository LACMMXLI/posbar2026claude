# Mapa de módulos

<!-- tope: 120 líneas -->

Solo módulos que **existen**. Se actualiza al terminar cada fase. El mapa completo previsto está en `DEVELOPMENT_PLAN.md` §6.

| Módulo        | `apps/api/src/`    | `apps/web/src/`                | Fase | Depende de | Congelado |
| ------------- | ------------------ | ------------------------------ | ---- | ---------- | --------- |
| health        | `health/`          | `App.tsx`, `lib/api/health.ts` | 01   | —          | no        |
| config        | `config/`          | —                              | 01   | —          | no        |
| common/logger | `common/logger.ts` | —                              | 01   | —          | no        |

Paquetes compartidos:

| Paquete              | Contenido actual                                | Fase |
| -------------------- | ----------------------------------------------- | ---- |
| `packages/contracts` | `health.ts` (esquema de `GET /health`)          | 01   |
| `packages/db`        | `prisma/schema/schema.prisma` (solo datasource) | 01   |
| `apps/print-agent`   | esqueleto sin lógica                            | 01   |
