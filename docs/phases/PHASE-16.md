# FASE 16 — Motor de tiempo para mesas de billar

> Bloque D — Operación del punto de venta. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Convertir tiempo transcurrido en importes correctos, de forma que sobreviva a reinicios, pérdida de red y relojes desincronizados.

## 2. Dependencias previas

**Requiere:** Fase 12, Fase 14
**Desbloquea:** Fase 17, Fase 20

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartados floor y orders)

## 4. Qué debe construirse

- `table_sessions` con inicio, pausas, reanudaciones y fin, guardados como **eventos**, no como un contador. El importe siempre es una función derivada de los eventos.
- Reglas de tarificación por producto tarificado: tarifa por hora, fracción mínima cobrable, redondeo, tiempo de gracia, tarifas distintas por franja horaria o por día.
- Comandos `timing.start`, `timing.pause`, `timing.resume`, `timing.stop`, `timing.adjust` (con permiso y auditoría).
- Al detenerse, la sesión inyecta una línea en la cuenta de la mesa con el desglose de tiempo.
- Cronómetro en la interfaz calculado localmente a partir de la marca de inicio del servidor, no por incremento en memoria.
- Modalidad de tiempo prepagado: importe fijo que se agota y avisa.
- Aviso visual y sonoro configurable a los N minutos.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/timing/`, `apps/web/src/features/pos/timing/`, extensión de `floor/` y `orders/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Reservas de mesa, control de encendido de luces o cualquier integración con hardware de la mesa.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. El importe de tiempo es siempre una función derivada de eventos guardados, nunca un contador editable: esta regla no se relaja aunque simplifique la interfaz.

## 8. Criterios de finalización — debe quedar funcionando

- Iniciar, pausar, reanudar y detener una mesa, con el importe correcto en la cuenta.
- El cronómetro sigue correcto tras recargar la tableta o reiniciar la API.
- Vista de piso con el tiempo corriendo en todas las mesas activas.

## 9. Pruebas y validaciones requeridas

- Casos de cálculo: fracción mínima, tiempo de gracia, sesión que cruza un cambio de tarifa, sesión con tres pausas, sesión de nueve horas.
- Matar el proceso de la API a mitad de sesión y comprobar que al volver el importe es el correcto.
- Un ajuste manual de tiempo queda registrado con quién lo autorizó.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-16): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
