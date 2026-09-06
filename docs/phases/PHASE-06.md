# FASE 06 — Batería de pruebas de aislamiento y congelación del núcleo

> Bloque A — Fundamentos de plataforma. Encargo ejecutable — lee solo esto y los archivos de «Lectura obligatoria» para trabajar la fase.
> Tope: 200 líneas (sección 9 de `DEVELOPMENT_PLAN.md`).

## 1. Objetivo

Demostrar que no hay fugas entre negocios y dejar una red de seguridad que se ejecutará en cada fase posterior. Esta fase es una puerta: no se avanza sin ella.

## 2. Dependencias previas

**Requiere:** Fase 02, Fase 03, Fase 04, Fase 05
**Desbloquea:** 25 · puerta obligatoria para el bloque B

Si una dependencia no está marcada como terminada en `docs/PROJECT_STATE.md`, detente y repórtalo antes de empezar.

## 3. Lectura obligatoria antes de comenzar

- `CLAUDE.md` — enrutador del proyecto y reglas innegociables.
- `docs/PROJECT_STATE.md` — estado de cada fase, deuda técnica, trampas conocidas.
- `docs/MULTITENANCY.md`
- `docs/API_CONVENTIONS.md`
- OpenAPI generado en la fase 05

## 4. Qué debe construirse

- Utilería de pruebas que crea dos negocios completos con datos idénticos y usuarios en cada uno.
- **Barrido automático de endpoints**: recorre el OpenAPI y, para cada ruta, intenta acceder con un token del otro negocio esperando 404.
- Pruebas de fuga por identificador: sustituir un UUID propio por uno ajeno en cuerpo, ruta y parámetros.
- Pruebas de fuga por relaciones anidadas y por filtros de búsqueda y ordenamiento.
- Pruebas de fuga en el token: alteración de reclamaciones, token de otro negocio, token caducado, token de plataforma.
- Prueba a nivel de base de datos con el rol de aplicación y RLS activo.
- Prueba de arquitectura que prohíbe importar el cliente Prisma crudo fuera de `tenancy/`.
- Congelación documentada de `tenancy`, `iam` y `audit`.

## 5. Lista blanca — archivos y módulos que puede modificar

`apps/api/test/isolation/`, `apps/api/test/architecture/`, `docs/MULTITENANCY.md`, configuración de CI.

## 6. Lista negra — qué NO debe desarrollarse en esta fase

Cualquier funcionalidad nueva. Esta fase no agrega producto: agrega certeza.

## 7. Decisiones de arquitectura que debe respetar

Al terminar esta fase, `tenancy`, `iam` y `audit` quedan **congelados**: ninguna fase posterior los modifica sin un ADR nuevo. `docs/MULTITENANCY.md` pasa a ser normativo y de lectura obligatoria en toda fase que toque la base de datos. Esta fase es una **puerta**: el bloque B no empieza sin que `pnpm test:isolation` esté en verde.

## 8. Criterios de finalización — debe quedar funcionando

- `pnpm test:isolation` como comando de una sola línea, obligatorio en CI.
- El barrido cubre automáticamente los endpoints nuevos que aporte cada fase futura, sin escribir código adicional.
- `docs/MULTITENANCY.md` escrito y considerado normativo.

## 9. Pruebas y validaciones requeridas

- Introducir deliberadamente una consulta sin filtro de tenant y comprobar que la batería falla.
- Quitar deliberadamente la RLS de una tabla y comprobar que la batería falla.
- Cobertura del 100 % de los endpoints existentes en el barrido.

## 10. Documentación que debe actualizar al terminar (ritual de cierre)

1. Ejecutar `pnpm verify` (tipos, lint, unitarias, integración, batería de aislamiento, pruebas de arquitectura). Sin excepción.
2. Actualizar `docs/PROJECT_STATE.md`: marcar esta fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
3. Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md` (solo el apartado de esta fase).
4. Escribir un ADR en `docs/decisions/` si se tomó alguna decisión que otras fases deban respetar.
5. Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
6. Un commit con mensaje `feat(phase-06): ...` y un resumen de cinco líneas de lo entregado.

## 11. Condiciones que obligan a detenerse y consultar antes de continuar

- Si el trabajo exige tocar un módulo **congelado** (`tenancy`, `iam`, `audit` desde la fase 06) fuera de lo que su interfaz pública ya permite.
- Si aparece la necesidad de rediseñar algo que una fase anterior dio por cerrado.
- Si el alcance de esta fase no basta para completarla sin salirse de su lista blanca.
- Si se detecta una fuga de aislamiento entre negocios no contemplada por la batería de la fase 06.
  En cualquiera de estos casos: **no improvisar**. Detenerse, escribir la propuesta como ADR en borrador bajo `docs/decisions/` y devolver la decisión antes de continuar.
