# FASE 26 — Endurecimiento, respaldos y observabilidad

> Bloque F — Plataforma y producción. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Dejar el sistema en condiciones de operar el dinero de negocios reales, con evidencia de que se puede recuperar de un desastre.

## 2. Dependencias previas

**Requiere:** Todas
**Desbloquea:** producción

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/ARCHITECTURE.md`
- `docs/MULTITENANCY.md`
- `docs/RUNBOOK.md` (borrador acumulado desde la fase 01)

## 4. Qué debe construirse

- Respaldos: `pg_dump` diario más archivado WAL para recuperación a un punto en el tiempo; copia fuera del servidor; respaldo de MinIO.
- **Prueba de restauración documentada**: un respaldo que nunca se ha restaurado no es un respaldo.
- Métricas y trazas con OpenTelemetry, tableros de latencia por endpoint, profundidad de colas, errores por negocio.
- Alertas: API caída, cola atascada, agente de impresión desconectado más de N minutos, tasa de errores elevada, disco al límite.
- Rate limiting por negocio y por IP; protección contra fuerza bruta en PIN.
- Repaso de seguridad: cabeceras, CORS, política de contenido, rotación de secretos, revisión de dependencias.
- Cifrado en reposo de campos sensibles y política de retención y borrado de datos.
- Manual de operación: cómo desplegar, cómo revertir, qué hacer cuando un bar reporta un problema a las dos de la mañana.
- Procedimiento de migración con cero tiempo fuera y guion de reversión por despliegue.

## 5. Lista blanca — archivos y módulos que puede modificar

`deploy/`, `apps/api/src/common/`, `docs/RUNBOOK.md`, configuración de Coolify y del CI.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Alta disponibilidad multi-región, réplicas de lectura y autoescalado. Se documentan como el siguiente paso cuando la carga lo justifique.

## 7. Decisiones de arquitectura que debe respetar

Esta fase es una **puerta**: no se opera con dinero real de terceros sin ella. No introduce arquitectura nueva; endurece la existente.

## 8. Criterios de finalización — debe quedar funcionando

- Respaldos automáticos verificados y restauración probada en un entorno limpio.
- Tableros y alertas conectados a un canal que alguien realmente lee.
- Despliegue y reversión documentados y ejecutados al menos una vez.

## 9. Pruebas y validaciones requeridas

- Simulacro de desastre: destruir la base de datos de pruebas y restaurarla desde el respaldo, midiendo el tiempo.
- Prueba de carga con veinte negocios y cien tabletas concurrentes.
- Revisión de seguridad externa o, como mínimo, una lista OWASP recorrida y firmada.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-26): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
