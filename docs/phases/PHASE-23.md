# FASE 23 — Reportes y modelos de lectura

> Bloque E — Resiliencia y datos. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Responder las preguntas del dueño sin degradar el POS. Se construye al final porque solo ahora existen todos los movimientos que los alimentan.

## 2. Dependencias previas

**Requiere:** Fase 17, Fase 19, Fase 21, Fase 22
**Desbloquea:** Fase 24, Fase 25

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartados payments, cash, inventory, recipes)

## 4. Qué debe construirse

- Vistas materializadas y tablas de agregación por día operativo, sucursal, producto, categoría, mesero y método de pago, refrescadas por el worker.
- Reportes: ventas por periodo, comparativo entre sucursales, productos más y menos vendidos, ventas por mesero, ventas por hora, métodos de pago, propinas, descuentos y cancelaciones por usuario, ocupación y rendimiento de mesas de billar, margen bruto por producto, varianza de inventario.
- Panel de inicio por rol: el propietario ve el negocio completo, el encargado ve su sucursal, el mesero ve su turno.
- Exportación a CSV y PDF generada en el worker y entregada desde MinIO.
- Reportes programados por correo: el resumen del día operativo a las 6 de la mañana.
- Separación estricta: los reportes leen de los modelos de lectura, nunca de las tablas operativas.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/reports/`, migraciones de vistas en `packages/db`, trabajos en el worker, `apps/web/src/features/reports/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Constructor de reportes a medida, predicciones y cualquier analítica entre negocios distintos.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. Los reportes leen exclusivamente de modelos de lectura (vistas materializadas / tablas de agregación); nunca directamente de las tablas operativas del POS.

## 8. Criterios de finalización — debe quedar funcionando

- Todos los reportes listados, filtrables por periodo y sucursal, respetando permisos.
- El resumen diario llega por correo automáticamente.
- Un reporte pesado no afecta el tiempo de respuesta del POS.

## 9. Pruebas y validaciones requeridas

- Cada cifra de cada reporte reconciliada contra una consulta directa a las tablas operativas.
- Prueba de carga: generar el reporte anual de un negocio con un millón de líneas mientras se capturan órdenes, midiendo la latencia del POS.
- Aislamiento: un reporte jamás incluye una fila de otro negocio, ni siquiera en los agregados.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-23): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
