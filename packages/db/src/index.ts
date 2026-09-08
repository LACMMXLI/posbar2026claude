// Punto de entrada de @posbar/db. Reexporta el cliente Prisma generado para que
// apps/api lo consuma sin depender directamente de @prisma/client. El único
// acceso con contexto de tenant (TenantPrismaService, SET LOCAL + extensión que
// inyecta business_id) vive en apps/api/src/modules/tenancy/ — ver
// docs/MULTITENANCY.md. Prohibido instanciar PrismaClient crudo fuera de ahí.
export { PrismaClient, Prisma } from '@prisma/client';
export * from '@prisma/client';
