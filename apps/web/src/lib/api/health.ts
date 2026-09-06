import { healthResponseSchema, type HealthResponse } from '@posbar/contracts';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** Consulta `/health` y valida la respuesta contra el contrato compartido. */
export async function fetchHealth(fetchImpl: typeof fetch = fetch): Promise<HealthResponse> {
  const res = await fetchImpl(`${API_URL}/health`, { headers: { accept: 'application/json' } });
  // 503 también trae cuerpo válido: el estado degradado es información, no error de red.
  if (res.status !== 200 && res.status !== 503) {
    throw new Error(`La API respondió ${res.status}`);
  }
  return healthResponseSchema.parse(await res.json());
}
