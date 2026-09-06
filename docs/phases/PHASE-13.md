# FASE 13 — Turnos y sesiones de caja

> Bloque D — Operación del punto de venta. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Establecer el contenedor temporal al que pertenecerá cada venta. Ninguna orden puede existir fuera de un turno, y esto debe decidirse antes de crear la primera orden.

## 2. Dependencias previas

**Requiere:** Fase 08, Fase 12
**Desbloquea:** Fase 14, Fase 17, Fase 19

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartado floor)

## 4. Qué debe construirse

- `shifts` por sucursal: apertura, cierre, usuario responsable, fondo inicial declarado, estado.
- `cash_registers` (cajas físicas o lógicas) y `register_sessions`: una caja puede tener varias sesiones a lo largo de un turno con distintos cajeros.
- Concepto de **día operativo** configurable por negocio: un turno que abre el viernes a las 20:00 y cierra el sábado a las 4:00 pertenece al viernes.
- Reglas de apertura y cierre: no se abre un turno si hay otro abierto en la misma caja; no se cierra con cuentas abiertas sin autorización explícita.
- Endpoints y pantallas de apertura y cierre básicas, con declaración de fondo.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/shifts/`, `apps/web/src/features/shifts/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

El corte de caja con cuadre y arqueo: eso es la fase 19, cuando ya existan ventas y movimientos que cuadrar. Aquí el cierre solo marca el turno como cerrado.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. El día operativo (no el día calendario) es la unidad que usarán todos los reportes futuros; su regla de cálculo no se redefine en fases posteriores.

## 8. Criterios de finalización — debe quedar funcionando

- Abrir y cerrar un turno con fondo inicial, respetando permisos.
- El día operativo se calcula correctamente para turnos que cruzan la medianoche.
- Todas las fases siguientes tienen un `shiftId` al que colgarse.

## 9. Pruebas y validaciones requeridas

- Casos de turno que cruza medianoche, en distintas zonas horarias por sucursal.
- Intentar abrir dos turnos en la misma caja y recibir error.
- Auditoría completa de apertura y cierre.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-13): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
