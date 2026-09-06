# FASE 17 — Cobro, métodos de pago y cierre de cuenta

> Bloque D — Operación del punto de venta. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Cerrar el ciclo de venta. Es la fase con las garantías transaccionales más estrictas del sistema.

## 2. Dependencias previas

**Requiere:** Fase 13, Fase 14, Fase 15, Fase 16
**Desbloquea:** Fase 18, Fase 19, Fase 20, Fase 22, Fase 23

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartados shifts, orders, timing)

## 4. Qué debe construirse

- `payment_methods` configurables por negocio: efectivo, tarjeta, transferencia, vale, cuenta de casa. Con banderas de si afecta caja y si requiere referencia.
- `payments` ligados a la orden y al turno, con importe, propina, referencia y cajero.
- Pagos parciales, pagos mixtos y cálculo de cambio en efectivo.
- División de cuenta: por importe, por partes iguales y por selección de líneas, generando cuentas hijas trazables a la original.
- Propinas por método, con reparto configurable.
- Transición atómica al cerrar: `order.close` valida que el pagado cubra el total, congela la orden, libera la mesa y detiene la sesión de tiempo, todo en una transacción.
- Reapertura de cuenta cerrada solo con permiso, motivo y auditoría; nunca borra el cierre anterior.
- Interfaz de cobro optimizada para una sola mano y para el error humano bajo presión.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/payments/`, `apps/web/src/features/pos/checkout/`, extensión de `orders/` y `shifts/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Integración con terminal bancaria física, facturación fiscal, impresión del ticket y corte de caja. Cobrar y emitir el comprobante son cosas distintas.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. `order.close` es una única transacción atómica (pago + congelar orden + liberar mesa + detener tiempo): no se descompone en pasos separados aunque simplifique el código.

## 8. Criterios de finalización — debe quedar funcionando

- Cobrar una cuenta completa, parcialmente y con métodos mixtos.
- Dividir una cuenta de seis personas de las tres formas.
- Una cuenta cerrada es inmutable salvo reapertura autorizada.

## 9. Pruebas y validaciones requeridas

- Prueba de concurrencia: dos cajeros cobrando la misma cuenta a la vez; exactamente uno gana.
- La suma de pagos, propinas y descuentos cuadra con el total en cien órdenes generadas al azar.
- Simular caída de la base de datos a mitad del cierre y verificar que no queda una orden medio cerrada.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-17): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
