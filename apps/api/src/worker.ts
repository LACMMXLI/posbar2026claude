import 'reflect-metadata';
import Redis from 'ioredis';
import pino from 'pino';
import { loadEnv } from './config/env';

/**
 * pos-worker: misma imagen que la API, distinto comando. En la fase 01 solo
 * demuestra que arranca, alcanza Redis y se apaga limpiamente. Las colas BullMQ
 * llegan con la impresión (fase 18) y los reportes (fase 23).
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const log = pino({ level: env.logLevel, base: { service: 'pos-worker' } });
  const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: 3 });

  redis.on('error', (err) => log.error({ err }, 'error de Redis'));
  await redis.ping();
  log.info('pos-worker listo; sin colas registradas todavía');

  const heartbeat = setInterval(() => {
    redis.ping().catch((err) => log.warn({ err }, 'latido fallido'));
  }, 30_000);

  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, 'apagando pos-worker');
    clearInterval(heartbeat);
    await redis.quit();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
