# FASE 03 — Identidad y autenticación

> Bloque A — Fundamentos de plataforma. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Que un usuario real pueda iniciar sesión y que cada petición lleve un contexto de negocio verificable, sin todavía decidir qué puede hacer.

## 2. Dependencias previas

**Requiere:** Fase 02
**Desbloquea:** Fase 04, Fase 05, Fase 07

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartado tenancy/businesses/branches)

## 4. Qué debe construirse

- Tabla `users` con unicidad de correo **por negocio**, y `user_branches` con bandera `all_branches`.
- Contraseñas con Argon2id; PIN numérico corto e independiente para acceso rápido en tableta.
- JWT de acceso corto + token de refresco rotatorio persistido, con revocación por dispositivo.
- Reclamaciones del token: `userId`, `businessId`, `branchId` activo, `roleId`, versión de permisos.
- Reino de plataforma separado: tabla, ruta de inicio de sesión y tipo de token distintos, con segundo factor obligatorio.
- Rate limiting de intentos de acceso apoyado en Redis.
- Endpoint de cambio de sucursal activa que reemite el token.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/auth/`, ampliación de `tenancy/` para leer del token en lugar de la cabecera simulada, `packages/db`, `packages/contracts/auth`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Roles y permisos, invitaciones por correo, recuperación de contraseña, y cualquier pantalla. El inicio de sesión se prueba por API.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. Los dos reinos de identidad (plataforma vs negocio) fijados en la fase 02 se implementan aquí sin fusionarse: tablas, tokens y rutas de login distintos.

## 8. Criterios de finalización — debe quedar funcionando

- Inicio de sesión con correo y contraseña, y con PIN, devolviendo tokens válidos.
- El contexto de tenant se deriva exclusivamente del token; la cabecera simulada queda eliminada.
- Cambio de sucursal activa y cierre de sesión por dispositivo.

## 9. Pruebas y validaciones requeridas

- Un token del negocio A no abre ningún recurso del negocio B.
- Manipular el `businessId` del token invalida la firma.
- Un token de plataforma es rechazado en rutas de negocio y viceversa.
- Cambiar a una sucursal no autorizada devuelve 403.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-03): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
