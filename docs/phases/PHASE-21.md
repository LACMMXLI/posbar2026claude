# FASE 21 — Inventario: insumos, existencias y movimientos

> Bloque E — Resiliencia y datos. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Saber qué hay en cada sucursal y por qué cambió, con movimientos manuales antes de automatizar nada.

## 2. Dependencias previas

**Requiere:** Fase 09, Fase 10, Fase 12
**Desbloquea:** Fase 22, Fase 23

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartados catalog, catalog/branch, floor)

## 4. Qué debe construirse

- `inventory_items` a nivel de negocio: insumos y productos inventariables, con unidad base y factores de conversión (botella → mililitro, caja → pieza).
- `stock` por sucursal, calculado como saldo de movimientos y **no** como campo editable.
- `inventory_movements` solo-añadir: compra, entrada, salida, merma, transferencia entre sucursales, ajuste por conteo. Con costo unitario y proveedor opcional.
- Conteos físicos: iniciar un conteo, capturar por categoría, generar el movimiento de ajuste y congelar la diferencia.
- Costeo promedio ponderado, base para el margen que se reportará en la fase 23.
- Alertas de mínimos por sucursal.
- Interfaz pensada para capturar en el almacén desde un teléfono.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/inventory/`, `apps/web/src/features/inventory/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Descuento automático por venta, recetas, órdenes de compra a proveedores y pronósticos.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. `stock` es siempre un saldo derivado de `inventory_movements` (solo-añadir); nunca un campo editable directamente.

## 8. Criterios de finalización — debe quedar funcionando

- Registrar compras, mermas y transferencias, con existencias correctas por sucursal.
- Un conteo físico completo que genera su ajuste.
- El histórico explica cada unidad de diferencia.

## 9. Pruebas y validaciones requeridas

- El saldo calculado coincide con la suma de movimientos en mil movimientos generados.
- Una transferencia entre sucursales es atómica: nunca sale de una sin entrar en la otra.
- Ningún movimiento se puede editar ni borrar; solo se corrige con otro movimiento.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-21): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
