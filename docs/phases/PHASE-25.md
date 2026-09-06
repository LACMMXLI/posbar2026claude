# FASE 25 — Panel SUPERADMIN y ciclo de vida de cuentas

> Bloque F — Plataforma y producción. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Administrar la plataforma como un negocio SaaS, sobre las entidades que existen desde la fase 02.

## 2. Dependencias previas

**Requiere:** Fase 02, Fase 06, Fase 08, Fase 23
**Desbloquea:** —

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/DATA_MODEL.md` (apartados platform, tenancy, businesses/branches)

## 4. Qué debe construirse

- Aplicación separada bajo su propia ruta o subdominio, con su propio inicio de sesión y segundo factor obligatorio.
- Alta y baja de negocios, con aprovisionamiento completo: sucursal principal, roles de sistema, propietario invitado.
- Planes y límites: número de sucursales, de usuarios, de productos, módulos habilitados. Aplicados **por el backend**, no por la interfaz.
- Estados de cuenta: prueba, activo, suspendido por falta de pago, cancelado. Un negocio suspendido pierde el acceso pero conserva sus datos.
- Métricas de plataforma: negocios activos, transacciones por día, uso de almacenamiento, salud de los agentes de impresión.
- Suplantación con vigencia limitada, motivo obligatorio y registro visible en la auditoría **del negocio**, no solo en la de la plataforma.
- Configuración global: correo transaccional, límites de tasa, banderas de funcionalidad por negocio.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/src/modules/platform/`, `apps/web/src/features/platform/` o una aplicación separada `apps/admin`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Cobro de suscripciones con pasarela de pago, facturación de la plataforma y autoservicio de registro. Se preparan los estados, no la cobranza.

## 7. Decisiones de arquitectura que debe respetar

Respeta la separación de los dos reinos de identidad fijada en la fase 02: `platform_users` nunca se fusiona con `users`. Toda suplantación queda registrada en la auditoría **del negocio suplantado**, no solo en la de plataforma.

## 8. Criterios de finalización — debe quedar funcionando

- Dar de alta un negocio nuevo listo para operar en menos de un minuto.
- Suspender un negocio y comprobar que sus usuarios pierden el acceso sin perder datos.
- Los límites del plan se aplican realmente en el servidor.

## 9. Pruebas y validaciones requeridas

- Un token de negocio jamás alcanza una ruta de plataforma, ni con permisos manipulados.
- Toda acción de plataforma y toda suplantación queda auditada en ambos lados.
- Rebasar el límite de sucursales del plan devuelve un error claro.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-25): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
