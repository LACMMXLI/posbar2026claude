# FASE 12 — Áreas, mesas y recursos de la sucursal

> Bloque D — Operación del punto de venta. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Modelar el espacio físico del bar, incluidas las mesas de billar como recurso tarificado por tiempo, sin todavía cobrarlas.

## 2. Dependencias previas

**Requiere:** Fase 08, Fase 09
**Desbloquea:** Fase 13, Fase 14, Fase 16, Fase 18, Fase 21

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartados businesses/branches y catalog)

## 4. Qué debe construirse

- `areas` por sucursal: terraza, barra, salón, zona de billar. Con impresora predeterminada y lista de precios asociada opcional.
- `tables` con número, capacidad, posición en el plano y tipo: `standard` o `timed`.
- Las mesas de billar son mesas `timed` vinculadas a un producto tarificado por tiempo del catálogo, con su tarifa por hora, fracción mínima y redondeo definidos allí.
- Estados de mesa: libre, ocupada, por cobrar, reservada, fuera de servicio.
- Editor visual del plano y vista de piso con el estado en vivo.
- Canal WebSocket por sucursal; primera introducción de Socket.IO con adaptador Redis.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/floor/`, `apps/api/src/realtime/`, `apps/web/src/features/floor/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Cuentas, cronómetro de billar, cobro. El estado de la mesa aún se cambia manualmente.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. Primer uso de Socket.IO + adaptador Redis: todo canal WebSocket se agrupa por `businessId` + `branchId`, sin excepción, para que el aislamiento de tenant también rija en tiempo real.

## 8. Criterios de finalización — debe quedar funcionando

- Configurar áreas y mesas de una sucursal desde la interfaz.
- Vista de piso que refleja cambios de estado en dos tabletas simultáneamente.
- Mesas de billar declaradas con su tarifa, todavía sin cronómetro.

## 9. Pruebas y validaciones requeridas

- Dos tabletas conectadas: cambiar el estado en una y verlo en la otra en menos de un segundo.
- Un cliente WebSocket del negocio A no recibe eventos del negocio B ni de otra sucursal.
- Reiniciar la API no pierde el estado de mesas: vive en la base de datos, no en memoria.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-12): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
