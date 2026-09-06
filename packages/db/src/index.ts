// Punto de entrada de @posbar/db. En la fase 01 no exporta cliente alguno:
// el acceso a datos con contexto de tenant (TenantPrismaService) nace en la fase 02.
export const DB_PACKAGE = '@posbar/db' as const;
