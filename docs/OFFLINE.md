# Offline-first

<!-- tope: 120 líneas -->

> **Estado: plantilla de la fase 01.** Las reglas de comandos idempotentes se fijan en la fase 05; el motor local en la fase 20. Referencia provisional: `DEVELOPMENT_PLAN.md` §5. Se modifica solo con un ADR.

## Frontera (declarada, aún no implementada)

| Funciona sin red                                                                              | Requiere conexión                                                                                                 |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| abrir cuenta · capturar consumo · cobrar en efectivo · imprimir local · cronómetros de billar | cierre de turno y corte · pagos con terminal · cambios de catálogo · altas de usuario · reportes · administración |

## Reglas de diseño (se implementan desde la fase 05)

IDs UUIDv7 generados en cliente · toda mutación es un comando con clave de idempotencia (72 h) · deltas, no estados absolutos · reloj de la sucursal + secuencia por dispositivo · un turno no cierra con bandeja de salida pendiente.

## Política de conflictos

_Se documenta en la fase 20._
