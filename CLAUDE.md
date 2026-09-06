# POS Bar — guía para agentes

<!-- tope: 100 líneas -->

POS SaaS multi-tenant para bares. Monolito modular (NestJS) + PWA (React) + PostgreSQL 16 con RLS, desplegado en Coolify. Se construye en 26 fases; cada conversación ejecuta **una sola fase**.

## Cómo empezar cualquier tarea

1. Lee `docs/PROJECT_STATE.md` (qué existe, qué falta, trampas conocidas).
2. Lee el encargo `docs/phases/PHASE-NN.md` de la fase que te pidan y solo los archivos de su «lectura obligatoria».
3. Respeta su lista blanca de archivos. Si necesitas salirte de ella, detente y explica por qué antes de hacerlo.
4. Al terminar, ejecuta el ritual de cierre del encargo (sección 10 del PHASE-NN.md).

## Cinco reglas innegociables

1. **Aislamiento de tenant en tres capas.** RLS en PostgreSQL + `TenantContext` + guards. Ninguna consulta operativa fuera de una transacción con contexto de tenant. Prohibido el cliente Prisma crudo fuera de `tenancy/`. Detalle normativo: `docs/MULTITENANCY.md`.
2. **Dos reinos de identidad.** `platform_users` (SUPERADMIN) y `users` (negocio) nunca se fusionan; tokens y rutas de login distintos.
3. **Toda mutación es un comando idempotente con ID UUIDv7 generado en cliente**, expresado como delta. Ver `docs/API_CONVENTIONS.md` y `docs/OFFLINE.md`.
4. **Núcleo congelado desde la fase 06:** `tenancy`, `iam`, `audit`. Se usan, no se modifican, salvo ADR nuevo en `docs/decisions/`.
5. **El frontend solo lee `packages/contracts`,** nunca `apps/api`. Los contratos son la única fuente de verdad de la API.

## Qué leer según lo que vayas a hacer

| Vas a…                                       | Lee                                                        |
| -------------------------------------------- | ---------------------------------------------------------- |
| Entender el stack o el flujo de una petición | `docs/ARCHITECTURE.md`                                     |
| Tocar la base de datos                       | `docs/MULTITENANCY.md`, `docs/DATA_MODEL.md` (tu apartado) |
| Añadir un endpoint                           | `docs/API_CONVENTIONS.md`, `packages/contracts`            |
| Saber qué permisos existen                   | `docs/PERMISSIONS.md` (generado)                           |
| Ubicar un módulo                             | `docs/MODULE_MAP.md`                                       |
| Desplegar, revertir, diagnosticar            | `docs/RUNBOOK.md`, `deploy/README.md`                      |
| Entender una decisión pasada                 | `docs/decisions/`                                          |

## Estructura

```
apps/api            NestJS. Un módulo por dominio en src/modules/ (fase 02+)
apps/web            React + Vite. Una carpeta por dominio en src/features/ (fase 07+)
apps/print-agent    Agente de impresión en sitio (fase 18)
packages/contracts  Esquemas Zod, tipos, permisos. Frontera entre apps
packages/db         Esquema Prisma por módulo, migraciones, semillas
deploy/             Dockerfiles y plantillas .env por servicio
docs/               Documentación mínima con tope de líneas (CI la verifica)
```

## Comandos

```
pnpm install            instala todo el monorepo
pnpm dev                levanta postgres+redis (Docker) y todas las apps en modo watch
pnpm verify             lint + tipos + pruebas + build (obligatorio antes de cerrar una fase)
pnpm test:isolation     batería de aislamiento multi-tenant (real desde la fase 06)
pnpm --filter @posbar/api dev      solo la API      → http://localhost:3000/health
pnpm --filter @posbar/web dev      solo la web      → http://localhost:5173
node scripts/check-doc-caps.mjs    verifica topes de líneas de la documentación
```

Node ≥ 22, pnpm 10. Variables: copia `.env.example` a `.env`.

## Convenciones

- TypeScript estricto, ESLint + Prettier (pre-commit con husky/lint-staged).
- Pruebas con Vitest; integración contra PostgreSQL/Redis reales; Playwright solo para flujos críticos.
- Logs estructurados con Pino: `requestId` en toda línea; `businessId` desde la fase 02.
- Un commit por fase: `feat(phase-NN): ...`.
- Nunca copies código en la documentación: enlaza la ruta. Nada generable se escribe a mano.
