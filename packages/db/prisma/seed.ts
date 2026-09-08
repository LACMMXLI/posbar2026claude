// Semillas fijas de desarrollo: dos negocios ficticios con dos sucursales cada
// uno. Corre con el rol de migración (dueño de las tablas, bypassa RLS por ser
// el dueño); nunca se usa contra producción. Ver docs/MULTITENANCY.md.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_BUSINESSES = [
  { slug: 'la-terraza', name: 'La Terraza' },
  { slug: 'el-mirador', name: 'El Mirador' },
] as const;

async function main(): Promise<void> {
  for (const { slug, name } of SEED_BUSINESSES) {
    const business = await prisma.business.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name,
        settings: { create: {} },
        branches: {
          create: [
            { name: `${name} Centro`, code: 'CENTRO' },
            { name: `${name} Norte`, code: 'NORTE' },
          ],
        },
      },
    });
    console.log(`Semilla: ${business.name} (${business.id})`);
  }
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
