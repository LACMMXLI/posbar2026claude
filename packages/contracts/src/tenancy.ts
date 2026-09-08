import { z } from 'zod';

// Frontera entre apps (regla 5 de CLAUDE.md): apps/web solo lee estos esquemas,
// nunca apps/api directamente. Refleja packages/db/prisma/schema/tenancy.prisma.

export const businessStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);
export type BusinessStatus = z.infer<typeof businessStatusSchema>;

export const businessSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  status: businessStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Business = z.infer<typeof businessSchema>;

/** `PATCH /businesses/me`. No incluye `slug` ni `status`: aún no hay flujo de alta/baja. */
export const updateBusinessSchema = z.object({
  name: z.string().min(1).max(120).optional(),
});
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export const branchSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().min(1),
  timezone: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Branch = z.infer<typeof branchSchema>;

/** `POST /branches`. */
export const createBranchSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(20),
  timezone: z.string().min(1).optional(),
});
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

/** `PATCH /branches/:id`. */
export const updateBranchSchema = createBranchSchema.partial();
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
