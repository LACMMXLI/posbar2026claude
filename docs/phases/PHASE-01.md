# FASE 01 — Andamiaje del monorepo y despliegue en Coolify

> Bloque A — Fundamentos de plataforma. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Dejar un esqueleto vacío pero desplegado y funcionando de extremo a extremo, para que ninguna fase posterior descubra problemas de infraestructura.

## 2. Dependencias previas

**Requiere:** Nada
**Desbloquea:** Fase 02

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- Sección 1 y 6 de `DEVELOPMENT_PLAN.md` (arquitectura tecnológica y mapa de módulos) — este es el único encargo que aún debe leer el plan maestro, porque los documentos que lo reemplazan (sección 9) no existen todavía.

## 4. Qué debe construirse

- Monorepo pnpm + Turborepo con `apps/api`, `apps/web`, `packages/contracts`, `packages/db`.
- NestJS con un único endpoint `/health` que verifica PostgreSQL y Redis.
- React + Vite que consume ese endpoint y muestra el estado.
- Dockerfiles multi-etapa por aplicación y plantillas `.env.example`.
- ESLint, Prettier, TypeScript estricto, Vitest, hooks de pre-commit.
- Pipeline de CI: lint, tipos, pruebas, build.
- Logs estructurados con Pino y `requestId`.

## 5. Lista blanca — archivos y módulos que puede modificar

Raíz del repositorio, `deploy/`, esqueletos de `apps/api`, `apps/web`, `apps/print-agent`, `packages/contracts`, `packages/db`, y `docs/` con los archivos de la sección 9 del plan maestro creados con su plantilla (vacíos, con su tope de líneas en el encabezado).

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Nada de autenticación, modelo de datos, tablas de negocio, MinIO, WebSocket ni interfaz real. Si esta fase toma más de un día, se está construyendo de más.

## 7. Decisiones de arquitectura que debe respetar

Stack fijado: NestJS 11 + TypeScript, Prisma, PostgreSQL 16, React 19 + Vite, Tailwind + shadcn/ui, Zod en `packages/contracts`, Socket.IO (no aún activo), BullMQ, Vitest + Supertest + Playwright, Pino + OpenTelemetry. No se introducen Kafka, GraphQL, Kubernetes, microservicios, Elasticsearch ni motor de facturación fiscal.

## 8. Criterios de finalización — debe quedar funcionando

- Cinco servicios corriendo en Coolify: api, worker, web, postgres, redis.
- La web muestra en producción el estado de salud real de la API.
- `pnpm dev` levanta todo el entorno local con Docker Compose.

## 9. Pruebas y validaciones requeridas

- Visitar la URL pública y ver los tres servicios en verde.
- Reiniciar únicamente el servicio de la API en Coolify y comprobar que la web sigue sirviéndose.
- CI en verde sobre una rama nueva.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-01): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
