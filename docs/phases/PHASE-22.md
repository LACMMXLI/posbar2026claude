# FASE 22 — Recetas y descuento automático por venta

> Bloque E — Resiliencia y datos. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Conectar la venta con el inventario, que es donde un bar realmente descubre sus fugas.

## 2. Dependencias previas

**Requiere:** Fase 11, Fase 17, Fase 20, Fase 21
**Desbloquea:** Fase 23

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartados catalog/variants, payments, sync, inventory)

## 4. Qué debe construirse

- `recipes`: qué insumos y en qué cantidad consume cada producto o variante. Un whisky en copa consume 45 ml de la botella.
- Recetas por variante y por modificador: un extra de shot suma su consumo.
- Consumo disparado **al cerrar la cuenta**, no al capturarla, y revertido si la cuenta se reabre o se cancela.
- Procesamiento en el worker mediante cola, para que el cierre de cuenta jamás se retrase por el inventario.
- Manejo de existencia negativa: se permite y se alerta, **nunca** se bloquea una venta.
- Reporte de **varianza**: consumo teórico según recetas contra consumo real según conteo. Es el producto principal de esta fase.
- Política explícita para el consumo de ventas capturadas sin red: se procesa al sincronizar.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/inventory/recipes/`, `inventory/consumption/`, colas en el worker, `apps/web/src/features/inventory/recipes/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Compras a proveedores, cuentas por pagar y sugerencias automáticas de reorden.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. El consumo nunca bloquea una venta por existencia negativa: se permite y se alerta. El disparo de consumo ocurre al cierre de cuenta, no a la captura, y es idempotente frente a reprocesos.

## 8. Criterios de finalización — debe quedar funcionando

- Vender diez copas descuenta 450 ml de la botella correspondiente.
- Cancelar una cuenta cerrada devuelve el insumo.
- Reporte de varianza de una semana con su explicación por producto.

## 9. Pruebas y validaciones requeridas

- Turno simulado de cuatrocientas ventas: consumo teórico exacto contra el cálculo manual.
- Prueba de idempotencia: reprocesar el mismo cierre no descuenta dos veces.
- Ventas sincronizadas tarde descuentan una sola vez y con la fecha correcta.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-22): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
