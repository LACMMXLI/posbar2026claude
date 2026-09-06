# FASE 11 — Variantes, modificadores y grupos de opciones

> Bloque C — Catálogo. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Cerrar el catálogo con lo que un bar realmente necesita capturar: presentaciones, extras y notas.

## 2. Dependencias previas

**Requiere:** Fase 09, Fase 10
**Desbloquea:** Fase 14, Fase 22

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartados catalog y catalog/branch)

## 4. Qué debe construirse

- `product_variants`: copa, media, botella, litro. Cada una con su precio base, su override por sucursal y su propia relación futura con el inventario.
- `modifier_groups` y `modifiers` con mínimo y máximo de selección, obligatoriedad y precio adicional propio.
- Grupos reutilizables entre productos y grupos exclusivos de un producto.
- Productos compuestos y paquetes: un combo que descuenta sus componentes.
- Notas libres por línea con sugerencias frecuentes.
- Interfaz de configuración y previsualización de cómo se verá el producto en el POS.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/catalog/variants/`, `catalog/modifiers/`, `apps/web/src/features/catalog/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

La captura de estos elementos en una cuenta. Aquí solo se define y se administra.

## 7. Decisiones de arquitectura que debe respetar

Extiende `PriceResolver` (fase 10) para variantes y modificadores sin crear un segundo mecanismo de cálculo de precio. Toda validación de selección (mínimo/máximo) se rechaza en servidor, no solo en cliente.

## 8. Criterios de finalización — debe quedar funcionando

- Un whisky con tres presentaciones y un grupo de mezcladores, con precio efectivo correcto en cada combinación.
- El endpoint de menú efectivo entrega variantes y modificadores ya resueltos.

## 9. Pruebas y validaciones requeridas

- Casos de precio compuesto: variante + modificadores con costo + lista de precios vigente.
- Validación de mínimos y máximos de selección rechazada en el servidor, no solo en la interfaz.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-11): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
