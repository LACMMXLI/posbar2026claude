# Estado del proyecto

<!-- tope: 150 líneas -->

Segundo archivo que lee todo agente (después de `CLAUDE.md`). Se actualiza al iniciar y al terminar cada fase. Los encargos están en `docs/phases/`.

## Fases

| Fase  | Estado         | Módulos entregados                                  | Notas y deuda                                                                                            |
| ----- | -------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 01    | 🟡 local lista | infra, health, contracts/health, db (esqueleto)     | `pnpm verify` en verde. Falta despliegue en Coolify y validación pública. Ver «Pendiente de la fase 01». |
| 02    | ⬜ pendiente   | tenancy, businesses, branches, platform (entidades) | Bloqueada por 01                                                                                         |
| 03    | ⬜ pendiente   | auth                                                | Bloqueada por 02                                                                                         |
| 04    | ⬜ pendiente   | iam                                                 | Bloqueada por 03                                                                                         |
| 05    | ⬜ pendiente   | audit, common                                       | Bloqueada por 04                                                                                         |
| 06    | ⬜ pendiente   | pruebas de aislamiento · **puerta**                 | Bloqueada por 05                                                                                         |
| 07–26 | ⬜ pendiente   | ver `docs/phases/`                                  | —                                                                                                        |

## Pendiente de la fase 01 (requiere acción humana)

- Crear los cinco servicios en Coolify siguiendo `deploy/README.md` y confirmar `/health` en verde desde la URL pública.
- Reiniciar solo `pos-api` y comprobar que `pos-web` sigue sirviéndose.
- Subir el repositorio a GitHub para que corra el CI (`.github/workflows/ci.yml`).
- Instalar Docker en el equipo de desarrollo si se quiere usar `pnpm dev` completo.

## Decisiones vigentes

- [ADR-001](decisions/ADR-001-monorepo-y-servicios-coolify.md) — monorepo pnpm/Turborepo y un servicio de Coolify por pieza.

## Deuda técnica aceptada

- `packages/contracts` se emite solo en ESM; la API lo consume solo como tipos. Cuando la API necesite Zod en ejecución (fase 05) se decidirá `require(esm)` vs. doble formato (ADR-001).
- `pnpm test:isolation` es un marcador que devuelve éxito; se implementa en la fase 06.
- El worker no registra colas; solo demuestra arranque y conectividad a Redis (BullMQ en la fase 18).
- Sin OpenTelemetry todavía; solo Pino (fase 26).

## Trampas conocidas

- Los Dockerfiles asumen **contexto de build en la raíz del repo** (`docker build -f deploy/api/Dockerfile .`). Configurar Coolify igual.
- `VITE_API_URL` es una variable **de compilación**: cambiarla exige reconstruir `pos-web`.
- Vitest necesita `unplugin-swc` en la API para que la inyección por constructor de NestJS funcione (esbuild no emite metadatos de decoradores).
- La prueba de integración de `/health` se omite si faltan `DATABASE_URL`/`REDIS_URL`; en CI siempre corre.
