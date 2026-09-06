# FASE 24 — Visor de historial y auditoría

> Bloque E — Resiliencia y datos. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Hacer consultable la auditoría que se ha venido escribiendo desde la fase 05, que hasta ahora solo existía en la base de datos.

## 2. Dependencias previas

**Requiere:** Fase 05, Fase 15, Fase 19, Fase 23
**Desbloquea:** —

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartados audit, orders/voids, cash, reports)

## 4. Qué debe construirse

- Buscador de auditoría con filtros por usuario, acción, entidad, sucursal, turno y rango de fechas.
- Línea de tiempo de una orden concreta: apertura, cada línea, cada cancelación, cada pago, quién y a qué hora.
- Historial de cuentas cerradas con búsqueda por folio, mesa, mesero e importe.
- Vista de actividad por usuario, pensada para investigar irregularidades.
- Vistas de riesgo predefinidas: cancelaciones después de impresión, descuentos elevados, reaperturas de cuenta, diferencias de caja, ajustes de tiempo de billar.
- Política de retención y archivado de particiones antiguas a MinIO.
- Exportación de un rango de auditoría.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/audit/query/`, `apps/web/src/features/audit/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Detección automática de fraude, alertas por comportamiento y aprendizaje automático.

## 7. Decisiones de arquitectura que debe respetar

Los módulos `tenancy`, `iam` y `audit` están **congelados desde la fase 06**: se usan leyendo `docs/MULTITENANCY.md`, nunca se modifican sin un ADR nuevo. Esta fase agrega una capa de **consulta** (`audit/query/`) sobre `audit_log`; no modifica el módulo `audit` congelado ni su forma de escritura.

## 8. Criterios de finalización — debe quedar funcionando

- Reconstruir por completo la historia de cualquier cuenta cerrada.
- Responder «quién canceló qué y quién lo autorizó» en segundos.
- Las vistas de riesgo señalan comportamientos anómalos del turno.

## 9. Pruebas y validaciones requeridas

- Recorrer un turno simulado completo y verificar que cada acción tiene su evento correspondiente.
- Consultas con un año de auditoría respondiendo por debajo de dos segundos.
- La auditoría sigue siendo inmodificable desde la aplicación.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-24): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
