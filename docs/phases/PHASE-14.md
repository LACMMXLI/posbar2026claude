# FASE 14 — Cuentas: apertura y captura de consumo

> Bloque D — Operación del punto de venta. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

La pantalla central del producto. Abrir una cuenta, agregar productos y modificar cantidades, con la forma de comandos que después permitirá trabajar sin red.

## 2. Dependencias previas

**Requiere:** Fase 05, Fase 10, Fase 11, Fase 12, Fase 13
**Desbloquea:** Fase 15, Fase 16, Fase 17, Fase 18, Fase 20

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/API_CONVENTIONS.md`
- `docs/OFFLINE.md`
- `docs/DATA_MODEL.md` (apartados catalog/branch, floor, shifts)

## 4. Qué debe construirse

- `orders`: identificador generado en el cliente, tipo (mesa, barra, para llevar), mesa, mesero, turno, estado, comensales, nombre libre para cuentas de barra.
- `order_items` como **registro de deltas**: cada línea guarda producto, variante, modificadores, cantidad, precio congelado, impuestos congelados, quién la capturó y cuándo.
- Comandos: `order.open`, `order.add_items`, `order.change_quantity`, `order.add_note`, `order.transfer_table`, `order.merge`, `order.split`, `order.assign_waiter`. Todos idempotentes.
- Cálculo de totales en el servidor como única verdad: subtotal, impuestos, total. El cliente calcula solo para mostrar.
- Interfaz de POS: cuadrícula de productos por categoría, búsqueda, favoritos, teclado numérico de cantidad, panel de cuenta, captura de variantes y modificadores.
- Actualización en vivo de la cuenta entre tabletas.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/orders/`, `apps/web/src/features/pos/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Cancelar líneas, aplicar descuentos, cobrar, imprimir y descontar inventario. La cuenta solo crece.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. Reglas offline-first de `docs/OFFLINE.md` (fase 05) obligatorias aquí: IDs UUIDv7 en cliente, comandos idempotentes, deltas nunca estados absolutos, totales siempre recalculados en servidor, precio y nombre **congelados** en la línea al capturarse.

## 8. Criterios de finalización — debe quedar funcionando

- Un mesero abre una cuenta en una mesa, captura varias rondas y ve el total correcto.
- Dos meseros capturan sobre la misma cuenta sin pisarse.
- Mover una cuenta de mesa, juntar dos cuentas y separarla.

## 9. Pruebas y validaciones requeridas

- Enviar el mismo comando `add_items` tres veces con la misma clave: la cuenta contiene el consumo una sola vez.
- Cambiar el precio del producto en el catálogo con la cuenta abierta: la cuenta no cambia.
- Prueba de concurrencia: dos clientes agregando simultáneamente, ambos aportes presentes.
- Aislamiento: una orden del negocio A es inalcanzable desde B.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-14): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
