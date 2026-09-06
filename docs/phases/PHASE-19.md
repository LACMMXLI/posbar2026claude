# FASE 19 — Movimientos de efectivo y corte de caja

> Bloque D — Operación del punto de venta. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Cerrar el turno con un cuadre que el dueño pueda creer. Solo es posible ahora, cuando ya existen ventas, pagos y cancelaciones que cuadrar.

## 2. Dependencias previas

**Requiere:** Fase 13, Fase 17, Fase 18
**Desbloquea:** Fase 23, Fase 24

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartados shifts, payments, printing)

## 4. Qué debe construirse

- `cash_movements`: fondo inicial, entradas, retiros a caja fuerte, gastos con comprobante, ajustes. Cada uno con categoría, motivo, autorizante y adjunto opcional en MinIO.
- Motor de corte que calcula el esperado por método de pago: ventas en efectivo + entradas − salidas + fondo.
- Arqueo con conteo por denominación en la interfaz y cálculo automático de diferencia.
- Cierre de turno en dos pasos: **cierre ciego** (el cajero cuenta sin ver el esperado) y revisión del encargado.
- Reporte X (parcial, no cierra) y reporte Z (cierre definitivo, irreversible), impresos por el agente local.
- Bloqueos: no se cierra con cuentas abiertas ni con trabajos de impresión pendientes.
- Historial de cortes con sus diferencias, consultable por el propietario.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/cash/`, `apps/web/src/features/cash/`, extensión de `shifts/` y `printing/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Reportes históricos y comparativos entre turnos: eso es la fase 23. Aquí solo el corte del turno en cuestión.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. El cierre ciego (cajero cuenta sin ver el esperado, luego revisión del encargado) no se simplifica a un solo paso: es lo que hace útil al corte. Hito de negocio: al terminar esta fase un bar puede operar una noche completa de principio a fin con conexión estable.

## 8. Criterios de finalización — debe quedar funcionando

- Un turno completo: apertura con fondo, ventas, un retiro, un gasto, arqueo ciego y corte Z impreso.
- El esperado cuadra al centavo contra la suma de pagos del turno.
- Un turno cerrado es inmutable.

## 9. Pruebas y validaciones requeridas

- Simulación de un turno de doscientas órdenes con pagos mixtos, cancelaciones y descuentos, comprobando el cuadre.
- Intentar cerrar con una cuenta abierta y recibir el bloqueo.
- Una diferencia de caja queda registrada y no se puede editar después.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-19): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
