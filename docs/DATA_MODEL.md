# Modelo de datos

<!-- tope: 40 líneas por módulo -->

Un apartado por módulo: tablas, campos clave, relaciones. Un agente lee solo su apartado y los de sus dependencias. Esquema real: `packages/db/prisma/schema/`.

## tenancy (fase 02)

Archivo: `packages/db/prisma/schema/tenancy.prisma`

| Tabla               | Nivel      | Campos clave                                                  | Relaciones                                                   |
| ------------------- | ---------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| `businesses`        | tenant     | `id` (raíz del tenant), `slug` único, `status`                | 1—N `branches`, 1—1 `business_settings`, 1—N `subscriptions` |
| `branches`          | tenant     | `id`, `business_id`, `code` (único por negocio)               | N—1 `businesses`                                             |
| `business_settings` | tenant     | `id`, `business_id` (único), `currency`, `timezone`, `tax_id` | 1—1 `businesses`                                             |
| `platform_users`    | plataforma | `id`, `email` único, `role` (`SUPERADMIN`)                    | —                                                            |
| `plans`             | plataforma | `id`, `code` único, `price_cents`                             | 1—N `subscriptions`                                          |
| `subscriptions`     | tenant     | `id`, `business_id`, `plan_id`, `status`                      | N—1 `businesses`, N—1 `plans`                                |

Notas:

- `businesses` es la raíz del tenant: su RLS se filtra por su propio `id`, no por una columna `business_id`.
- `platform_users` y `plans` no llevan `business_id`: pertenecen al reino de plataforma (regla 2 de `CLAUDE.md`) y su RLS exige `current_setting('app.realm') = 'platform'`.
- `platform_users`/`plans`/`subscriptions` son esqueleto: sin autenticación, sin flujo de alta de negocio ni de suscripción real hasta las fases 03–04.
- IDs con `gen_random_uuid()` a nivel de base de datos (deuda aceptada: el UUIDv7 generado en cliente que exige la regla 3 de `CLAUDE.md` llega con el sobre de comando completo en la fase 05, según ya preveía `docs/API_CONVENTIONS.md`).

<!-- Plantilla de apartado (copiar al agregar un módulo):

## <modulo>  (fase NN)

Archivo: `packages/db/prisma/schema/<modulo>.prisma`

| Tabla | Nivel | Campos clave | Relaciones |
| ----- | ----- | ------------ | ---------- |

Notas: reglas de negocio que el esquema no expresa (inmutabilidad, solo-añadir, etc.).
-->
