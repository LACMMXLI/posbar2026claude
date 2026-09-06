# FASE 02 — Núcleo multi-tenant y aislamiento en base de datos

> Bloque A — Fundamentos de plataforma. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Establecer la frontera del tenant como una propiedad de la base de datos, antes de que exista cualquier dato operativo que pueda filtrarse.

## 2. Dependencias previas

**Requiere:** Fase 01
**Desbloquea:** Fase 03, Fase 06, Fase 25

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `CLAUDE.md`
- `docs/PROJECT_STATE.md`
- `docs/ARCHITECTURE.md` (estructura del monorepo y flujo de una petición)

## 4. Qué debe construirse

- Tablas `businesses`, `branches`, `business_settings` y el esqueleto de `platform_users`, `plans`, `subscriptions`.
- Dos roles de PostgreSQL: uno dueño para migraciones, uno de aplicación **sin** `BYPASSRLS`.
- Políticas RLS y una convención de migración que las aplica automáticamente a toda tabla nueva con `business_id`.
- `TenantContext` sobre `AsyncLocalStorage` y `TenantPrismaService` que abre transacciones con `SET LOCAL`.
- Extensión del cliente Prisma que inyecta `business_id` en creaciones y filtros.
- Un único punto de escape auditado para el reino de plataforma.
- Semillas: dos negocios ficticios con dos sucursales cada uno.

## 5. Lista blanca — archivos y módulos que puede modificar

`packages/db/prisma/`, `apps/api/src/modules/tenancy/`, `businesses/`, `branches/`, `platform/` (solo entidades).

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Usuarios reales, inicio de sesión, roles, permisos, interfaz, y ningún módulo operativo.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. Esta fase es la que **crea** esa regla; a partir de aquí toda fase posterior la hereda sin discutirla. Esta fase define además la separación de dos reinos de identidad (`platform_users` vs `users`), que ninguna fase posterior puede fusionar.

## 8. Criterios de finalización — debe quedar funcionando

- Consultas contra el negocio A que no devuelven jamás filas del negocio B, aun omitiendo el filtro a propósito.
- Endpoints internos de lectura y escritura de negocios y sucursales, usando por ahora una cabecera de identidad simulada.
- Migraciones reproducibles desde cero.

## 9. Pruebas y validaciones requeridas

- Prueba de integración que ejecuta `findMany` sin filtro bajo el contexto de A y afirma cero filas de B.
- Prueba que confirma que el rol de aplicación recibe error al intentar `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`.
- Prueba que recorre el catálogo de tablas y falla si alguna tabla operativa carece de RLS.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-02): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
