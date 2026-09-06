# FASE 04 — Roles, permisos y alcance por sucursal

> Bloque A — Fundamentos de plataforma. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Convertir la autorización en un mecanismo declarativo que toda fase posterior use sin volver a pensarlo.

## 2. Dependencias previas

**Requiere:** Fase 02, Fase 03
**Desbloquea:** Fase 05, Fase 07, Fase 08, Fase 15

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartado auth)

## 4. Qué debe construirse

- Catálogo completo de permisos en `packages/contracts/permissions.ts`, cada uno con su alcance (negocio o sucursal).
- Tablas `roles` (por negocio) y `user_permission_grants` para concesiones y revocaciones puntuales.
- Semilla de los seis roles de sistema al crear un negocio: propietario, gerente, encargado, cajero, mesero, empleado.
- Decorador `@RequirePermission()` y guard que resuelve permiso + pertenencia + alcance de sucursal.
- Mecanismo de **elevación por PIN de supervisor**: token efímero que autoriza una acción concreta y registra quién autorizó.
- Endpoint `/me/permissions` que el frontend usa para pintar la interfaz.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/iam/`, `packages/contracts/permissions.ts`, `packages/db`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

La interfaz de administración de usuarios (fase 08) y los permisos de módulos que aún no existen: se declaran las constantes, no se implementan sus endpoints.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. Los permisos son datos (filas), nunca un `enum` en código. `iam` queda **congelado a partir de la fase 06**: toda fase posterior consume `@RequirePermission()` y el catálogo de `packages/contracts/permissions.ts`, sin modificar el módulo.

## 8. Criterios de finalización — debe quedar funcionando

- Un endpoint protegido responde según el rol del usuario y sus sucursales.
- CRUD de roles personalizados dentro de un negocio.
- Flujo de elevación por PIN operativo de extremo a extremo por API.

## 9. Pruebas y validaciones requeridas

- Matriz de pruebas rol × endpoint que cubre los seis roles sembrados.
- Un mesero con acceso solo a la sucursal 1 recibe 404 sobre recursos de la sucursal 2 del mismo negocio.
- Una revocación puntual gana sobre el permiso del rol.
- El token de elevación caduca y no es reutilizable.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-04): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
