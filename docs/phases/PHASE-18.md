# FASE 18 — Impresión de tickets y agente local

> Bloque D — Operación del punto de venta. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Que salga papel, de forma confiable y sin depender de que el bar abra puertos en su red.

## 2. Dependencias previas

**Requiere:** Fase 12, Fase 14, Fase 17
**Desbloquea:** Fase 19, Fase 20

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartados floor, orders, payments)

## 4. Qué debe construirse

- `printers` por sucursal: nombre, modelo, ancho de papel, ubicación, tipo (caja, barra, cocina), estado.
- Cola `print_jobs` en BullMQ con reintentos, tiempo de espera y bandeja de fallidos visible en la interfaz.
- `apps/print-agent`: servicio Node instalable en una mini PC de la sucursal. Se conecta hacia afuera por WebSocket con un token de sucursal, recibe trabajos, habla ESC/POS por red o USB y confirma o reporta el fallo. Guarda los trabajos en disco para reintentar si se cae la red.
- Plantillas de ticket editables por negocio: logotipo, encabezado, pie, datos fiscales, propina sugerida, código QR.
- Tipos de documento: comanda de barra o cocina, cuenta previa, ticket de venta, corte de caja, reimpresión marcada como copia.
- Reglas de enrutamiento: qué producto se imprime en qué impresora, tomadas de `branch_products` y del área.
- Respaldo: si no hay impresora, generar PDF y ofrecerlo por pantalla o enviarlo por mensaje.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/printing/`, `apps/print-agent/` (aplicación nueva), `apps/web/src/features/settings/printing/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Impresión de reportes complejos, envío de tickets por correo electrónico y timbrado fiscal.

## 7. Decisiones de arquitectura que debe respetar

Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido (ver `docs/MULTITENANCY.md`). Prohibido el cliente Prisma crudo fuera de `tenancy/`. Toda tabla operativa nueva lleva `business_id` y política RLS. El agente local se conecta **hacia afuera** (no se abren puertos en el bar); el aislamiento de tenant se extiende al token de sucursal del agente: un token nunca recibe trabajos de otra sucursal.

## 8. Criterios de finalización — debe quedar funcionando

- Comanda que sale automáticamente al capturar consumo, en la impresora correcta.
- Ticket de venta al cerrar la cuenta, con el formato del negocio.
- Reimpresión con permiso y marca de copia.
- Una impresora apagada no bloquea el cobro: el trabajo queda en cola y se reintenta.

## 9. Pruebas y validaciones requeridas

- Prueba con impresora térmica real de 58 y de 80 milímetros.
- Apagar la impresora, cobrar tres cuentas, encenderla y verificar que salen los tres tickets sin duplicados.
- Un agente con token de la sucursal 1 no recibe trabajos de la sucursal 2.
- Prueba de acentos, símbolos de moneda y nombres largos de producto.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-18): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
