// Lectura tipada de variables de entorno. Falla al arrancar si falta algo obligatorio.
export interface Env {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  logLevel: string;
  databaseUrl: string;
  /** Rol de aplicación (sin BYPASSRLS): la única cadena de conexión que usa
   * TenantPrismaService. `databaseUrl` queda para migraciones/semillas. */
  databaseAppUrl: string;
  redisUrl: string;
  corsOrigin: string;
  version: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable de entorno obligatoria ausente: ${name}`);
  return value;
}

export function loadEnv(): Env {
  const nodeEnv = (process.env['NODE_ENV'] ?? 'development') as Env['nodeEnv'];
  return {
    nodeEnv,
    port: Number(process.env['API_PORT'] ?? process.env['PORT'] ?? 3000),
    logLevel: process.env['LOG_LEVEL'] ?? (nodeEnv === 'production' ? 'info' : 'debug'),
    databaseUrl: required('DATABASE_URL'),
    databaseAppUrl: required('DATABASE_APP_URL'),
    redisUrl: required('REDIS_URL'),
    corsOrigin: process.env['CORS_ORIGIN'] ?? '*',
    version: process.env['APP_VERSION'] ?? process.env['npm_package_version'] ?? '0.1.0',
  };
}
