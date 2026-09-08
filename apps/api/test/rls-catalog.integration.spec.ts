import { PrismaClient } from '@posbar/db';
import { afterAll, describe, expect, it } from 'vitest';

const hasInfra = Boolean(process.env['DATABASE_URL']);

interface TableRlsRow {
  tablename: string;
  relrowsecurity: boolean;
  relforcerowsecurity: boolean;
}

describe.skipIf(!hasInfra)('Catálogo de RLS (integración)', () => {
  const owner = new PrismaClient();

  afterAll(async () => {
    await owner.$disconnect();
  });

  it('toda tabla operativa con business_id tiene RLS habilitado y forzado', async () => {
    const rows = await owner.$queryRawUnsafe<TableRlsRow[]>(`
      SELECT DISTINCT c.relname AS tablename, c.relrowsecurity, c.relforcerowsecurity
      FROM information_schema.columns col
      JOIN pg_class c ON c.relname = col.table_name AND c.relkind = 'r'
      WHERE col.table_schema = 'public' AND col.column_name = 'business_id'
    `);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.relrowsecurity, `${row.tablename} sin RLS habilitado`).toBe(true);
      expect(row.relforcerowsecurity, `${row.tablename} sin RLS forzado (FORCE)`).toBe(true);
    }
  });
});
