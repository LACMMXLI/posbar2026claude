# FASE 15 — Cancelaciones, cortesías y descuentos con autorización

> Bloque D — Operación del punto de venta. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Todo lo que hace que una cuenta disminuya. Se separa de la fase 14 a propósito: es la superficie donde ocurre el fraude interno y merece su propio diseño y sus propias pruebas.

## 2. Dependencias previas

**Requiere:** Fase 04, Fase 05, Fase 14
**Desbloquea:** Fase 17, Fase 20, Fase 24

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `packages/contracts/permissions.ts`
- `docs/DATA_MODEL.md` (apartado orders)

## 4. Qué debe construirse

- Comandos `order.void_item`, `order.void_order`, `order.comp_item` (cortesía), `order.apply_discount`.
- Distinción entre cancelar **antes** y **después** de enviar a producción o de imprimir: la segunda exige motivo, permiso superior y queda marcada como merma potencial.
- Catálogo de motivos configurable por negocio: error de captura, cliente cambió de opinión, producto en mal estado, cortesía de la casa.
- Descuentos por porcentaje, por importe y por línea, con límite máximo por rol y elevación por PIN de supervisor cuando se rebasa.
- Las líneas canceladas **no se borran**: se marcan y permanecen visibles en el histórico y en los reportes.
- Interfaz con confirmación explícita, motivo obligatorio y diálogo de autorización por PIN.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/orders/voids/`, `orders/discounts/`, `apps/web/src/features/pos/`, ampliación del catálogo de permisos.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Promociones automáticas, cupones y programas de lealtad. Solo descuentos manuales autorizados.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. Reutiliza el mecanismo de elevación por PIN de la fase 04 (`iam`, congelado): no se crea un segundo mecanismo de autorización en el momento. Ninguna línea cancelada se borra físicamente.

## 8. Criterios de finalización — debe quedar funcionando

- Un mesero sin permiso no puede cancelar una línea impresa sin el PIN de un encargado.
- Cada cancelación y cada descuento genera un evento de auditoría con ejecutor, autorizante, motivo e importe.
- Los totales se recalculan correctamente con cancelaciones y descuentos mezclados.

## 9. Pruebas y validaciones requeridas

- Matriz de casos: cancelar antes y después de imprimir, con y sin permiso, con y sin elevación.
- Consulta de auditoría que responde «qué canceló cada usuario en el turno del viernes».
- Un descuento por encima del límite del rol es rechazado por el servidor incluso si la interfaz lo permitiera.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-15): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
