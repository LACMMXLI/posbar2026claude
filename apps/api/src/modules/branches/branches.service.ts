import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateBranchInput, UpdateBranchInput } from '@posbar/contracts';
import { TenantContext, TenantPrismaService } from '../tenancy';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: TenantPrismaService) {}

  list() {
    const businessId = TenantContext.requireBusinessId();
    return this.prisma.withTenant(businessId, (tx) =>
      tx.branch.findMany({ orderBy: { createdAt: 'asc' } }),
    );
  }

  getById(id: string) {
    const businessId = TenantContext.requireBusinessId();
    return this.prisma.withTenant(businessId, async (tx) => {
      const branch = await tx.branch.findUnique({ where: { id } });
      if (!branch)
        throw new NotFoundException('Sucursal no encontrada en este contexto de tenant.');
      return branch;
    });
  }

  async create(input: CreateBranchInput) {
    const businessId = TenantContext.requireBusinessId();
    try {
      return await this.prisma.withTenant(businessId, (tx) =>
        tx.branch.create({
          // businessId explícito: la extensión de tenancy también lo inyecta (defensa en
          // profundidad), pero el tipo de Prisma lo exige en el sitio de la llamada.
          data: {
            businessId,
            name: input.name,
            code: input.code,
            ...omitUndefined({ timezone: input.timezone }),
          },
        }),
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `Ya existe una sucursal con el código «${input.code}» en este negocio.`,
        );
      }
      throw err;
    }
  }

  update(id: string, input: UpdateBranchInput) {
    const businessId = TenantContext.requireBusinessId();
    return this.prisma.withTenant(businessId, (tx) =>
      tx.branch.update({ where: { id }, data: omitUndefined(input) }),
    );
  }
}

/** Código P2002 de Prisma: violación de restricción única (aquí, `business_id, code`). */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  );
}

/** `exactOptionalPropertyTypes` no deja pasar claves con valor `undefined` a los tipos de Prisma. */
function omitUndefined<T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out as { [K in keyof T]?: Exclude<T[K], undefined> };
}
