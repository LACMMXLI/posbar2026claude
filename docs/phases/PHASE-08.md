# FASE 08 — Administración del negocio

> Bloque B — Aplicación base. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Que el propietario de un negocio pueda dar de alta sus sucursales, su equipo y sus roles sin intervención técnica.

## 2. Dependencias previas

**Requiere:** Fase 04, Fase 07
**Desbloquea:** Fase 09, Fase 12, Fase 13, Fase 25

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `packages/contracts/permissions.ts`

## 4. Qué debe construirse

- Configuración del negocio: nombre, logotipo, moneda, zona horaria, formato fiscal, hora de corte del día operativo.
- CRUD de sucursales con dirección, teléfono, zona horaria propia y horario.
- Gestión de usuarios: alta, edición, desactivación, asignación de rol, asignación de sucursales, restablecimiento de PIN.
- Invitaciones por correo con token de un solo uso, y flujo de recuperación de contraseña.
- Editor de roles personalizados con el catálogo de permisos agrupado por módulo.
- Asistente de creación de negocio: al crearse, se genera automáticamente una sucursal principal y el rol de propietario.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/web/src/features/settings/`, `apps/api/src/modules/businesses/`, `branches/`, `iam/`; servicio de correo transaccional en `common/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Catálogo, mesas, impresoras ni configuración de módulos operativos. Cada módulo traerá su propia configuración en su fase.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. Los módulos `tenancy`, `iam` y `audit` están **congelados desde la fase 06**: se usan leyendo `docs/MULTITENANCY.md`, nunca se modifican sin un ADR nuevo. `iam/` se **usa** (endpoint `@RequirePermission`, editor de roles sobre el catálogo existente), no se modifica su mecanismo interno.

## 8. Criterios de finalización — debe quedar funcionando

- Un negocio nuevo se configura por completo desde la interfaz, con sus sucursales y su equipo.
- Un usuario invitado recibe el correo, define su contraseña y entra con el rol correcto.
- El administrador del negocio A no ve indicio alguno de que exista el negocio B.

## 9. Pruebas y validaciones requeridas

- Prueba Playwright: crear sucursal, invitar mesero, aceptar invitación, iniciar sesión con permisos limitados.
- La batería de aislamiento de la fase 06 cubre los nuevos endpoints y pasa.
- Auditoría: toda alta y baja de usuario aparece en `audit_log`.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-08): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
