# Plan de desarrollo — POS SaaS multi-tenant para bares

> Hoja de ruta maestra. Este documento define **qué** se construye y **en qué orden**.
> No contiene código. Cada fase se ejecuta como una tarea independiente.

**Decisiones fijadas:** NestJS + TypeScript · PostgreSQL 16 con Row Level Security · React + Vite (PWA, tablet-first) · despliegue en Coolify con servicios separados · offline-first en el flujo de venta · impresión mediante agente local ESC/POS.

---

## Índice

1. [Arquitectura tecnológica](#1-arquitectura-tecnológica)
2. [Modelo SaaS y aislamiento multi-tenant](#2-modelo-saas-y-aislamiento-multi-tenant)
3. [Jerarquía Plataforma → Negocio → Sucursal → Operación](#3-jerarquía)
4. [Catálogo del negocio con configuración por sucursal](#4-catálogo-del-negocio-con-configuración-por-sucursal)
5. [Estrategia offline-first](#5-estrategia-offline-first)
6. [Mapa general de módulos](#6-mapa-general-de-módulos)
7. [Las 26 fases](#7-las-26-fases)
8. [Dependencias entre fases](#8-dependencias-entre-fases)
9. [Documentación mínima del repositorio](#9-documentación-mínima-del-repositorio)
10. [Ejecutar una sola fase por conversación](#10-ejecutar-una-sola-fase-por-conversación)

---

## 1. Arquitectura tecnológica

Un **monolito modular** en el backend, no microservicios. Los módulos tienen fronteras estrictas dentro de un mismo proceso, de forma que más adelante se pueda extraer uno (reportes, impresión, facturación) sin reescribir el resto. Lo que sí se separa desde el día uno son los **servicios de despliegue** en Coolify, porque eso es lo que permite actualizar, escalar y reiniciar cada pieza de forma independiente.

### Servicios desplegados en Coolify

| Servicio      | Tipo            | Descripción                                                                                                                            |
| ------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `pos-api`     | Aplicación      | NestJS + TypeScript. Lógica de negocio, autenticación, WebSocket gateway. Sin estado, escala horizontalmente.                          |
| `pos-worker`  | Aplicación      | Misma imagen que la API, distinto comando. Consume colas BullMQ: impresión, reportes, cierres, correos.                                |
| `pos-web`     | Aplicación      | React + Vite compilado, servido por Nginx. PWA instalable en tabletas. Solo estáticos.                                                 |
| `postgres`    | Base de datos   | PostgreSQL 16. Fuente de verdad única. RLS activo. Respaldos desde Coolify.                                                            |
| `redis`       | Infraestructura | Colas BullMQ, adaptador de WebSocket entre instancias, rate limiting. **No** se usa como caché al inicio.                              |
| `minio`       | Infraestructura | Compatible S3. Imágenes de producto, logotipos, PDF de reportes. Se introduce en la fase 09, no antes.                                 |
| `print-agent` | En sitio        | Servicio Node en la sucursal. Se conecta **hacia afuera** por WebSocket, recibe trabajos ESC/POS. No requiere abrir puertos en el bar. |

### Elecciones y por qué

| Capa            | Elección                        | Razón                                                                                                                                                                                                         |
| --------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend         | NestJS 11 + TypeScript          | Modularidad explícita por diseño: cada módulo es una carpeta con su controlador, servicio y DTOs. Es exactamente la frontera que necesita un agente para trabajar una fase sin leer el resto del repositorio. |
| ORM             | Prisma                          | Esquema declarativo legible, migraciones versionadas, tipos generados. Se divide por módulo con `prismaSchemaFolder` para que una fase toque un solo archivo.                                                 |
| Base de datos   | PostgreSQL 16                   | Transacciones serias para cobros y cortes, RLS nativa para el aislamiento, `jsonb` para configuración flexible por negocio.                                                                                   |
| Frontend        | React 19 + Vite + TypeScript    | PWA instalable: funciona en tabletas Android e iPad sin tiendas de aplicaciones. Compila a estáticos, despliegue trivial y reversible.                                                                        |
| Estado de datos | TanStack Query + Dexie          | Query maneja caché e invalidación; Dexie (IndexedDB) es el almacén local del motor offline. Se evita Redux: el estado del POS es casi todo estado de servidor.                                                |
| UI              | Tailwind + shadcn/ui            | Componentes en el propio repositorio. Objetivos táctiles grandes desde el sistema de diseño, no como parche.                                                                                                  |
| Contratos       | Zod + paquete compartido        | Los esquemas viven en `packages/contracts` y son la única fuente de verdad de la API. El frontend nunca lee código del backend.                                                                               |
| Tiempo real     | Socket.IO + adaptador Redis     | Dos meseros sobre la misma cuenta, cronómetros de billar, avisos de cocina. Sin esto el POS se siente roto con más de una tableta.                                                                            |
| Colas           | BullMQ                          | Impresión con reintentos, reportes, cierres. Un trabajo de impresión que falla no puede tumbar un cobro.                                                                                                      |
| Pruebas         | Vitest + Supertest + Playwright | Unitarias e integración contra PostgreSQL efímera en Docker; Playwright solo para flujos críticos (cobrar, cortar caja, sincronizar).                                                                         |
| Observabilidad  | Pino + OpenTelemetry            | Logs estructurados con `businessId` y `requestId` en cada línea desde la fase 01. Sin esto, depurar el problema de un solo negocio es imposible.                                                              |

### Estructura del repositorio

Monorepo con pnpm workspaces y Turborepo. La razón no es la moda: los contratos compartidos entre API y web eliminan la necesidad de que un agente lea las dos mitades del sistema al mismo tiempo.

```
apps/api            NestJS. Un módulo por dominio bajo src/modules/
apps/web            React. Una carpeta por dominio bajo src/features/ (espejo del backend)
apps/print-agent    Servicio de impresión en sitio
packages/contracts  Esquemas Zod, tipos y constantes de permisos. Frontera entre aplicaciones
packages/db         Esquema Prisma dividido por módulo, migraciones, semillas
docs/               Documentación mínima (sección 9). Es parte del producto, no un extra
deploy/             Dockerfiles y plantillas de variables de entorno por servicio
```

### Lo que deliberadamente NO entra ahora

Kafka o cualquier bus de eventos, GraphQL, Kubernetes, microservicios separados por dominio, Elasticsearch y un motor de facturación fiscal. Todos son extraíbles después precisamente porque el monolito es modular. Meterlos al inicio multiplicaría el costo de cada fase sin aportar nada a un bar.

---

## 2. Modelo SaaS y aislamiento multi-tenant

### Estrategia: base compartida, esquema compartido, aislamiento en tres capas

Todos los negocios viven en la misma base de datos y en el mismo esquema, discriminados por una columna `business_id` presente en **toda** tabla operativa.

- Se descarta **un esquema por negocio** porque con cientos de negocios cada migración se vuelve un proceso frágil de horas.
- Se descarta **una base por negocio** porque haría inviable el despliegue único en Coolify.
- Queda una vía de escape: como todo acceso pasa por el resolvedor de contexto, un negocio grande puede moverse a su propia base más adelante sin tocar los módulos de dominio.

Lo que hace segura esta decisión es que el aislamiento **no depende de que alguien recuerde poner un `where`**. Se aplican tres capas independientes, y ninguna sustituye a las otras:

| Capa                       | Dónde vive       | Qué garantiza                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 · Row Level Security** | PostgreSQL       | Cada tabla operativa tiene una política `USING (business_id = current_setting('app.business_id')::uuid)`. La API se conecta con un rol que **no** es dueño de las tablas y por tanto no puede saltarse la política. Una consulta sin filtro simplemente no devuelve filas ajenas. Es la red de seguridad real. |
| **2 · Contexto de tenant** | NestJS           | Un interceptor resuelve negocio y sucursal desde el token, los guarda en `AsyncLocalStorage` y abre cada transacción con `SET LOCAL app.business_id`. Una extensión del cliente Prisma inyecta además `business_id` en cada creación y en cada filtro.                                                         |
| **3 · Autorización**       | Guards de NestJS | Verifica pertenencia al negocio, permiso solicitado y que la sucursal del recurso esté entre las autorizadas. Devuelve **404, no 403**, ante recursos de otro negocio: no se confirma su existencia.                                                                                                           |

> **Regla estructural innegociable.** Ninguna consulta operativa se ejecuta fuera de una transacción con contexto de tenant establecido. Se prohíbe el uso directo del cliente Prisma crudo en módulos de dominio; existe un solo punto de escape auditado, usado exclusivamente por el módulo de plataforma, y toda invocación queda registrada. Una prueba automatizada de la fase 06 falla la compilación si aparece una tabla operativa sin RLS o sin columna `business_id`.

### Dos reinos de identidad, separados

El SUPERADMIN **no** es un rol dentro de la tabla de usuarios con un permiso extra. Vive en una tabla distinta, con su propio flujo de inicio de sesión, su propio dominio o subruta, su propio tipo de token y segundo factor obligatorio. Esta separación es lo que hace que una escalada de privilegios dentro de un negocio no pueda convertirse nunca en acceso a la plataforma.

| Reino          | Tabla            | Alcance                                 | Acceso a datos operativos                                                                                                                                                                                             |
| -------------- | ---------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plataforma** | `platform_users` | Toda la instalación                     | Solo metadatos: negocios, planes, estado de cuenta, uso agregado. Entrar a los datos de un negocio requiere una sesión de suplantación explícita, con vigencia limitada y registrada en la auditoría **del negocio**. |
| **Negocio**    | `users`          | Un negocio y sus sucursales autorizadas | Completo dentro de su negocio, limitado por rol y por sucursal. Cero visibilidad hacia otros negocios o hacia la plataforma.                                                                                          |

### Permisos: roles como datos, no como código

Los roles no se codifican en un `enum`. Un rol es una fila que pertenece a un negocio y contiene una lista de permisos. La plataforma siembra seis roles de sistema al crear cada negocio —propietario, gerente, encargado, cajero, mesero, empleado— y a partir de ahí el negocio los edita o crea los suyos sin que nadie toque código.

- Un **permiso** es una constante con forma `recurso.acción`: `orders.void`, `cash.close_shift`, `products.manage`, `reports.view_sales`. El catálogo completo vive en `packages/contracts` y es lo único que un agente necesita leer para saber qué permisos existen.
- Cada permiso declara un **alcance**: de negocio o de sucursal. Un permiso de sucursal solo aplica sobre las sucursales asignadas al usuario.
- Un usuario tiene un rol por negocio, más **concesiones directas** opcionales que suman o restan permisos puntuales sin crear un rol nuevo.
- Existen **permisos de autorización en el momento**: cancelar una línea ya impresa puede exigir que un supervisor introduzca su PIN en la misma tableta. Se resuelve como un token efímero de elevación, y el evento de auditoría guarda **quién autorizó**, no solo quién ejecutó.

---

## 3. Jerarquía

```
Plataforma SaaS
   └── Negocio (tenant)
         └── Sucursal
               └── Operación
```

| Nivel          | Entidades                                                                                                             | Nota                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plataforma** | `platform_users`, `plans`, `subscriptions`, `platform_audit_log`                                                      | No tiene `business_id` porque está por encima de él. Único territorio del SUPERADMIN.                                                        |
| **Negocio**    | `businesses`, `users`, `roles`, `categories`, `products`, `payment_methods`, `tax_settings`, `business_settings`      | Todo lo que se configura una sola vez. Frontera de aislamiento: lo que está debajo lleva su `business_id`.                                   |
| **Sucursal**   | `branches`, `branch_products`, `areas`, `tables`, `printers`, `stock`, `cash_registers`                               | Todo lo que varía entre locales. Un negocio con una sola sucursal usa el mismo modelo: se crea automáticamente y la interfaz no la menciona. |
| **Operación**  | `shifts`, `orders`, `order_items`, `payments`, `cash_movements`, `inventory_movements`, `table_sessions`, `audit_log` | Todo lleva `business_id` **y** `branch_id`: el primero para el aislamiento, el segundo para el alcance y los reportes.                       |

### Usuarios y acceso a sucursales

- Un usuario pertenece a **un negocio**. Si la misma persona trabaja en dos negocios distintos de la plataforma, son dos usuarios; el correo puede repetirse entre negocios, pero es único dentro de cada uno.
- El acceso a sucursales se modela con una tabla explícita `user_branches`, más una bandera `all_branches` para propietarios y gerentes generales. Así, dar de alta una sucursal nueva no obliga a repartir permisos otra vez.
- La sesión activa siempre lleva una sucursal seleccionada. Cambiar de sucursal es un cambio de contexto explícito que reemite el token, no un filtro de interfaz.
- Un administrador de negocio administra sus usuarios, roles y accesos por completo, y no tiene ninguna vía —ni de interfaz ni de API— para ver que existen otros negocios.

---

## 4. Catálogo del negocio con configuración por sucursal

El catálogo pertenece al negocio; la operación pertenece a la sucursal. Se resuelve con dos tablas y una regla de resolución, **no** con catálogos duplicados: duplicar parece más simple al inicio y se vuelve inmanejable en cuanto el negocio quiere cambiar el nombre de un producto en todos sus locales.

| Tabla              | Nivel    | Contiene                                                                                                                                                      |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `categories`       | Negocio  | Nombre, orden, color, categoría padre opcional.                                                                                                               |
| `products`         | Negocio  | Identidad: nombre, SKU, categoría, tipo (simple, compuesto, tarificado por tiempo), unidad, impuestos, **precio base**, imagen.                               |
| `product_variants` | Negocio  | Presentaciones del mismo producto: copa, media, botella. Cada una con su precio base y su relación con el inventario.                                         |
| `modifier_groups`  | Negocio  | Grupos de opciones con mínimo y máximo de selección.                                                                                                          |
| `branch_products`  | Sucursal | Únicamente las **diferencias**: `price_override`, `is_active`, `is_available`, impresora destino, orden en pantalla. Si no hay fila, la sucursal hereda todo. |
| `stock`            | Sucursal | Existencias. Nunca a nivel de negocio: el inventario es físico y lo físico está en un lugar.                                                                  |

### Regla de resolución del precio efectivo

```
precio_efectivo = lista_de_precios_activa
               ?? branch_products.price_override
               ?? variante.precio_base
               ?? producto.precio_base
```

- **Activo** y **disponible** son cosas distintas y se necesitan las dos. _Activo_ es una decisión administrativa que se mantiene en el tiempo; _disponible_ es que se acabó esta noche y el mesero lo apaga desde la tableta con un toque. Confundirlas obliga después a una migración dolorosa.
- Las **listas de precios** (happy hour, fin de semana, precio por área) se introducen en la fase 10 y se colocan al principio de la cadena, de modo que agregarlas no rompe nada.
- Toda línea de cuenta **congela** precio, nombre e impuestos en el momento de la captura. Un cambio de precio a las 11 de la noche jamás debe alterar una cuenta abierta ni un ticket ya emitido.

---

## 5. Estrategia offline-first

El bar debe poder seguir vendiendo si se cae el internet. Eso no se resuelve al final: se resuelve decidiendo desde el principio la **forma** de la API. Por eso el contrato de comandos idempotentes se establece en la **fase 05**, mucho antes de que exista el motor de sincronización de la **fase 20**.

### Reglas de diseño que rigen desde la fase 05

- **Identificadores generados en el cliente.** Toda entidad operativa usa UUIDv7 creado en la tableta. El servidor nunca asigna el identificador de una orden. Esto elimina la clase entera de problemas de reconciliación.
- **Toda mutación es un comando con clave de idempotencia.** Reenviarlo diez veces produce el mismo resultado que enviarlo una vez. El servidor guarda las claves procesadas 72 horas.
- **Cambios expresados como deltas, no como estados absolutos.** «Suma dos cervezas» se fusiona; «la cuenta ahora tiene cinco cervezas» sobrescribe el trabajo de otro mesero. Las líneas de cuenta son un registro de sumas y restas, no un contador editable.
- **Reloj de la sucursal, no del servidor.** Cada comando lleva la marca de tiempo del dispositivo y un número de secuencia monótono por dispositivo. El servidor guarda ambos y su propia hora de recepción.
- **Frontera explícita de lo que funciona sin red.**
  - _Sin conexión:_ abrir cuenta, capturar consumo, cobrar en efectivo, imprimir en la impresora local, cronómetros de billar.
  - _Requieren conexión:_ cierre de turno y corte de caja, pagos con terminal, cambios de catálogo, altas de usuario, reportes y todo el panel de administración.
  - Esta frontera se documenta y **se muestra en la interfaz**: un cajero necesita saber qué puede y qué no puede hacer en ese momento.
- **Un turno no cierra con comandos pendientes.** El corte de caja exige bandeja de salida vacía. Es la barrera de consistencia que evita que el dinero cuadre mal.

> **Consecuencia para el orden de las fases:** las fases 14 a 19 construyen la operación en línea, pero obedeciendo estas reglas. La fase 20 implementa el motor local sobre una API ya preparada. Al revés habría que reescribir todos los módulos operativos.

---

## 6. Mapa general de módulos

| Módulo                | `apps/api/src/modules/` | `apps/web/src/features/` | Fase       |
| --------------------- | ----------------------- | ------------------------ | ---------- |
| platform              | `platform`              | `platform`               | 02, 25     |
| tenancy               | `tenancy`               | —                        | 02         |
| auth                  | `auth`                  | `auth`                   | 03         |
| iam (roles, permisos) | `iam`                   | `settings/users`         | 04, 08     |
| audit                 | `audit`                 | `audit`                  | 05, 24     |
| businesses            | `businesses`            | `settings/business`      | 02, 08     |
| branches              | `branches`              | `settings/branches`      | 02, 08     |
| catalog               | `catalog`               | `catalog`                | 09, 10, 11 |
| floor (áreas, mesas)  | `floor`                 | `floor`                  | 12         |
| shifts                | `shifts`                | `shifts`                 | 13         |
| orders                | `orders`                | `pos`                    | 14, 15     |
| timing (billar)       | `timing`                | `pos/timing`             | 16         |
| payments              | `payments`              | `pos/checkout`           | 17         |
| printing              | `printing`              | `settings/printing`      | 18         |
| cash                  | `cash`                  | `cash`                   | 19         |
| sync                  | `sync`                  | `sync` (motor local)     | 20         |
| inventory             | `inventory`             | `inventory`              | 21, 22     |
| reports               | `reports`               | `reports`                | 23         |

> **Módulos congelados a partir de la fase 06:** `tenancy`, `iam` y `audit`. Todas las fases los consumen; ninguna los modifica sin un ADR nuevo.

---

## 7. Las 26 fases

Cada fase está dimensionada para entregarse a un agente como tarea independiente: toca un conjunto acotado de carpetas, tiene un criterio de terminación verificable y termina con el repositorio en estado desplegable. **Ninguna fase depende de una posterior.**

---

### BLOQUE A — Fundamentos de plataforma

_Seis fases sin una sola pantalla de POS. Todo lo que se construya después descansa aquí, y corregir estas decisiones más tarde significa reescribir el sistema._

---

#### Fase 01 — Andamiaje del monorepo y despliegue en Coolify

**Objetivo.** Dejar un esqueleto vacío pero desplegado y funcionando de extremo a extremo, para que ninguna fase posterior descubra problemas de infraestructura.

**Componentes.**

- Monorepo pnpm + Turborepo con las cuatro áreas: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`.
- NestJS con un solo endpoint `/health` que verifica PostgreSQL y Redis.
- React + Vite que consume ese endpoint y muestra el estado.
- Dockerfiles multi-etapa por aplicación y plantillas `.env.example`.
- ESLint, Prettier, TypeScript estricto, Vitest, hooks de pre-commit.
- Pipeline de CI: lint, tipos, pruebas, build.
- Logs estructurados con Pino y `requestId`.

**Módulos y rutas.** Raíz del repositorio, `deploy/`, esqueletos de las cuatro áreas, `docs/` con los archivos de la sección 9 creados con su plantilla.

**Depende de.** Nada.

**Debe quedar funcionando.**

- Cinco servicios corriendo en Coolify: api, worker, web, postgres, redis.
- La web muestra en producción el estado de salud real de la API.
- `pnpm dev` levanta todo el entorno local con Docker Compose.

**Validación.**

- Visitar la URL pública y ver los tres servicios en verde.
- Reiniciar únicamente el servicio de la API en Coolify y comprobar que la web sigue sirviéndose.
- CI en verde sobre una rama nueva.

**No desarrollar todavía.** Nada de autenticación, modelo de datos, tablas de negocio, MinIO, WebSocket ni interfaz real. Si esta fase toma más de un día, se está construyendo de más.

---

#### Fase 02 — Núcleo multi-tenant y aislamiento en base de datos

**Objetivo.** Establecer la frontera del tenant como una propiedad de la base de datos, antes de que exista cualquier dato operativo que pueda filtrarse.

**Componentes.**

- Tablas `businesses`, `branches`, `business_settings` y el esqueleto de `platform_users`, `plans`, `subscriptions`.
- Dos roles de PostgreSQL: uno dueño para migraciones, uno de aplicación **sin** `BYPASSRLS`.
- Políticas RLS y una convención de migración que las aplica automáticamente a toda tabla nueva con `business_id`.
- `TenantContext` sobre `AsyncLocalStorage` y `TenantPrismaService` que abre transacciones con `SET LOCAL`.
- Extensión del cliente Prisma que inyecta `business_id` en creaciones y filtros.
- Un único punto de escape auditado para el reino de plataforma.
- Semillas: dos negocios ficticios con dos sucursales cada uno.

**Módulos y rutas.** `packages/db/prisma/`, `apps/api/src/modules/tenancy/`, `businesses/`, `branches/`, `platform/` (solo entidades).

**Depende de.** 01

**Debe quedar funcionando.**

- Consultas contra el negocio A que no devuelven jamás filas del negocio B, aun omitiendo el filtro a propósito.
- Endpoints internos de lectura y escritura de negocios y sucursales, usando por ahora una cabecera de identidad simulada.
- Migraciones reproducibles desde cero.

**Validación.**

- Prueba de integración que ejecuta `findMany` sin filtro bajo el contexto de A y afirma cero filas de B.
- Prueba que confirma que el rol de aplicación recibe error al intentar `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`.
- Prueba que recorre el catálogo de tablas y falla si alguna tabla operativa carece de RLS.

**No desarrollar todavía.** Usuarios reales, inicio de sesión, roles, permisos, interfaz, y ningún módulo operativo.

---

#### Fase 03 — Identidad y autenticación

**Objetivo.** Que un usuario real pueda iniciar sesión y que cada petición lleve un contexto de negocio verificable, sin todavía decidir qué puede hacer.

**Componentes.**

- Tabla `users` con unicidad de correo **por negocio**, y `user_branches` con bandera `all_branches`.
- Contraseñas con Argon2id; PIN numérico corto e independiente para acceso rápido en tableta.
- JWT de acceso corto + token de refresco rotatorio persistido, con revocación por dispositivo.
- Reclamaciones del token: `userId`, `businessId`, `branchId` activo, `roleId`, versión de permisos.
- Reino de plataforma separado: tabla, ruta de inicio de sesión y tipo de token distintos, con segundo factor obligatorio.
- Rate limiting de intentos de acceso apoyado en Redis.
- Endpoint de cambio de sucursal activa que reemite el token.

**Módulos y rutas.** `apps/api/src/modules/auth/`, ampliación de `tenancy/` para leer del token en lugar de la cabecera simulada, `packages/db`, `packages/contracts/auth`.

**Depende de.** 02

**Debe quedar funcionando.**

- Inicio de sesión con correo y contraseña, y con PIN, devolviendo tokens válidos.
- El contexto de tenant se deriva exclusivamente del token; la cabecera simulada queda eliminada.
- Cambio de sucursal activa y cierre de sesión por dispositivo.

**Validación.**

- Un token del negocio A no abre ningún recurso del negocio B.
- Manipular el `businessId` del token invalida la firma.
- Un token de plataforma es rechazado en rutas de negocio y viceversa.
- Cambiar a una sucursal no autorizada devuelve 403.

**No desarrollar todavía.** Roles y permisos, invitaciones por correo, recuperación de contraseña, y cualquier pantalla. El inicio de sesión se prueba por API.

---

#### Fase 04 — Roles, permisos y alcance por sucursal

**Objetivo.** Convertir la autorización en un mecanismo declarativo que toda fase posterior use sin volver a pensarlo.

**Componentes.**

- Catálogo completo de permisos en `packages/contracts/permissions.ts`, cada uno con su alcance (negocio o sucursal).
- Tablas `roles` (por negocio) y `user_permission_grants` para concesiones y revocaciones puntuales.
- Semilla de los seis roles de sistema al crear un negocio: propietario, gerente, encargado, cajero, mesero, empleado.
- Decorador `@RequirePermission()` y guard que resuelve permiso + pertenencia + alcance de sucursal.
- Mecanismo de **elevación por PIN de supervisor**: token efímero que autoriza una acción concreta y registra quién autorizó.
- Endpoint `/me/permissions` que el frontend usa para pintar la interfaz.

**Módulos y rutas.** `apps/api/src/modules/iam/`, `packages/contracts/permissions.ts`, `packages/db`.

**Depende de.** 02, 03

**Debe quedar funcionando.**

- Un endpoint protegido responde según el rol del usuario y sus sucursales.
- CRUD de roles personalizados dentro de un negocio.
- Flujo de elevación por PIN operativo de extremo a extremo por API.

**Validación.**

- Matriz de pruebas rol × endpoint que cubre los seis roles sembrados.
- Un mesero con acceso solo a la sucursal 1 recibe 404 sobre recursos de la sucursal 2 del mismo negocio.
- Una revocación puntual gana sobre el permiso del rol.
- El token de elevación caduca y no es reutilizable.

**No desarrollar todavía.** La interfaz de administración de usuarios (fase 08) y los permisos de módulos que aún no existen: se declaran las constantes, no se implementan sus endpoints.

---

#### Fase 05 — Auditoría, comandos idempotentes y convenciones de la API

**Objetivo.** Fijar la forma que tendrá toda mutación del sistema, de modo que el motor offline de la fase 20 no obligue a reescribir nada.

**Componentes.**

- Tabla `audit_log` solo-añadir, particionada por mes, con actor, actor autorizante, acción, entidad, antes y después, dispositivo, IP.
- Servicio de auditoría e interceptor declarativo `@Audited()`.
- Tabla `idempotency_keys` y middleware que exige la cabecera en toda mutación, guarda la respuesta y la reproduce ante un reenvío.
- Convenciones de la API: envoltura de errores, paginación por cursor, versionado, códigos de error tipados en contratos.
- UUIDv7 generado en cliente para toda entidad operativa; el servidor valida forma y unicidad.
- Documento `docs/API_CONVENTIONS.md` y OpenAPI generado automáticamente.

**Módulos y rutas.** `apps/api/src/modules/audit/`, `apps/api/src/common/`, `packages/contracts/`, `docs/API_CONVENTIONS.md`.

**Depende de.** 02, 03, 04

**Debe quedar funcionando.**

- Toda mutación existente escribe su evento de auditoría automáticamente.
- Reenviar una mutación con la misma clave devuelve la respuesta original sin duplicar efectos.
- OpenAPI publicado y sincronizado con los contratos.

**Validación.**

- Enviar el mismo comando cincuenta veces en paralelo y comprobar un solo efecto.
- Intentar un `UPDATE` o `DELETE` sobre `audit_log` y recibir error de la base de datos.
- Prueba de arquitectura que falla si un endpoint de mutación carece de auditoría o de idempotencia.

**No desarrollar todavía.** El motor de sincronización, la bandeja de salida del cliente y el visor de auditoría. Aquí solo el cimiento del servidor.

---

#### Fase 06 — Batería de pruebas de aislamiento y congelación del núcleo

**Objetivo.** Demostrar que no hay fugas entre negocios y dejar una red de seguridad que se ejecutará en cada fase posterior. **Esta fase es una puerta: no se avanza sin ella.**

**Componentes.**

- Utilería de pruebas que crea dos negocios completos con datos idénticos y usuarios en cada uno.
- **Barrido automático de endpoints**: recorre el OpenAPI y, para cada ruta, intenta acceder con un token del otro negocio esperando 404.
- Pruebas de fuga por identificador: sustituir un UUID propio por uno ajeno en cuerpo, ruta y parámetros.
- Pruebas de fuga por relaciones anidadas y por filtros de búsqueda y ordenamiento.
- Pruebas de fuga en el token: alteración de reclamaciones, token de otro negocio, token caducado, token de plataforma.
- Prueba a nivel de base de datos con el rol de aplicación y RLS activo.
- Prueba de arquitectura que prohíbe importar el cliente Prisma crudo fuera de `tenancy/`.
- Congelación documentada de `tenancy`, `iam` y `audit`.

**Módulos y rutas.** `apps/api/test/isolation/`, `apps/api/test/architecture/`, `docs/MULTITENANCY.md`, configuración de CI.

**Depende de.** 02, 03, 04, 05

**Debe quedar funcionando.**

- `pnpm test:isolation` como comando de una sola línea, obligatorio en CI.
- El barrido cubre automáticamente los endpoints nuevos que aporte cada fase futura, sin escribir código adicional.
- `docs/MULTITENANCY.md` escrito y considerado normativo.

**Validación.**

- Introducir deliberadamente una consulta sin filtro de tenant y comprobar que la batería falla.
- Quitar deliberadamente la RLS de una tabla y comprobar que la batería falla.
- Cobertura del 100 % de los endpoints existentes en el barrido.

**No desarrollar todavía.** Cualquier funcionalidad nueva. Esta fase no agrega producto: agrega certeza.

---

### BLOQUE B — Aplicación base

_La primera interfaz. Se construye sobre un núcleo ya cerrado, así que ninguna pantalla queda condicionada por decisiones pendientes._

---

#### Fase 07 — Shell del frontend, sistema de diseño y cliente de API

**Objetivo.** Dejar una aplicación instalable en tableta donde un usuario real inicia sesión, elige sucursal y navega, con el sistema de diseño ya definido.

**Componentes.**

- Cliente de API tipado generado desde `packages/contracts`, con manejo de refresco de token e inyección automática de la clave de idempotencia.
- Enrutado, rutas protegidas por permiso, y componente `<Can permission="...">` para ocultar acciones no permitidas.
- Sistema de diseño orientado a tableta: objetivos táctiles de 44 px como mínimo, tipografía legible a un brazo de distancia, modo oscuro para barras con poca luz, retroalimentación háptica.
- Estructura de aplicación: barra lateral, selector de sucursal, menú de usuario, indicador de estado de conexión (presente aunque aún no haya motor offline).
- Pantallas de inicio de sesión por contraseña y por PIN.
- PWA: manifiesto, service worker, instalación en pantalla de inicio, bloqueo de rotación y de gestos de retroceso accidentales.
- Internacionalización con español como idioma base y formato de moneda por negocio.

**Módulos y rutas.** `apps/web/src/app/`, `src/components/ui/`, `src/lib/api/`, `src/features/auth/`, `src/features/shell/`.

**Depende de.** 03, 04, 05

**Debe quedar funcionando.**

- Iniciar sesión, cambiar de sucursal y cerrar sesión desde una tableta real.
- La aplicación se instala en la pantalla de inicio y abre a pantalla completa.
- Los elementos de interfaz sin permiso no se renderizan.

**Validación.**

- Prueba manual en una tableta física de diez pulgadas y en un teléfono.
- Prueba Playwright del flujo de inicio de sesión y cambio de sucursal.
- Auditoría de contraste y de tamaño de objetivos táctiles.

**No desarrollar todavía.** Pantallas de POS, catálogo o administración. Solo el armazón, el sistema de diseño y la autenticación.

---

#### Fase 08 — Administración del negocio

**Objetivo.** Que el propietario de un negocio pueda dar de alta sus sucursales, su equipo y sus roles sin intervención técnica.

**Componentes.**

- Configuración del negocio: nombre, logotipo, moneda, zona horaria, formato fiscal, hora de corte del día operativo.
- CRUD de sucursales con dirección, teléfono, zona horaria propia y horario.
- Gestión de usuarios: alta, edición, desactivación, asignación de rol, asignación de sucursales, restablecimiento de PIN.
- Invitaciones por correo con token de un solo uso, y flujo de recuperación de contraseña.
- Editor de roles personalizados con el catálogo de permisos agrupado por módulo.
- Asistente de creación de negocio: al crearse, se genera automáticamente una sucursal principal y el rol de propietario.

**Módulos y rutas.** `apps/web/src/features/settings/`, `apps/api/src/modules/businesses/`, `branches/`, `iam/`; servicio de correo transaccional en `common/`.

**Depende de.** 04, 07

**Debe quedar funcionando.**

- Un negocio nuevo se configura por completo desde la interfaz, con sus sucursales y su equipo.
- Un usuario invitado recibe el correo, define su contraseña y entra con el rol correcto.
- El administrador del negocio A no ve indicio alguno de que exista el negocio B.

**Validación.**

- Prueba Playwright: crear sucursal, invitar mesero, aceptar invitación, iniciar sesión con permisos limitados.
- La batería de aislamiento de la fase 06 cubre los nuevos endpoints y pasa.
- Auditoría: toda alta y baja de usuario aparece en `audit_log`.

**No desarrollar todavía.** Catálogo, mesas, impresoras ni configuración de módulos operativos. Cada módulo traerá su propia configuración en su fase.

---

### BLOQUE C — Catálogo

_Nada operativo puede construirse antes de saber qué se vende, a qué precio y en qué sucursal._

---

#### Fase 09 — Catálogo del negocio: categorías y productos

**Objetivo.** Un catálogo propio por negocio, sin ninguna noción de sucursal todavía, para fijar el modelo antes de complicarlo.

**Componentes.**

- Tablas `categories` (jerárquicas, ordenables, con color) y `products`.
- Tipos de producto desde el inicio: simple, compuesto y **tarificado por tiempo**, aunque el motor de tiempo llegue en la fase 16.
- Precio base, impuestos aplicables y unidad de venta.
- Subida de imágenes a MinIO con redimensionado en el worker; primera introducción del servicio S3.
- Interfaz de administración pensada para dar de alta cien productos sin desesperar: creación rápida, duplicado, edición por lotes, reordenamiento.
- Importación desde CSV con previsualización y validación.

**Módulos y rutas.** `apps/api/src/modules/catalog/`, `apps/web/src/features/catalog/`, `packages/db`, `common/storage/`, nuevo servicio MinIO en Coolify.

**Depende de.** 07, 08

**Debe quedar funcionando.**

- Alta, edición, archivado y reordenamiento de categorías y productos con imagen.
- Importación de un catálogo real de un bar desde CSV.
- El catálogo del negocio A es invisible e inalcanzable para el negocio B.

**Validación.**

- Cargar un catálogo de doscientos productos y medir el tiempo de respuesta de la lista.
- Prueba de aislamiento sobre productos, categorías e imágenes: una URL de imagen del negocio A no debe ser adivinable ni servible al negocio B.
- Archivar un producto no lo borra: se conserva para el histórico.

**No desarrollar todavía.** Precios por sucursal, disponibilidad, variantes, modificadores, inventario ni la pantalla de venta.

---

#### Fase 10 — Configuración por sucursal y resolución de precio efectivo

**Objetivo.** Permitir que las sucursales compartan el catálogo del negocio pero difieran en precio, disponibilidad y activación, con una única función de resolución que todo el sistema use.

**Componentes.**

- Tabla `branch_products` con solo las diferencias: `price_override`, `is_active`, `is_available`, orden en pantalla, impresora destino. La ausencia de fila significa herencia total.
- Servicio `PriceResolver` como único punto del sistema autorizado a calcular un precio.
- Tablas `price_lists` y `price_list_items` con vigencia por día y hora: happy hour, fin de semana, precio por área.
- Endpoint de **menú efectivo por sucursal** con etiqueta de versión, pensado para que la tableta lo cachee y, más adelante, lo guarde localmente.
- Interfaz de administración por sucursal y conmutador rápido de disponibilidad para el personal de piso.
- Edición masiva: aplicar un porcentaje a una categoría entera en una sucursal.

**Módulos y rutas.** `apps/api/src/modules/catalog/branch/`, `catalog/pricing/`, `apps/web/src/features/catalog/branch/`.

**Depende de.** 09

**Debe quedar funcionando.**

- El mismo producto con precio distinto en dos sucursales, resuelto correctamente.
- Una lista de precios de happy hour que se activa y se desactiva sola por horario.
- El endpoint de menú efectivo devuelve exactamente lo que el POS mostrará.

**Validación.**

- Tabla de casos de precio: sin override, con override, con lista vigente, con lista caducada, en el minuto exacto del cambio.
- Prueba de arquitectura: ningún módulo calcula precios fuera de `PriceResolver`.
- Cambiar la disponibilidad en la sucursal 1 no afecta a la sucursal 2.

**No desarrollar todavía.** Descuentos y promociones aplicados a una cuenta (fase 15), inventario y cualquier uso del precio dentro de una orden.

---

#### Fase 11 — Variantes, modificadores y grupos de opciones

**Objetivo.** Cerrar el catálogo con lo que un bar realmente necesita capturar: presentaciones, extras y notas.

**Componentes.**

- `product_variants`: copa, media, botella, litro. Cada una con su precio base, su override por sucursal y su propia relación futura con el inventario.
- `modifier_groups` y `modifiers` con mínimo y máximo de selección, obligatoriedad y precio adicional propio.
- Grupos reutilizables entre productos y grupos exclusivos de un producto.
- Productos compuestos y paquetes: un combo que descuenta sus componentes.
- Notas libres por línea con sugerencias frecuentes.
- Interfaz de configuración y previsualización de cómo se verá el producto en el POS.

**Módulos y rutas.** `apps/api/src/modules/catalog/variants/`, `catalog/modifiers/`, `apps/web/src/features/catalog/`.

**Depende de.** 09, 10

**Debe quedar funcionando.**

- Un whisky con tres presentaciones y un grupo de mezcladores, con precio efectivo correcto en cada combinación.
- El endpoint de menú efectivo entrega variantes y modificadores ya resueltos.

**Validación.**

- Casos de precio compuesto: variante + modificadores con costo + lista de precios vigente.
- Validación de mínimos y máximos de selección rechazada en el servidor, no solo en la interfaz.

**No desarrollar todavía.** La captura de estos elementos en una cuenta. Aquí solo se define y se administra.

---

### BLOQUE D — Operación del punto de venta

_El corazón del producto. Ocho fases en un orden que sigue el flujo real del dinero: primero dónde ocurre la venta, luego quién la abre, luego qué se consume, luego cómo se cobra y por último cómo se cuadra._

---

#### Fase 12 — Áreas, mesas y recursos de la sucursal

**Objetivo.** Modelar el espacio físico del bar, incluidas las mesas de billar como recurso tarificado por tiempo, sin todavía cobrarlas.

**Componentes.**

- `areas` por sucursal: terraza, barra, salón, zona de billar. Con impresora predeterminada y lista de precios asociada opcional.
- `tables` con número, capacidad, posición en el plano y tipo: `standard` o `timed`.
- Las mesas de billar son mesas `timed` vinculadas a un producto tarificado por tiempo del catálogo, con su tarifa por hora, fracción mínima y redondeo definidos allí.
- Estados de mesa: libre, ocupada, por cobrar, reservada, fuera de servicio.
- Editor visual del plano y vista de piso con el estado en vivo.
- Canal WebSocket por sucursal; primera introducción de Socket.IO con adaptador Redis.

**Módulos y rutas.** `apps/api/src/modules/floor/`, `apps/api/src/realtime/`, `apps/web/src/features/floor/`.

**Depende de.** 08, 09

**Debe quedar funcionando.**

- Configurar áreas y mesas de una sucursal desde la interfaz.
- Vista de piso que refleja cambios de estado en dos tabletas simultáneamente.
- Mesas de billar declaradas con su tarifa, todavía sin cronómetro.

**Validación.**

- Dos tabletas conectadas: cambiar el estado en una y verlo en la otra en menos de un segundo.
- Un cliente WebSocket del negocio A no recibe eventos del negocio B ni de otra sucursal.
- Reiniciar la API no pierde el estado de mesas: vive en la base de datos, no en memoria.

**No desarrollar todavía.** Cuentas, cronómetro de billar, cobro. El estado de la mesa aún se cambia manualmente.

---

#### Fase 13 — Turnos y sesiones de caja

**Objetivo.** Establecer el contenedor temporal al que pertenecerá cada venta. Ninguna orden puede existir fuera de un turno, y esto debe decidirse antes de crear la primera orden.

**Componentes.**

- `shifts` por sucursal: apertura, cierre, usuario responsable, fondo inicial declarado, estado.
- `cash_registers` (cajas físicas o lógicas) y `register_sessions`: una caja puede tener varias sesiones a lo largo de un turno con distintos cajeros.
- Concepto de **día operativo** configurable por negocio: un turno que abre el viernes a las 20:00 y cierra el sábado a las 4:00 pertenece al viernes. Sin esto, todos los reportes de un bar salen mal.
- Reglas de apertura y cierre: no se abre un turno si hay otro abierto en la misma caja; no se cierra con cuentas abiertas sin autorización explícita.
- Endpoints y pantallas de apertura y cierre básicas, con declaración de fondo.

**Módulos y rutas.** `apps/api/src/modules/shifts/`, `apps/web/src/features/shifts/`.

**Depende de.** 08, 12

**Debe quedar funcionando.**

- Abrir y cerrar un turno con fondo inicial, respetando permisos.
- El día operativo se calcula correctamente para turnos que cruzan la medianoche.
- Todas las fases siguientes tienen un `shiftId` al que colgarse.

**Validación.**

- Casos de turno que cruza medianoche, en distintas zonas horarias por sucursal.
- Intentar abrir dos turnos en la misma caja y recibir error.
- Auditoría completa de apertura y cierre.

**No desarrollar todavía.** El corte de caja con cuadre y arqueo: eso es la fase 19, cuando ya existan ventas y movimientos que cuadrar. Aquí el cierre solo marca el turno como cerrado.

---

#### Fase 14 — Cuentas: apertura y captura de consumo

**Objetivo.** La pantalla central del producto. Abrir una cuenta, agregar productos y modificar cantidades, con la forma de comandos que después permitirá trabajar sin red.

**Componentes.**

- `orders`: identificador generado en el cliente, tipo (mesa, barra, para llevar), mesa, mesero, turno, estado, comensales, nombre libre para cuentas de barra.
- `order_items` como **registro de deltas**: cada línea guarda producto, variante, modificadores, cantidad, precio congelado, impuestos congelados, quién la capturó y cuándo.
- Comandos: `order.open`, `order.add_items`, `order.change_quantity`, `order.add_note`, `order.transfer_table`, `order.merge`, `order.split`, `order.assign_waiter`. Todos idempotentes.
- Cálculo de totales en el servidor como única verdad: subtotal, impuestos, total. El cliente calcula solo para mostrar.
- Interfaz de POS: cuadrícula de productos por categoría, búsqueda, favoritos, teclado numérico de cantidad, panel de cuenta, captura de variantes y modificadores.
- Actualización en vivo de la cuenta entre tabletas.

**Módulos y rutas.** `apps/api/src/modules/orders/`, `apps/web/src/features/pos/`.

**Depende de.** 05, 10, 11, 12, 13

**Debe quedar funcionando.**

- Un mesero abre una cuenta en una mesa, captura varias rondas y ve el total correcto.
- Dos meseros capturan sobre la misma cuenta sin pisarse.
- Mover una cuenta de mesa, juntar dos cuentas y separarla.

**Validación.**

- Enviar el mismo comando `add_items` tres veces con la misma clave: la cuenta contiene el consumo una sola vez.
- Cambiar el precio del producto en el catálogo con la cuenta abierta: la cuenta no cambia.
- Prueba de concurrencia: dos clientes agregando simultáneamente, ambos aportes presentes.
- Aislamiento: una orden del negocio A es inalcanzable desde B.

**No desarrollar todavía.** Cancelar líneas, aplicar descuentos, cobrar, imprimir y descontar inventario. La cuenta solo crece.

---

#### Fase 15 — Cancelaciones, cortesías y descuentos con autorización

**Objetivo.** Todo lo que hace que una cuenta disminuya. Se separa de la fase 14 a propósito: es la superficie donde ocurre el fraude interno y merece su propio diseño y sus propias pruebas.

**Componentes.**

- Comandos `order.void_item`, `order.void_order`, `order.comp_item` (cortesía), `order.apply_discount`.
- Distinción entre cancelar **antes** y **después** de enviar a producción o de imprimir: la segunda exige motivo, permiso superior y queda marcada como merma potencial.
- Catálogo de motivos configurable por negocio: error de captura, cliente cambió de opinión, producto en mal estado, cortesía de la casa.
- Descuentos por porcentaje, por importe y por línea, con límite máximo por rol y elevación por PIN de supervisor cuando se rebasa.
- Las líneas canceladas **no se borran**: se marcan y permanecen visibles en el histórico y en los reportes.
- Interfaz con confirmación explícita, motivo obligatorio y diálogo de autorización por PIN.

**Módulos y rutas.** `apps/api/src/modules/orders/voids/`, `orders/discounts/`, `apps/web/src/features/pos/`, ampliación del catálogo de permisos.

**Depende de.** 04, 05, 14

**Debe quedar funcionando.**

- Un mesero sin permiso no puede cancelar una línea impresa sin el PIN de un encargado.
- Cada cancelación y cada descuento genera un evento de auditoría con ejecutor, autorizante, motivo e importe.
- Los totales se recalculan correctamente con cancelaciones y descuentos mezclados.

**Validación.**

- Matriz de casos: cancelar antes y después de imprimir, con y sin permiso, con y sin elevación.
- Consulta de auditoría que responde «qué canceló cada usuario en el turno del viernes».
- Un descuento por encima del límite del rol es rechazado por el servidor incluso si la interfaz lo permitiera.

**No desarrollar todavía.** Promociones automáticas, cupones y programas de lealtad. Solo descuentos manuales autorizados.

---

#### Fase 16 — Motor de tiempo para mesas de billar

**Objetivo.** Convertir tiempo transcurrido en importes correctos, de forma que sobreviva a reinicios, pérdida de red y relojes desincronizados.

**Componentes.**

- `table_sessions` con inicio, pausas, reanudaciones y fin, guardados como **eventos**, no como un contador. El importe siempre es una función derivada de los eventos.
- Reglas de tarificación por producto tarificado: tarifa por hora, fracción mínima cobrable, redondeo, tiempo de gracia, tarifas distintas por franja horaria o por día.
- Comandos `timing.start`, `timing.pause`, `timing.resume`, `timing.stop`, `timing.adjust` (con permiso y auditoría).
- Al detenerse, la sesión inyecta una línea en la cuenta de la mesa con el desglose de tiempo.
- Cronómetro en la interfaz calculado localmente a partir de la marca de inicio del servidor, no por incremento en memoria, para que un reinicio de la tableta no lo desvíe.
- Modalidad de tiempo prepagado: importe fijo que se agota y avisa.
- Aviso visual y sonoro configurable a los N minutos.

**Módulos y rutas.** `apps/api/src/modules/timing/`, `apps/web/src/features/pos/timing/`, extensión de `floor/` y `orders/`.

**Depende de.** 12, 14

**Debe quedar funcionando.**

- Iniciar, pausar, reanudar y detener una mesa, con el importe correcto en la cuenta.
- El cronómetro sigue correcto tras recargar la tableta o reiniciar la API.
- Vista de piso con el tiempo corriendo en todas las mesas activas.

**Validación.**

- Casos de cálculo: fracción mínima, tiempo de gracia, sesión que cruza un cambio de tarifa, sesión con tres pausas, sesión de nueve horas.
- Matar el proceso de la API a mitad de sesión y comprobar que al volver el importe es el correcto.
- Un ajuste manual de tiempo queda registrado con quién lo autorizó.

**No desarrollar todavía.** Reservas de mesa, control de encendido de luces o cualquier integración con hardware de la mesa.

---

#### Fase 17 — Cobro, métodos de pago y cierre de cuenta

**Objetivo.** Cerrar el ciclo de venta. Es la fase con las garantías transaccionales más estrictas del sistema.

**Componentes.**

- `payment_methods` configurables por negocio: efectivo, tarjeta, transferencia, vale, cuenta de casa. Con banderas de si afecta caja y si requiere referencia.
- `payments` ligados a la orden y al turno, con importe, propina, referencia y cajero.
- Pagos parciales, pagos mixtos y cálculo de cambio en efectivo.
- División de cuenta: por importe, por partes iguales y por selección de líneas, generando cuentas hijas trazables a la original.
- Propinas por método, con reparto configurable.
- Transición atómica al cerrar: `order.close` valida que el pagado cubra el total, congela la orden, libera la mesa y detiene la sesión de tiempo, todo en una transacción.
- Reapertura de cuenta cerrada solo con permiso, motivo y auditoría; nunca borra el cierre anterior.
- Interfaz de cobro optimizada para una sola mano y para el error humano bajo presión.

**Módulos y rutas.** `apps/api/src/modules/payments/`, `apps/web/src/features/pos/checkout/`, extensión de `orders/` y `shifts/`.

**Depende de.** 13, 14, 15, 16

**Debe quedar funcionando.**

- Cobrar una cuenta completa, parcialmente y con métodos mixtos.
- Dividir una cuenta de seis personas de las tres formas.
- Una cuenta cerrada es inmutable salvo reapertura autorizada.

**Validación.**

- Prueba de concurrencia: dos cajeros cobrando la misma cuenta a la vez; exactamente uno gana.
- La suma de pagos, propinas y descuentos cuadra con el total en cien órdenes generadas al azar.
- Simular caída de la base de datos a mitad del cierre y verificar que no queda una orden medio cerrada.

**No desarrollar todavía.** Integración con terminal bancaria física, facturación fiscal, impresión del ticket y corte de caja. Cobrar y emitir el comprobante son cosas distintas.

---

#### Fase 18 — Impresión de tickets y agente local

**Objetivo.** Que salga papel, de forma confiable y sin depender de que el bar abra puertos en su red.

**Componentes.**

- `printers` por sucursal: nombre, modelo, ancho de papel, ubicación, tipo (caja, barra, cocina), estado.
- Cola `print_jobs` en BullMQ con reintentos, tiempo de espera y bandeja de fallidos visible en la interfaz.
- `apps/print-agent`: servicio Node instalable en una mini PC de la sucursal. Se conecta hacia afuera por WebSocket con un token de sucursal, recibe trabajos, habla ESC/POS por red o USB y confirma o reporta el fallo. Guarda los trabajos en disco para reintentar si se cae la red.
- Plantillas de ticket editables por negocio: logotipo, encabezado, pie, datos fiscales, propina sugerida, código QR.
- Tipos de documento: comanda de barra o cocina, cuenta previa, ticket de venta, corte de caja, reimpresión marcada como copia.
- Reglas de enrutamiento: qué producto se imprime en qué impresora, tomadas de `branch_products` y del área.
- Respaldo: si no hay impresora, generar PDF y ofrecerlo por pantalla o enviarlo por mensaje.

**Módulos y rutas.** `apps/api/src/modules/printing/`, `apps/print-agent/` (aplicación nueva), `apps/web/src/features/settings/printing/`.

**Depende de.** 12, 14, 17

**Debe quedar funcionando.**

- Comanda que sale automáticamente al capturar consumo, en la impresora correcta.
- Ticket de venta al cerrar la cuenta, con el formato del negocio.
- Reimpresión con permiso y marca de copia.
- Una impresora apagada no bloquea el cobro: el trabajo queda en cola y se reintenta.

**Validación.**

- Prueba con impresora térmica real de 58 y de 80 milímetros.
- Apagar la impresora, cobrar tres cuentas, encenderla y verificar que salen los tres tickets sin duplicados.
- Un agente con token de la sucursal 1 no recibe trabajos de la sucursal 2.
- Prueba de acentos, símbolos de moneda y nombres largos de producto.

**No desarrollar todavía.** Impresión de reportes complejos, envío de tickets por correo electrónico y timbrado fiscal.

---

#### Fase 19 — Movimientos de efectivo y corte de caja

**Objetivo.** Cerrar el turno con un cuadre que el dueño pueda creer. Solo es posible ahora, cuando ya existen ventas, pagos y cancelaciones que cuadrar.

**Componentes.**

- `cash_movements`: fondo inicial, entradas, retiros a caja fuerte, gastos con comprobante, ajustes. Cada uno con categoría, motivo, autorizante y adjunto opcional en MinIO.
- Motor de corte que calcula el esperado por método de pago: ventas en efectivo + entradas − salidas + fondo.
- Arqueo con conteo por denominación en la interfaz y cálculo automático de diferencia.
- Cierre de turno en dos pasos: **cierre ciego** (el cajero cuenta sin ver el esperado) y revisión del encargado. El cierre ciego es lo que hace útil al corte.
- Reporte X (parcial, no cierra) y reporte Z (cierre definitivo, irreversible), impresos por el agente local.
- Bloqueos: no se cierra con cuentas abiertas ni con trabajos de impresión pendientes.
- Historial de cortes con sus diferencias, consultable por el propietario.

**Módulos y rutas.** `apps/api/src/modules/cash/`, `apps/web/src/features/cash/`, extensión de `shifts/` y `printing/`.

**Depende de.** 13, 17, 18

**Debe quedar funcionando.**

- Un turno completo: apertura con fondo, ventas, un retiro, un gasto, arqueo ciego y corte Z impreso.
- El esperado cuadra al centavo contra la suma de pagos del turno.
- Un turno cerrado es inmutable.

**Validación.**

- Simulación de un turno de doscientas órdenes con pagos mixtos, cancelaciones y descuentos, comprobando el cuadre.
- Intentar cerrar con una cuenta abierta y recibir el bloqueo.
- Una diferencia de caja queda registrada y no se puede editar después.

**No desarrollar todavía.** Reportes históricos y comparativos entre turnos: eso es la fase 23. Aquí solo el corte del turno en cuestión.

---

### BLOQUE E — Resiliencia y datos

_Con el ciclo de venta completo y probado, se le da resistencia a la caída de red y se construye encima todo lo que consume esos movimientos._

---

#### Fase 20 — Motor offline y sincronización

**Objetivo.** Que el bar siga vendiendo sin internet. Se implementa ahora, sobre una API que desde la fase 05 fue diseñada para permitirlo.

**Componentes.**

- Almacén local en IndexedDB con Dexie: menú efectivo, mesas, cuentas abiertas del turno, configuración de la sucursal.
- **Bandeja de salida**: cola persistente de comandos con clave de idempotencia, número de secuencia por dispositivo y estado (pendiente, enviado, confirmado, en conflicto).
- Motor de reproducción: al recuperar la conexión, envía en orden y en lotes, tolerando reenvíos.
- Endpoints `/sync/pull` (cambios desde una marca) y `/sync/push` (lote de comandos), con resolución por tipo de comando.
- Política de conflictos explícita y documentada: los deltas se fusionan; las cancelaciones ganan sobre las adiciones; los cierres de cuenta requieren conexión; un conflicto irresoluble se marca para revisión humana en lugar de descartarse en silencio.
- Interfaz honesta: indicador de estado, contador de comandos pendientes, y bloqueo visible de las acciones que exigen conexión.
- Sincronización del catálogo por versión, con descarga en segundo plano.
- Bloqueo de cierre de turno con bandeja pendiente.

**Módulos y rutas.** `apps/web/src/lib/offline/`, `apps/web/src/lib/api/` (interceptor), `apps/api/src/modules/sync/`.

**Depende de.** 05, 14, 15, 16, 17, 18

**Debe quedar funcionando.**

- Desconectar el internet del bar, abrir tres cuentas, capturar consumo, cobrar en efectivo, imprimir, y al reconectar todo aparece en el servidor **una sola vez**.
- Dos tabletas trabajando sin red sobre mesas distintas se reconcilian sin pérdida.
- Las acciones que requieren conexión están claramente deshabilitadas, no fallan en silencio.

**Validación.**

- Prueba Playwright con red desconectada: guion completo de servicio de una noche.
- Prueba de reconexión con la misma tableta duplicando el envío: cero duplicados en la base de datos.
- Prueba de conflicto: dos tabletas modificando la misma cuenta sin red; resultado predecible y documentado.
- Prueba de dispositivo perdido: la bandeja sobrevive a un cierre completo del navegador.

**No desarrollar todavía.** Funcionamiento sin red de la administración, del inventario y de los reportes. La frontera declarada en la sección 5 se respeta y no se amplía.

---

#### Fase 21 — Inventario: insumos, existencias y movimientos

**Objetivo.** Saber qué hay en cada sucursal y por qué cambió, con movimientos manuales antes de automatizar nada.

**Componentes.**

- `inventory_items` a nivel de negocio: insumos y productos inventariables, con unidad base y factores de conversión (botella → mililitro, caja → pieza).
- `stock` por sucursal, calculado como saldo de movimientos y **no** como campo editable.
- `inventory_movements` solo-añadir: compra, entrada, salida, merma, transferencia entre sucursales, ajuste por conteo. Con costo unitario y proveedor opcional.
- Conteos físicos: iniciar un conteo, capturar por categoría, generar el movimiento de ajuste y congelar la diferencia.
- Costeo promedio ponderado, base para el margen que se reportará en la fase 23.
- Alertas de mínimos por sucursal.
- Interfaz pensada para capturar en el almacén desde un teléfono.

**Módulos y rutas.** `apps/api/src/modules/inventory/`, `apps/web/src/features/inventory/`.

**Depende de.** 09, 10, 12

**Debe quedar funcionando.**

- Registrar compras, mermas y transferencias, con existencias correctas por sucursal.
- Un conteo físico completo que genera su ajuste.
- El histórico explica cada unidad de diferencia.

**Validación.**

- El saldo calculado coincide con la suma de movimientos en mil movimientos generados.
- Una transferencia entre sucursales es atómica: nunca sale de una sin entrar en la otra.
- Ningún movimiento se puede editar ni borrar; solo se corrige con otro movimiento.

**No desarrollar todavía.** Descuento automático por venta, recetas, órdenes de compra a proveedores y pronósticos.

---

#### Fase 22 — Recetas y descuento automático por venta

**Objetivo.** Conectar la venta con el inventario, que es donde un bar realmente descubre sus fugas.

**Componentes.**

- `recipes`: qué insumos y en qué cantidad consume cada producto o variante. Un whisky en copa consume 45 ml de la botella.
- Recetas por variante y por modificador: un extra de shot suma su consumo.
- Consumo disparado **al cerrar la cuenta**, no al capturarla, y revertido si la cuenta se reabre o se cancela.
- Procesamiento en el worker mediante cola, para que el cierre de cuenta jamás se retrase por el inventario.
- Manejo de existencia negativa: se permite y se alerta, **nunca** se bloquea una venta.
- Reporte de **varianza**: consumo teórico según recetas contra consumo real según conteo. Es el producto principal de esta fase.
- Política explícita para el consumo de ventas capturadas sin red: se procesa al sincronizar.

**Módulos y rutas.** `apps/api/src/modules/inventory/recipes/`, `inventory/consumption/`, colas en el worker, `apps/web/src/features/inventory/recipes/`.

**Depende de.** 11, 17, 20, 21

**Debe quedar funcionando.**

- Vender diez copas descuenta 450 ml de la botella correspondiente.
- Cancelar una cuenta cerrada devuelve el insumo.
- Reporte de varianza de una semana con su explicación por producto.

**Validación.**

- Turno simulado de cuatrocientas ventas: consumo teórico exacto contra el cálculo manual.
- Prueba de idempotencia: reprocesar el mismo cierre no descuenta dos veces.
- Ventas sincronizadas tarde descuentan una sola vez y con la fecha correcta.

**No desarrollar todavía.** Compras a proveedores, cuentas por pagar y sugerencias automáticas de reorden.

---

#### Fase 23 — Reportes y modelos de lectura

**Objetivo.** Responder las preguntas del dueño sin degradar el POS. Se construye al final porque solo ahora existen todos los movimientos que los alimentan.

**Componentes.**

- Vistas materializadas y tablas de agregación por día operativo, sucursal, producto, categoría, mesero y método de pago, refrescadas por el worker.
- Reportes: ventas por periodo, comparativo entre sucursales, productos más y menos vendidos, ventas por mesero, ventas por hora, métodos de pago, propinas, descuentos y cancelaciones por usuario, ocupación y rendimiento de mesas de billar, margen bruto por producto, varianza de inventario.
- Panel de inicio por rol: el propietario ve el negocio completo, el encargado ve su sucursal, el mesero ve su turno.
- Exportación a CSV y PDF generada en el worker y entregada desde MinIO.
- Reportes programados por correo: el resumen del día operativo a las 6 de la mañana.
- Separación estricta: los reportes leen de los modelos de lectura, nunca de las tablas operativas.

**Módulos y rutas.** `apps/api/src/modules/reports/`, migraciones de vistas en `packages/db`, trabajos en el worker, `apps/web/src/features/reports/`.

**Depende de.** 17, 19, 21, 22

**Debe quedar funcionando.**

- Todos los reportes listados, filtrables por periodo y sucursal, respetando permisos.
- El resumen diario llega por correo automáticamente.
- Un reporte pesado no afecta el tiempo de respuesta del POS.

**Validación.**

- Cada cifra de cada reporte reconciliada contra una consulta directa a las tablas operativas.
- Prueba de carga: generar el reporte anual de un negocio con un millón de líneas mientras se capturan órdenes, midiendo la latencia del POS.
- Aislamiento: un reporte jamás incluye una fila de otro negocio, ni siquiera en los agregados.

**No desarrollar todavía.** Constructor de reportes a medida, predicciones y cualquier analítica entre negocios distintos.

---

#### Fase 24 — Visor de historial y auditoría

**Objetivo.** Hacer consultable la auditoría que se ha venido escribiendo desde la fase 05, que hasta ahora solo existía en la base de datos.

**Componentes.**

- Buscador de auditoría con filtros por usuario, acción, entidad, sucursal, turno y rango de fechas.
- Línea de tiempo de una orden concreta: apertura, cada línea, cada cancelación, cada pago, quién y a qué hora.
- Historial de cuentas cerradas con búsqueda por folio, mesa, mesero e importe.
- Vista de actividad por usuario, pensada para investigar irregularidades.
- Vistas de riesgo predefinidas: cancelaciones después de impresión, descuentos elevados, reaperturas de cuenta, diferencias de caja, ajustes de tiempo de billar.
- Política de retención y archivado de particiones antiguas a MinIO.
- Exportación de un rango de auditoría.

**Módulos y rutas.** `apps/api/src/modules/audit/query/`, `apps/web/src/features/audit/`.

**Depende de.** 05, 15, 19, 23

**Debe quedar funcionando.**

- Reconstruir por completo la historia de cualquier cuenta cerrada.
- Responder «quién canceló qué y quién lo autorizó» en segundos.
- Las vistas de riesgo señalan comportamientos anómalos del turno.

**Validación.**

- Recorrer un turno simulado completo y verificar que cada acción tiene su evento correspondiente.
- Consultas con un año de auditoría respondiendo por debajo de dos segundos.
- La auditoría sigue siendo inmodificable desde la aplicación.

**No desarrollar todavía.** Detección automática de fraude, alertas por comportamiento y aprendizaje automático.

---

### BLOQUE F — Plataforma y producción

_Con el producto completo, se construye el negocio alrededor de él y se prepara para operar con dinero real de terceros._

---

#### Fase 25 — Panel SUPERADMIN y ciclo de vida de cuentas

**Objetivo.** Administrar la plataforma como un negocio SaaS, sobre las entidades que existen desde la fase 02.

**Componentes.**

- Aplicación separada bajo su propia ruta o subdominio, con su propio inicio de sesión y segundo factor obligatorio.
- Alta y baja de negocios, con aprovisionamiento completo: sucursal principal, roles de sistema, propietario invitado.
- Planes y límites: número de sucursales, de usuarios, de productos, módulos habilitados. Aplicados **por el backend**, no por la interfaz.
- Estados de cuenta: prueba, activo, suspendido por falta de pago, cancelado. Un negocio suspendido pierde el acceso pero conserva sus datos.
- Métricas de plataforma: negocios activos, transacciones por día, uso de almacenamiento, salud de los agentes de impresión.
- Suplantación con vigencia limitada, motivo obligatorio y registro visible en la auditoría **del negocio**, no solo en la de la plataforma.
- Configuración global: correo transaccional, límites de tasa, banderas de funcionalidad por negocio.

**Módulos y rutas.** `apps/api/src/modules/platform/`, `apps/web/src/features/platform/` o una aplicación separada `apps/admin`.

**Depende de.** 02, 06, 08, 23

**Debe quedar funcionando.**

- Dar de alta un negocio nuevo listo para operar en menos de un minuto.
- Suspender un negocio y comprobar que sus usuarios pierden el acceso sin perder datos.
- Los límites del plan se aplican realmente en el servidor.

**Validación.**

- Un token de negocio jamás alcanza una ruta de plataforma, ni con permisos manipulados.
- Toda acción de plataforma y toda suplantación queda auditada en ambos lados.
- Rebasar el límite de sucursales del plan devuelve un error claro.

**No desarrollar todavía.** Cobro de suscripciones con pasarela de pago, facturación de la plataforma y autoservicio de registro. Se preparan los estados, no la cobranza.

---

#### Fase 26 — Endurecimiento, respaldos y observabilidad

**Objetivo.** Dejar el sistema en condiciones de operar el dinero de negocios reales, con evidencia de que se puede recuperar de un desastre.

**Componentes.**

- Respaldos: `pg_dump` diario más archivado WAL para recuperación a un punto en el tiempo; copia fuera del servidor; respaldo de MinIO.
- **Prueba de restauración documentada**: un respaldo que nunca se ha restaurado no es un respaldo.
- Métricas y trazas con OpenTelemetry, tableros de latencia por endpoint, profundidad de colas, errores por negocio.
- Alertas: API caída, cola atascada, agente de impresión desconectado más de N minutos, tasa de errores elevada, disco al límite.
- Rate limiting por negocio y por IP; protección contra fuerza bruta en PIN.
- Repaso de seguridad: cabeceras, CORS, política de contenido, rotación de secretos, revisión de dependencias.
- Cifrado en reposo de campos sensibles y política de retención y borrado de datos.
- Manual de operación: cómo desplegar, cómo revertir, qué hacer cuando un bar reporta un problema a las dos de la mañana.
- Procedimiento de migración con cero tiempo fuera y guion de reversión por despliegue.

**Módulos y rutas.** `deploy/`, `apps/api/src/common/`, `docs/RUNBOOK.md`, configuración de Coolify y del CI.

**Depende de.** Todas.

**Debe quedar funcionando.**

- Respaldos automáticos verificados y restauración probada en un entorno limpio.
- Tableros y alertas conectados a un canal que alguien realmente lee.
- Despliegue y reversión documentados y ejecutados al menos una vez.

**Validación.**

- Simulacro de desastre: destruir la base de datos de pruebas y restaurarla desde el respaldo, midiendo el tiempo.
- Prueba de carga con veinte negocios y cien tabletas concurrentes.
- Revisión de seguridad externa o, como mínimo, una lista OWASP recorrida y firmada.

**No desarrollar todavía.** Alta disponibilidad multi-región, réplicas de lectura y autoescalado. Se documentan como el siguiente paso cuando la carga lo justifique.

---

## 8. Dependencias entre fases

Ninguna fase depende de una posterior. La tabla se lee en las dos direcciones: qué necesita una fase para empezar, y qué desbloquea al terminar.

| Fase | Nombre                     | Requiere               | Desbloquea                                   |
| ---- | -------------------------- | ---------------------- | -------------------------------------------- |
| 01   | Monorepo y despliegue      | —                      | 02                                           |
| 02   | Núcleo multi-tenant        | 01                     | 03, 06, 25                                   |
| 03   | Identidad y autenticación  | 02                     | 04, 05, 07                                   |
| 04   | Roles y permisos           | 02, 03                 | 05, 07, 08, 15                               |
| 05   | Auditoría e idempotencia   | 02, 03, 04             | 06, 07, 14, 15, 20, 24                       |
| 06   | Pruebas de aislamiento     | 02, 03, 04, 05         | 25 · **puerta obligatoria** para el bloque B |
| 07   | Shell del frontend         | 03, 04, 05             | 08, 09                                       |
| 08   | Administración del negocio | 04, 07                 | 09, 12, 13, 25                               |
| 09   | Catálogo del negocio       | 07, 08                 | 10, 11, 12, 21                               |
| 10   | Configuración por sucursal | 09                     | 11, 14, 21                                   |
| 11   | Variantes y modificadores  | 09, 10                 | 14, 22                                       |
| 12   | Áreas y mesas              | 08, 09                 | 13, 14, 16, 18, 21                           |
| 13   | Turnos y caja              | 08, 12                 | 14, 17, 19                                   |
| 14   | Cuentas y consumo          | 05, 10, 11, 12, 13     | 15, 16, 17, 18, 20                           |
| 15   | Cancelaciones y descuentos | 04, 05, 14             | 17, 20, 24                                   |
| 16   | Motor de tiempo (billar)   | 12, 14                 | 17, 20                                       |
| 17   | Cobro y pagos              | 13, 14, 15, 16         | 18, 19, 20, 22, 23                           |
| 18   | Impresión                  | 12, 14, 17             | 19, 20                                       |
| 19   | Efectivo y corte de caja   | 13, 17, 18             | 23, 24                                       |
| 20   | Motor offline              | 05, 14, 15, 16, 17, 18 | 22                                           |
| 21   | Inventario y movimientos   | 09, 10, 12             | 22, 23                                       |
| 22   | Recetas y consumo          | 11, 17, 20, 21         | 23                                           |
| 23   | Reportes                   | 17, 19, 21, 22         | 24, 25                                       |
| 24   | Historial y auditoría      | 05, 15, 19, 23         | —                                            |
| 25   | Panel SUPERADMIN           | 02, 06, 08, 23         | —                                            |
| 26   | Endurecimiento y respaldos | todas                  | producción                                   |

### Ruta crítica y trabajo paralelizable

- **Ruta crítica:** 01 → 02 → 03 → 04 → 05 → 07 → 08 → 09 → 10 → 14 → 17 → 19 → 20 → 23
- **Puertas:** la **06** (no se entra al bloque B sin ella) y la **26** (no se opera con dinero real sin ella).
- **Paralelizable:** 11 junto a 12 · 21 en cuanto termine 12 · 16 junto a 15 · 18 junto a 19 · 25 junto a 24.

### Hitos con valor propio

- **Fase 08.** Existe una plataforma SaaS con negocios y equipos reales, aunque no venda nada.
- **Fase 19.** Un bar puede operar una noche completa de principio a fin con conexión estable. Primer punto donde tiene sentido una prueba piloto en el negocio propio.
- **Fase 20.** El sistema aguanta la realidad de la red de un bar.
- **Fase 26.** Puede venderse a terceros.

---

## 9. Documentación mínima del repositorio

El objetivo de estos archivos es que un agente entienda la arquitectura **sin leer el código**, y que el costo de contexto para entrar a una fase sea de unos pocos miles de tokens y no de cientos de miles. Por eso cada uno tiene un tope de tamaño: un documento que crece sin límite deja de leerse y vuelve al problema original.

| Archivo                   | Qué contiene                                                                                                                                                                                                                               | Tope                 | Se actualiza                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ---------------------------------- |
| `CLAUDE.md`               | Enrutador de dos páginas: qué es el proyecto, las cinco reglas innegociables, qué archivo leer según lo que se vaya a hacer, y los comandos del repositorio. Lo primero que lee cualquier agente.                                          | 100 líneas           | Rara vez                           |
| `docs/ARCHITECTURE.md`    | Stack, servicios de Coolify, estructura del monorepo, flujo de una petición de principio a fin. Sin código.                                                                                                                                | 200 líneas           | Solo con un ADR                    |
| `docs/MULTITENANCY.md`    | Documento normativo: las tres capas de aislamiento, la regla de la transacción con contexto, la prohibición del Prisma crudo, cómo agregar una tabla nueva correctamente. **Lectura obligatoria en toda fase que toque la base de datos.** | 150 líneas           | Solo con un ADR                    |
| `docs/MODULE_MAP.md`      | La tabla de la sección 6: módulo, ruta en la API, ruta en la web, fase que lo creó, de qué módulos depende, si está congelado.                                                                                                             | 120 líneas           | Al terminar cada fase              |
| `docs/DATA_MODEL.md`      | Un apartado por módulo con sus tablas, campos clave y relaciones. Un agente lee solo el apartado de su módulo y los de sus dependencias.                                                                                                   | 40 líneas por módulo | Al terminar cada fase              |
| `docs/API_CONVENTIONS.md` | Forma de peticiones y respuestas, errores, paginación, idempotencia, versionado. Los contratos concretos viven en `packages/contracts` y en el OpenAPI generado, que no se escriben a mano.                                                | 150 líneas           | Solo con un ADR                    |
| `docs/PERMISSIONS.md`     | Catálogo de permisos con su alcance y qué roles de sistema lo traen por omisión. **Se genera** desde `packages/contracts/permissions.ts` para que no pueda desincronizarse.                                                                | generado             | Automático                         |
| `docs/OFFLINE.md`         | Reglas de comandos idempotentes, frontera de lo que funciona sin red, política de conflictos.                                                                                                                                              | 120 líneas           | Solo con un ADR                    |
| `docs/PROJECT_STATE.md`   | El tablero. Estado de cada fase, qué existe, qué falta, deuda técnica conocida y decisiones pendientes. **Segundo archivo que lee todo agente.**                                                                                           | 150 líneas           | Al iniciar y al terminar cada fase |
| `docs/decisions/`         | Un ADR numerado por decisión: contexto, opciones, elección, consecuencias. Una página cada uno. Nunca se editan: se sustituyen con otro ADR que los marca como reemplazados.                                                               | 1 página c/u         | Cuando se decide algo              |
| `docs/phases/PHASE-NN.md` | El encargo ejecutable de la fase. Es el único documento largo que el agente lee completo.                                                                                                                                                  | 200 líneas           | Se escribe antes de la fase        |
| `docs/RUNBOOK.md`         | Operación: desplegar, revertir, restaurar, diagnosticar. Nace en la fase 26 pero se va llenando desde la 01.                                                                                                                               | 200 líneas           | Continuo                           |

### El tablero de estado

`docs/PROJECT_STATE.md` es el registro breve de qué existe y qué falta. Se mantiene con una tabla de fases y tres listas cortas:

| Fase | Estado           | Módulos entregados            | Notas y deuda                    |
| ---- | ---------------- | ----------------------------- | -------------------------------- |
| 01   | ✅ terminada     | infra                         | —                                |
| 02   | ✅ terminada     | tenancy, businesses, branches | Congelado desde 06 · ADR-002     |
| 03   | 🔨 en desarrollo | auth                          | Falta revocación por dispositivo |
| 04   | ⬜ pendiente     | iam                           | Bloqueada por 03                 |

Debajo de la tabla, tres listas de tres a diez líneas cada una:

- **Decisiones vigentes** — una línea por ADR con su enlace.
- **Deuda técnica aceptada** — qué se dejó a medias a propósito y en qué fase se paga.
- **Trampas conocidas** — lo que hizo tropezar a un agente anterior y no debe repetirse. Esta tercera lista es la que más contexto ahorra con el tiempo.

### Reglas para que la documentación no se pudra

- Nunca se copia código dentro de la documentación: se enlaza a la ruta del archivo.
- Nada que se pueda generar se escribe a mano. Permisos y contratos de API se generan.
- Cada archivo declara su tope de líneas en su encabezado y la CI falla si se rebasa. Un documento largo se condensa, no se amplía.
- Ningún documento describe lo que _se piensa_ hacer: solo lo que existe. El futuro vive en los encargos de fase.

---

## 10. Ejecutar una sola fase por conversación

El objetivo es que baste con decir «ejecuta únicamente la fase 15» y que el agente encuentre solo, en menos de diez mil tokens de lectura, todo lo que necesita, sin recorrer el repositorio.

### Cuatro mecanismos que lo hacen posible

1. **Rebanadas verticales.** Un módulo es una carpeta que contiene su controlador, su servicio, sus DTOs, sus pruebas y su sección del esquema Prisma. Una fase equivale casi siempre a una o dos carpetas, así que el alcance es una ruta, no una idea.
2. **Contratos como frontera.** El frontend nunca lee código del backend: lee `packages/contracts`. Una fase de interfaz jamás necesita abrir `apps/api`. Esto por sí solo elimina la mitad del contexto que un agente leería.
3. **Lista blanca de archivos en cada encargo.** Cada `PHASE-NN.md` declara los patrones que puede crear o modificar y los que están prohibidos. Un revisor —o un guion de CI— compara el diff contra esa lista y rechaza lo que se salga.
4. **Núcleo congelado.** `tenancy`, `iam` y `audit` están cerrados desde la fase 06. El agente los _usa_ leyendo `MULTITENANCY.md`; no necesita entenderlos por dentro ni tiene permiso para tocarlos.

### Anatomía de un encargo de fase

Cada `docs/phases/PHASE-NN.md` se escribe **antes** de abrir la conversación y contiene, en este orden:

1. Objetivo en una frase
2. Lectura obligatoria (rutas exactas, tres a cinco archivos)
3. Componentes a construir
4. **Lista blanca** de archivos que puede crear o modificar
5. **Lista negra** explícita
6. Contratos nuevos a declarar
7. Criterio de terminación
8. Comandos de validación
9. Qué NO construir
10. Ritual de cierre

### El mensaje con el que se abre la conversación

```
Ejecuta únicamente la FASE 15 de este proyecto.

Lee en este orden y no leas nada más para empezar:
  1. CLAUDE.md
  2. docs/PROJECT_STATE.md
  3. docs/phases/PHASE-15.md
  4. Los archivos de «lectura obligatoria» que ese encargo indique.

Respeta la lista blanca de archivos del encargo. Si necesitas modificar
algo fuera de ella, detente y explícame por qué antes de hacerlo.

No implementes nada de la sección «no construir todavía».
Al terminar, ejecuta el ritual de cierre del encargo.
```

### Ritual de cierre, idéntico en todas las fases

- Ejecutar `pnpm verify`: tipos, lint, pruebas unitarias, integración, **batería de aislamiento** y pruebas de arquitectura. Sin excepción, incluso en fases que «no tocan el backend».
- Actualizar `docs/PROJECT_STATE.md`: marcar la fase terminada, listar módulos entregados, anotar deuda aceptada y trampas encontradas.
- Actualizar `docs/MODULE_MAP.md` y el apartado correspondiente de `docs/DATA_MODEL.md`. Solo su apartado.
- Escribir un ADR si se tomó alguna decisión que otra fase deba respetar.
- Regenerar `docs/PERMISSIONS.md` y el OpenAPI si cambiaron los contratos.
- Un commit por fase con el mensaje `feat(phase-15): ...` y un resumen de cinco líneas de lo entregado.

### Cuando una fase se sale de su carril

Si a mitad del trabajo aparece la necesidad de tocar un módulo congelado o de rediseñar algo que una fase anterior dio por cerrado, el agente **no improvisa**: se detiene, escribe la propuesta como un ADR en borrador y devuelve la decisión. Casi siempre la respuesta correcta es abrir una fase correctiva pequeña en lugar de ensanchar la actual. Una fase que se ensancha es una fase que ya no se puede validar.

> **Antes de empezar a programar:** conviene escribir los encargos `PHASE-01.md` a `PHASE-06.md` completos, porque el bloque A es el que no admite correcciones baratas. Los encargos del bloque D es mejor escribirlos cuando el bloque C esté terminado, ya con el modelo real de catálogo a la vista.
