# FASE 07 — Shell del frontend, sistema de diseño y cliente de API

> Bloque B — Aplicación base. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Dejar una aplicación instalable en tableta donde un usuario real inicia sesión, elige sucursal y navega, con el sistema de diseño ya definido.

## 2. Dependencias previas

**Requiere:** Fase 03, Fase 04, Fase 05
**Desbloquea:** Fase 08, Fase 09

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `packages/contracts/auth` y `packages/contracts/permissions.ts`
- `docs/API_CONVENTIONS.md`

## 4. Qué debe construirse

- Cliente de API tipado generado desde `packages/contracts`, con manejo de refresco de token e inyección automática de la clave de idempotencia.
- Enrutado, rutas protegidas por permiso, y componente `<Can permission="...">` para ocultar acciones no permitidas.
- Sistema de diseño orientado a tableta: objetivos táctiles de 44 px como mínimo, tipografía legible a un brazo de distancia, modo oscuro, retroalimentación háptica.
- Estructura de aplicación: barra lateral, selector de sucursal, menú de usuario, indicador de estado de conexión (presente aunque aún no haya motor offline).
- Pantallas de inicio de sesión por contraseña y por PIN.
- PWA: manifiesto, service worker, instalación en pantalla de inicio, bloqueo de rotación y de gestos de retroceso accidentales.
- Internacionalización con español como idioma base y formato de moneda por negocio.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/web/src/app/`, `src/components/ui/`, `src/lib/api/`, `src/features/auth/`, `src/features/shell/`.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Pantallas de POS, catálogo o administración. Solo el armazón, el sistema de diseño y la autenticación.

## 7. Decisiones de arquitectura que debe respetar

El frontend **nunca** lee código de `apps/api`: solo `packages/contracts`. Esta regla rige todas las fases de web posteriores. Los módulos `tenancy`, `iam` y `audit` están **congelados desde la fase 06**: se usan leyendo `docs/MULTITENANCY.md`, nunca se modifican sin un ADR nuevo.

## 8. Criterios de finalización — debe quedar funcionando

- Iniciar sesión, cambiar de sucursal y cerrar sesión desde una tableta real.
- La aplicación se instala en la pantalla de inicio y abre a pantalla completa.
- Los elementos de interfaz sin permiso no se renderizan.

## 9. Pruebas y validaciones requeridas

- Prueba manual en una tableta física de diez pulgadas y en un teléfono.
- Prueba Playwright del flujo de inicio de sesión y cambio de sucursal.
- Auditoría de contraste y de tamaño de objetivos táctiles.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-07): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
