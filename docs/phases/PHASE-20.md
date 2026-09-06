# FASE 20 — Motor offline y sincronización

> Bloque E — Resiliencia y datos. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Que el bar siga vendiendo sin internet. Se implementa ahora, sobre una API que desde la fase 05 fue diseñada para permitirlo.

## 2. Dependencias previas

**Requiere:** Fase 05, Fase 14, Fase 15, Fase 16, Fase 17, Fase 18
**Desbloquea:** Fase 22

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/OFFLINE.md`
- `docs/API_CONVENTIONS.md`
- Sección 5 de `DEVELOPMENT_PLAN.md` (frontera exacta de lo que funciona sin red)

## 4. Qué debe construirse

- Almacén local en IndexedDB con Dexie: menú efectivo, mesas, cuentas abiertas del turno, configuración de la sucursal.
- **Bandeja de salida**: cola persistente de comandos con clave de idempotencia, número de secuencia por dispositivo y estado (pendiente, enviado, confirmado, en conflicto).
- Motor de reproducción: al recuperar la conexión, envía en orden y en lotes, tolerando reenvíos.
- Endpoints `/sync/pull` (cambios desde una marca) y `/sync/push` (lote de comandos), con resolución por tipo de comando.
- Política de conflictos explícita: los deltas se fusionan; las cancelaciones ganan sobre las adiciones; los cierres de cuenta requieren conexión; un conflicto irresoluble se marca para revisión humana.
- Interfaz honesta: indicador de estado, contador de comandos pendientes, bloqueo visible de las acciones que exigen conexión.
- Sincronización del catálogo por versión, con descarga en segundo plano.
- Bloqueo de cierre de turno con bandeja pendiente.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/web/src/lib/offline/`, `apps/web/src/lib/api/` (interceptor), `apps/api/src/modules/sync/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Funcionamiento sin red de la administración, del inventario y de los reportes. La frontera declarada en `docs/OFFLINE.md` se respeta y no se amplía.

## 7. Decisiones de arquitectura que debe respetar

La frontera offline/online es la fijada en la fase 05 (`docs/OFFLINE.md`): sin conexión funciona abrir cuenta, capturar consumo, cobrar en efectivo, imprimir local y cronómetros de billar; requieren conexión el cierre de turno, pagos con terminal, cambios de catálogo, altas de usuario y reportes. No se amplía esta frontera en esta fase. Hito: el sistema aguanta la realidad de la red de un bar.

## 8. Criterios de finalización — debe quedar funcionando

- Desconectar el internet del bar, abrir tres cuentas, capturar consumo, cobrar en efectivo, imprimir, y al reconectar todo aparece en el servidor una sola vez.
- Dos tabletas trabajando sin red sobre mesas distintas se reconcilian sin pérdida.
- Las acciones que requieren conexión están claramente deshabilitadas, no fallan en silencio.

## 9. Pruebas y validaciones requeridas

- Prueba Playwright con red desconectada: guion completo de servicio de una noche.
- Prueba de reconexión con la misma tableta duplicando el envío: cero duplicados en la base de datos.
- Prueba de conflicto: dos tabletas modificando la misma cuenta sin red; resultado predecible y documentado.
- Prueba de dispositivo perdido: la bandeja sobrevive a un cierre completo del navegador.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-20): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
