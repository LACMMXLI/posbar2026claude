-- Fase 02: núcleo multi-tenant. Escrita a mano (no hay PostgreSQL en el entorno
-- de desarrollo de esta sesión); antes de aplicarla en un entorno real, validar
-- con `prisma migrate diff` o `prisma migrate dev` contra el esquema de
-- packages/db/prisma/schema/tenancy.prisma. Ver docs/PROJECT_STATE.md.

-- CreateEnum
CREATE TYPE "business_status" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "platform_role" AS ENUM ('SUPERADMIN');
CREATE TYPE "subscription_status" AS ENUM ('TRIALING', 'ACTIVE', 'CANCELED');

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "business_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "tax_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "platform_role" NOT NULL DEFAULT 'SUPERADMIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'TRIALING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");
CREATE INDEX "branches_business_id_idx" ON "branches"("business_id");
CREATE UNIQUE INDEX "branches_business_id_code_key" ON "branches"("business_id", "code");
CREATE UNIQUE INDEX "business_settings_business_id_key" ON "business_settings"("business_id");
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");
CREATE INDEX "subscriptions_business_id_idx" ON "subscriptions"("business_id");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Aislamiento de tenant: roles de PostgreSQL y Row Level Security (fase 02).
-- Ver docs/MULTITENANCY.md. Convención para toda tabla nueva con business_id:
--   1. ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
--   2. ALTER TABLE ... FORCE ROW LEVEL SECURITY;   (aplica incluso al dueño)
--   3. Política que compara contra current_setting('app.business_id', true).
-- Las tablas del reino de plataforma (sin business_id) usan
-- current_setting('app.realm', true) = 'platform' en su lugar.
--
-- El rol que corre esta migración (dueño de las tablas) sigue siendo el único
-- con permiso para desactivar RLS o alterar políticas. `posbar_app` es el rol
-- de aplicación: sin BYPASSRLS, sin superusuario, sin ser dueño de nada.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'posbar_app') THEN
    CREATE ROLE posbar_app LOGIN PASSWORD 'posbar_app_dev' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO posbar_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO posbar_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO posbar_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO posbar_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO posbar_app;

-- businesses es la raíz del tenant: se filtra por su propio id.
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "businesses" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "businesses"
  USING (id = NULLIF(current_setting('app.business_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.business_id', true), '')::uuid);

ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branches" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "branches"
  USING (business_id = NULLIF(current_setting('app.business_id', true), '')::uuid)
  WITH CHECK (business_id = NULLIF(current_setting('app.business_id', true), '')::uuid);

ALTER TABLE "business_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_settings" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "business_settings"
  USING (business_id = NULLIF(current_setting('app.business_id', true), '')::uuid)
  WITH CHECK (business_id = NULLIF(current_setting('app.business_id', true), '')::uuid);

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "subscriptions"
  USING (business_id = NULLIF(current_setting('app.business_id', true), '')::uuid)
  WITH CHECK (business_id = NULLIF(current_setting('app.business_id', true), '')::uuid);

-- platform_users / plans: reino de plataforma, sin business_id. Solo visibles
-- cuando la sesión declaró explícitamente el realm de plataforma a través del
-- único punto de escape auditado (TenantPrismaService.withPlatform, en
-- apps/api/src/modules/tenancy/).
ALTER TABLE "platform_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_users" FORCE ROW LEVEL SECURITY;
CREATE POLICY platform_only ON "platform_users"
  USING (current_setting('app.realm', true) = 'platform')
  WITH CHECK (current_setting('app.realm', true) = 'platform');

ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plans" FORCE ROW LEVEL SECURITY;
CREATE POLICY platform_only ON "plans"
  USING (current_setting('app.realm', true) = 'platform')
  WITH CHECK (current_setting('app.realm', true) = 'platform');
