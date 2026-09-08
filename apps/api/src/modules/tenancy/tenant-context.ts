import { AsyncLocalStorage } from 'node:async_hooks';

/** `tenant`: contexto de negocio normal. `platform`: reino de plataforma, sin business_id. */
export type TenantStore =
  { readonly realm: 'tenant'; readonly businessId: string } | { readonly realm: 'platform' };

const storage = new AsyncLocalStorage<TenantStore>();

/**
 * Frontera de identidad de tenant en el proceso (capa 2 de 3, ver
 * docs/MULTITENANCY.md). Vive en memoria vía AsyncLocalStorage, nunca como
 * parámetro explícito, para que cualquier código que corra dentro de la
 * petición —servicios, TenantPrismaService— pueda leer el contexto activo sin
 * que cada función de la cadena tenga que reenviarlo.
 */
export class TenantContext {
  private constructor() {}

  static run<T>(store: TenantStore, fn: () => T): T {
    return storage.run(store, fn);
  }

  static get current(): TenantStore | undefined {
    return storage.getStore();
  }

  static get isPlatform(): boolean {
    return storage.getStore()?.realm === 'platform';
  }

  /** Lanza si no hay contexto de negocio activo: error de programación, no de usuario. */
  static requireBusinessId(): string {
    const store = storage.getStore();
    if (!store || store.realm !== 'tenant') {
      throw new Error('TenantContext: se requiere contexto de negocio y no hay ninguno activo.');
    }
    return store.businessId;
  }
}
