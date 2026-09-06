# Despliegue en Coolify — fase 01

Cinco servicios en un mismo proyecto de Coolify. Todos los Dockerfiles se construyen con **contexto en la raíz del repositorio**.

| Servicio     | Tipo                    | Dockerfile / imagen     | Comando               | Variables                       |
| ------------ | ----------------------- | ----------------------- | --------------------- | ------------------------------- |
| `postgres`   | Base de datos (Coolify) | `postgres:16`           | —                     | usuario/clave/db → `posbar`     |
| `redis`      | Base de datos (Coolify) | `redis:7`               | —                     | sin contraseña en red interna   |
| `pos-api`    | Aplicación (Dockerfile) | `deploy/api/Dockerfile` | por defecto           | `deploy/api/api.env.example`    |
| `pos-worker` | Aplicación (Dockerfile) | `deploy/api/Dockerfile` | `node dist/worker.js` | `deploy/api/worker.env.example` |
| `pos-web`    | Aplicación (Dockerfile) | `deploy/web/Dockerfile` | —                     | `deploy/web/web.env.example`    |

## Orden

1. Crear `postgres` y `redis` como recursos de base de datos de Coolify; anotar sus nombres internos.
2. Crear `pos-api` desde el repositorio: _Build Pack = Dockerfile_, ruta `deploy/api/Dockerfile`, puerto 3000, dominio público `api.<dominio>`. Cargar variables.
3. Crear `pos-worker` igual que la API pero **sin dominio** y con _Custom Start Command_ `node dist/worker.js`.
4. Crear `pos-web`: Dockerfile `deploy/web/Dockerfile`, puerto 80, dominio `pos.<dominio>`, `VITE_API_URL` como **variable de build**.
5. Verificar: `https://api.<dominio>/health` devuelve `status: ok`; `https://pos.<dominio>` muestra api, postgres y redis en verde.

## Validación de la fase 01

- Reiniciar solo `pos-api` en Coolify: `pos-web` sigue sirviéndose (es Nginx estático) y muestra la API en rojo hasta que vuelve.
- Reiniciar solo `pos-web`: la API no se ve afectada.

Los respaldos de PostgreSQL se configuran desde Coolify (endurecimiento formal en la fase 26).
