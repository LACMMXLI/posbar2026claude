import { Global, Module } from '@nestjs/common';
import { TenantPrismaService } from './tenant-prisma.service';

/**
 * Global: TenantPrismaService es el único cliente de base de datos de la API
 * (ver docs/MULTITENANCY.md). Cualquier módulo lo inyecta sin reimportar este
 * módulo explícitamente.
 */
@Global()
@Module({
  providers: [TenantPrismaService],
  exports: [TenantPrismaService],
})
export class TenancyModule {}
