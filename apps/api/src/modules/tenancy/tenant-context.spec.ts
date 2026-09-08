import { describe, expect, it } from 'vitest';
import { TenantContext } from './tenant-context';

describe('TenantContext', () => {
  it('expone el business_id solo dentro de run()', () => {
    expect(TenantContext.current).toBeUndefined();
    TenantContext.run({ realm: 'tenant', businessId: 'b1' }, () => {
      expect(TenantContext.requireBusinessId()).toBe('b1');
      expect(TenantContext.isPlatform).toBe(false);
    });
    expect(TenantContext.current).toBeUndefined();
  });

  it('lanza si se pide el business_id sin contexto activo', () => {
    expect(() => TenantContext.requireBusinessId()).toThrow();
  });

  it('lanza si se pide el business_id dentro del escape de plataforma', () => {
    TenantContext.run({ realm: 'platform' }, () => {
      expect(TenantContext.isPlatform).toBe(true);
      expect(() => TenantContext.requireBusinessId()).toThrow();
    });
  });

  it('aísla contextos concurrentes (AsyncLocalStorage no se cruza entre negocios)', async () => {
    const results = await Promise.all(
      ['negocio-a', 'negocio-b'].map((businessId) =>
        TenantContext.run({ realm: 'tenant', businessId }, async () => {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
          return TenantContext.requireBusinessId();
        }),
      ),
    );
    expect(results).toEqual(['negocio-a', 'negocio-b']);
  });
});
