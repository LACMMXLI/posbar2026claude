import { Injectable, NotFoundException } from '@nestjs/common';
import type { UpdateBusinessInput } from '@posbar/contracts';
import { TenantContext, TenantPrismaService } from '../tenancy';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: TenantPrismaService) {}

  getCurrent() {
    const businessId = TenantContext.requireBusinessId();
    return this.prisma.withTenant(businessId, async (tx) => {
      const business = await tx.business.findUnique({ where: { id: businessId } });
      if (!business)
        throw new NotFoundException('Negocio no encontrado en este contexto de tenant.');
      return business;
    });
  }

  updateCurrent(input: UpdateBusinessInput) {
    const businessId = TenantContext.requireBusinessId();
    return this.prisma.withTenant(businessId, (tx) =>
      tx.business.update({ where: { id: businessId }, data: omitUndefined(input) }),
    );
  }
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
