# FASE 05 — Auditoría, comandos idempotentes y convenciones de la API

> Bloque A — Fundamentos de plataforma. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Fijar la forma que tendrá toda mutación del sistema, de modo que el motor offline de la fase 20 no obligue a reescribir nada.

## 2. Dependencias previas

**Requiere:** Fase 02, Fase 03, Fase 04
**Desbloquea:** Fase 06, Fase 07, Fase 14, Fase 15, Fase 20, Fase 24

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- Sección 5 de `DEVELOPMENT_PLAN.md` (estrategia offline-first) — última vez que esta fase necesita leer el plan maestro directamente, porque `docs/OFFLINE.md` nace en esta fase.

## 4. Qué debe construirse

- Tabla `audit_log` solo-añadir, particionada por mes, con actor, actor autorizante, acción, entidad, antes y después, dispositivo, IP.
- Servicio de auditoría e interceptor declarativo `@Audited()`.
- Tabla `idempotency_keys` y middleware que exige la cabecera en toda mutación, guarda la respuesta y la reproduce ante un reenvío.
- Convenciones de la API: envoltura de errores, paginación por cursor, versionado, códigos de error tipados en contratos.
- UUIDv7 generado en cliente para toda entidad operativa; el servidor valida forma y unicidad.
- Documento `docs/API_CONVENTIONS.md` y OpenAPI generado automáticamente.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/audit/`, `apps/api/src/common/`, `packages/contracts/`, `docs/API_CONVENTIONS.md`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

El motor de sincronización, la bandeja de salida del cliente y el visor de auditoría. Aquí solo el cimiento del servidor.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. Reglas offline-first fijadas aquí y válidas para todas las fases posteriores (documentarlas en `docs/OFFLINE.md`): IDs UUIDv7 generados en cliente, toda mutación es un comando idempotente, cambios como deltas nunca como estados absolutos, reloj de la sucursal con secuencia monótona por dispositivo. `audit` queda **congelado a partir de la fase 06**.

## 8. Criterios de finalización — debe quedar funcionando

- Toda mutación existente escribe su evento de auditoría automáticamente.
- Reenviar una mutación con la misma clave devuelve la respuesta original sin duplicar efectos.
- OpenAPI publicado y sincronizado con los contratos.

## 9. Pruebas y validaciones requeridas

- Enviar el mismo comando cincuenta veces en paralelo y comprobar un solo efecto.
- Intentar un `UPDATE` o `DELETE` sobre `audit_log` y recibir error de la base de datos.
- Prueba de arquitectura que falla si un endpoint de mutación carece de auditoría o de idempotencia.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-05): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
