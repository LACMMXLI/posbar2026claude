import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@posbar/db';
import { ENV, type Env } from '../../config/env.token';
import { TenantContext } from './tenant-context';

/**
 * Modelos con columna `business_id` (ver packages/db/prisma/schema/tenancy.prisma).
 * Nombres de propiedad del cliente Prisma: primera letra en minúscula del modelo.
 * Se usa para que la extensión inyecte business_id sin tocar cada llamada — es
 * una red de seguridad adicional; el filtro real y obligatorio es RLS (capa 1).
 */
const TENANT_SCOPED_MODELS = new Set(['branch', 'businessSettings', 'subscription']);

function withTenantExtension(client: PrismaClient) {
  return client.$extends({
    name: 'tenant-scoping',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const store = TenantContext.current;
          if (
            !store ||
            store.realm !== 'tenant' ||
            !model ||
            !TENANT_SCOPED_MODELS.has(uncapitalize(model))
          ) {
            return query(args);
          }
          return injectBusinessId(
            operation,
            args as Record<string, unknown>,
            store.businessId,
            query,
          );
        },
      },
    },
  });
}

function uncapitalize(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toLowerCase() + value.slice(1);
}

async function injectBusinessId(
  operation: string,
  args: Record<string, unknown>,
  businessId: string,
  query: (args: unknown) => Promise<unknown>,
): Promise<unknown> {
  const withBusinessWhere = (where: unknown) => ({
    ...(where as Record<string, unknown> | undefined),
    businessId,
  });
  switch (operation) {
    case 'findMany':
    case 'findFirst':
    case 'findFirstOrThrow':
    case 'count':
    case 'aggregate':
    case 'updateMany':
    case 'deleteMany':
      args['where'] = withBusinessWhere(args['where']);
      break;
    case 'create':
      args['data'] = { ...(args['data'] as Record<string, unknown>), businessId };
      break;
    case 'createMany':
      args['data'] = Array.isArray(args['data'])
        ? (args['data'] as Array<Record<string, unknown>>).map((d) => ({ ...d, businessId }))
        : args['data'];
      break;
    case 'upsert':
      args['where'] = withBusinessWhere(args['where']);
      args['create'] = { ...(args['create'] as Record<string, unknown>), businessId };
      break;
    // findUnique/update/delete no llevan business_id en el filtro (van por id):
    // RLS es quien decide si la fila es visible o modificable en ese contexto.
    default:
      break;
  }
  return query(args);
}

/**
 * Único punto por el que el resto de la API toca PostgreSQL (capa 2 del
 * aislamiento de tenant, ver docs/MULTITENANCY.md). Cliente Prisma crudo
 * prohibido fuera de este módulo: todo query pasa por withTenant() o por el
 * escape auditado withPlatform().
 */
@Injectable()
export class TenantPrismaService implements OnModuleDestroy {
  private readonly client: ReturnType<typeof withTenantExtension>;

  constructor(@Inject(ENV) env: Env) {
    this.client = withTenantExtension(new PrismaClient({ datasourceUrl: env.databaseAppUrl }));
  }

  /**
   * Abre una transacción y fija `app.business_id`/`app.realm` a nivel de sesión
   * de PostgreSQL (para que RLS los aplique) mientras corre `fn`. El mismo valor
   * se refleja en TenantContext para que la extensión de Prisma inyecte
   * business_id en creaciones y filtros.
   */
  async withTenant<T>(
    businessId: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.realm', 'tenant', true)`;
      await tx.$executeRaw`SELECT set_config('app.business_id', ${businessId}, true)`;
      // La transacción extendida es estructuralmente compatible con TransactionClient
      // (mismos modelos y operaciones); la extensión de Prisma solo añade metadatos de tipo.
      return TenantContext.run({ realm: 'tenant', businessId }, () =>
        fn(tx as unknown as Prisma.TransactionClient),
      );
    });
  }

  /**
   * Único punto de escape auditado hacia el reino de plataforma (fase 02:
   * existe como infraestructura; el primer llamador real llega en fase 03/04).
   * `app.business_id` nunca se fija aquí, así que RLS sigue bloqueando toda
   * tabla de negocio; solo platform_users/plans quedan visibles.
   */
  async withPlatform<T>(
    reason: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.realm', 'platform', true)`;
      // Auditoría real (tabla, requestId) llega en la fase 05 con el módulo `audit`.
      console.warn(`[tenancy] acceso de plataforma: ${reason}`);
      return TenantContext.run({ realm: 'platform' }, () =>
        fn(tx as unknown as Prisma.TransactionClient),
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
