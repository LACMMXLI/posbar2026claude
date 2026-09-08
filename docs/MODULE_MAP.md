# Mapa de módulos

<!-- tope: 120 líneas -->

Solo módulos que **existen**. Se actualiza al terminar cada fase. El mapa completo previsto está en `DEVELOPMENT_PLAN.md` §6.

| Módulo        | `apps/api/src/`                      | `apps/web/src/`                | Fase | Depende de | Congelado |
| ------------- | ------------------------------------ | ------------------------------ | ---- | ---------- | --------- |
| health        | `health/`                            | `App.tsx`, `lib/api/health.ts` | 01   | —          | no        |
| config        | `config/`                            | —                              | 01   | —          | no        |
| common/logger | `common/logger.ts`                   | —                              | 01   | —          | no        |
| tenancy       | `modules/tenancy/`                   | —                              | 02   | —          | desde 06  |
| businesses    | `modules/businesses/`                | —                              | 02   | tenancy    | no        |
| branches      | `modules/branches/`                  | —                              | 02   | tenancy    | no        |
| platform      | `modules/platform/` (solo entidades) | —                              | 02   | tenancy    | no        |

Paquetes compartidos:

| Paquete              | Contenido actual                                                             | Fase  |
| -------------------- | ---------------------------------------------------------------------------- | ----- |
| `packages/contracts` | `health.ts`, `tenancy.ts` (business/branch)                                  | 01–02 |
| `packages/db`        | `prisma/schema/{schema,tenancy}.prisma`, migración `init_tenancy`, `seed.ts` | 01–02 |
| `apps/print-agent`   | esqueleto sin lógica                                                         | 01    |
