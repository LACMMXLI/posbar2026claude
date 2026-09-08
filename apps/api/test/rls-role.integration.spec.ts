import { PrismaClient } from '@posbar/db';
import { afterAll, describe, expect, it } from 'vitest';

const hasInfra = Boolean(process.env['DATABASE_APP_URL']);

describe.skipIf(!hasInfra)('Rol de aplicación posbar_app (integración)', () => {
  // El valor real solo importa cuando hasInfra es true; en su ausencia el describe
  // se salta y este cliente nunca se conecta.
  const appClient = new PrismaClient({
    datasourceUrl: process.env['DATABASE_APP_URL'] ?? 'postgresql://unset/unset',
  });

  afterAll(async () => {
    await appClient.$disconnect();
  });

  it('no puede desactivar RLS: no es dueño de las tablas ni tiene BYPASSRLS', async () => {
    await expect(
      appClient.$executeRawUnsafe('ALTER TABLE branches DISABLE ROW LEVEL SECURITY'),
    ).rejects.toThrow();
  });

  it('no puede alterar la política de aislamiento', async () => {
    await expect(
      appClient.$executeRawUnsafe('DROP POLICY tenant_isolation ON branches'),
    ).rejects.toThrow();
  });
});
