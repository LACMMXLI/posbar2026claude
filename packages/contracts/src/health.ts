import { z } from 'zod';

export const dependencyStatusSchema = z.enum(['up', 'down']);
export type DependencyStatus = z.infer<typeof dependencyStatusSchema>;

export const dependencyHealthSchema = z.object({
  status: dependencyStatusSchema,
  latencyMs: z.number().int().nonnegative().optional(),
  error: z.string().optional(),
});
export type DependencyHealth = z.infer<typeof dependencyHealthSchema>;

/** Respuesta de `GET /health`. Único contrato de la fase 01. */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  timestamp: z.string().datetime(),
  checks: z.object({
    postgres: dependencyHealthSchema,
    redis: dependencyHealthSchema,
  }),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
