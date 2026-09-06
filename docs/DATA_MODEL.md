# Modelo de datos

<!-- tope: 40 líneas por módulo -->

Un apartado por módulo: tablas, campos clave, relaciones. Un agente lee solo su apartado y los de sus dependencias. Esquema real: `packages/db/prisma/schema/`.

## Estado

**Fase 01: no existen tablas.** El esquema Prisma contiene solo `generator` y `datasource`. Las primeras tablas (`businesses`, `branches`, `business_settings`, `platform_users`, `plans`, `subscriptions`) llegan en la fase 02, junto con RLS y la convención de `business_id`.

<!-- Plantilla de apartado (copiar al agregar un módulo):

## <modulo>  (fase NN)

Archivo: `packages/db/prisma/schema/<modulo>.prisma`

| Tabla | Nivel | Campos clave | Relaciones |
| ----- | ----- | ------------ | ---------- |

Notas: reglas de negocio que el esquema no expresa (inmutabilidad, solo-añadir, etc.).
-->
