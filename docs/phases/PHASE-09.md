# FASE 09 — Catálogo del negocio: categorías y productos

> Bloque C — Catálogo. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Un catálogo propio por negocio, sin ninguna noción de sucursal todavía, para fijar el modelo antes de complicarlo.

## 2. Dependencias previas

**Requiere:** Fase 07, Fase 08
**Desbloquea:** Fase 10, Fase 11, Fase 12, Fase 21

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartado businesses/branches)

## 4. Qué debe construirse

- Tablas `categories` (jerárquicas, ordenables, con color) y `products`.
- Tipos de producto desde el inicio: simple, compuesto y **tarificado por tiempo**, aunque el motor de tiempo llegue en la fase 16.
- Precio base, impuestos aplicables y unidad de venta.
- Subida de imágenes a MinIO con redimensionado en el worker; primera introducción del servicio S3.
- Interfaz de administración pensada para dar de alta cien productos sin desesperar: creación rápida, duplicado, edición por lotes, reordenamiento.
- Importación desde CSV con previsualización y validación.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/catalog/`, `apps/web/src/features/catalog/`, `packages/db`, `common/storage/`, nuevo servicio MinIO en Coolify.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Precios por sucursal, disponibilidad, variantes, modificadores, inventario ni la pantalla de venta.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. El catálogo pertenece al negocio, no a la sucursal (sección 4 del plan maestro): esta fase fija el modelo de identidad de producto que la fase 10 extenderá con overrides, nunca con duplicación.

## 8. Criterios de finalización — debe quedar funcionando

- Alta, edición, archivado y reordenamiento de categorías y productos con imagen.
- Importación de un catálogo real de un bar desde CSV.
- El catálogo del negocio A es invisible e inalcanzable para el negocio B.

## 9. Pruebas y validaciones requeridas

- Cargar un catálogo de doscientos productos y medir el tiempo de respuesta de la lista.
- Prueba de aislamiento sobre productos, categorías e imágenes: una URL de imagen del negocio A no debe ser adivinable ni servible al negocio B.
- Archivar un producto no lo borra: se conserva para el histórico.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-09): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
