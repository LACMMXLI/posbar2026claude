import { Test } from '@nestjs/testing';
import { PrismaClient } from '@posbar/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { TenantPrismaService } from '../src/modules/tenancy';

// Real contra PostgreSQL (CI lo provee; en local exige `pnpm dev` + roles/RLS
// aplicados de packages/db/prisma/migrations/20260908120000_init_tenancy).
const hasInfra = Boolean(process.env['DATABASE_URL'] && process.env['DATABASE_APP_URL']);

describe.skipIf(!hasInfra)('Aislamiento de tenant (integración)', () => {
  // Rol dueño: bypassa RLS por ser dueño de las tablas, solo para preparar datos de prueba.
  const owner = new PrismaClient();
  let tenantPrisma: TenantPrismaService;
  let businessA: string;
  let businessB: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication({ logger: false });
    await app.init();
    tenantPrisma = app.get(TenantPrismaService);

    const suffix = Date.now();
    const a = await owner.business.create({
      data: {
        slug: `test-a-${suffix}`,
        name: 'Negocio A de prueba',
        branches: { create: { name: 'Sucursal A', code: 'A1' } },
      },
    });
    const b = await owner.business.create({
      data: {
        slug: `test-b-${suffix}`,
        name: 'Negocio B de prueba',
        branches: { create: { name: 'Sucursal B', code: 'B1' } },
      },
    });
    businessA = a.id;
    businessB = b.id;
  });

  afterAll(async () => {
    await owner.branch.deleteMany({ where: { businessId: { in: [businessA, businessB] } } });
    await owner.business.deleteMany({ where: { id: { in: [businessA, businessB] } } });
    await owner.$disconnect();
  });

  it('RLS bloquea filas de otro negocio aun con SQL crudo sin filtro', async () => {
    const rows = await tenantPrisma.withTenant(businessA, (tx) =>
      tx.$queryRawUnsafe<Array<{ business_id: string }>>('SELECT business_id FROM branches'),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.business_id === businessA)).toBe(true);
    expect(rows.some((r) => r.business_id === businessB)).toBe(false);
  });

  it('findMany sin where también queda acotado al negocio del contexto', async () => {
    const branches = await tenantPrisma.withTenant(businessA, (tx) => tx.branch.findMany());
    expect(branches.length).toBeGreaterThan(0);
    expect(branches.every((b) => b.businessId === businessA)).toBe(true);
  });

  it('el negocio B no ve nada del negocio A', async () => {
    const branches = await tenantPrisma.withTenant(businessB, (tx) => tx.branch.findMany());
    expect(branches.every((b) => b.businessId === businessB)).toBe(true);
  });
});
