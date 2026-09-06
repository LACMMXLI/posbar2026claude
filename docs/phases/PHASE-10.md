# FASE 10 — Configuración por sucursal y resolución de precio efectivo

> Bloque C — Catálogo. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Permitir que las sucursales compartan el catálogo del negocio pero difieran en precio, disponibilidad y activación, con una única función de resolución que todo el sistema use.

## 2. Dependencias previas

**Requiere:** Fase 09
**Desbloquea:** Fase 11, Fase 14, Fase 21

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartado catalog de la fase 09)

## 4. Qué debe construirse

- Tabla `branch_products` con solo las diferencias: `price_override`, `is_active`, `is_available`, orden en pantalla, impresora destino. La ausencia de fila significa herencia total.
- Servicio `PriceResolver` como único punto del sistema autorizado a calcular un precio.
- Tablas `price_lists` y `price_list_items` con vigencia por día y hora: happy hour, fin de semana, precio por área.
- Endpoint de **menú efectivo por sucursal** con etiqueta de versión, pensado para que la tableta lo cachee y, más adelante, lo guarde localmente.
- Interfaz de administración por sucursal y conmutador rápido de disponibilidad para el personal de piso.
- Edición masiva: aplicar un porcentaje a una categoría entera en una sucursal.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/catalog/branch/`, `catalog/pricing/`, `apps/web/src/features/catalog/branch/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Descuentos y promociones aplicados a una cuenta (fase 15), inventario y cualquier uso del precio dentro de una orden.

## 7. Decisiones de arquitectura que debe respetar

Regla de resolución fijada por el plan maestro (sección 4), inmodificable sin ADR: `precio_efectivo = lista_de_precios_activa ?? branch_products.price_override ?? variante.precio_base ?? producto.precio_base`. _Activo_ y _disponible_ son conceptos distintos y ambos necesarios. Ningún otro módulo calcula precios: siempre a través de `PriceResolver`.

## 8. Criterios de finalización — debe quedar funcionando

- El mismo producto con precio distinto en dos sucursales, resuelto correctamente.
- Una lista de precios de happy hour que se activa y se desactiva sola por horario.
- El endpoint de menú efectivo devuelve exactamente lo que el POS mostrará.

## 9. Pruebas y validaciones requeridas

- Tabla de casos de precio: sin override, con override, con lista vigente, con lista caducada, en el minuto exacto del cambio.
- Prueba de arquitectura: ningún módulo calcula precios fuera de `PriceResolver`.
- Cambiar la disponibilidad en la sucursal 1 no afecta a la sucursal 2.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-10): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
