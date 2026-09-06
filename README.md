# POS Bar

POS SaaS multi-tenant para bares. Monorepo pnpm + Turborepo: NestJS (`apps/api`), React PWA (`apps/web`), agente de impresión (`apps/print-agent`), contratos Zod (`packages/contracts`) y esquema Prisma (`packages/db`).

- Guía para agentes y comandos: [`CLAUDE.md`](CLAUDE.md)
- Estado actual: [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md)
- Hoja de ruta: [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) · encargos por fase en [`docs/phases/`](docs/phases/)
- Despliegue: [`deploy/README.md`](deploy/README.md)

```bash
cp .env.example .env && pnpm install && pnpm dev
```
