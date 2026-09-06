import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { DependencyHealth, HealthResponse } from '@posbar/contracts';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { ENV, type Env } from '../config/env.token';

const CHECK_TIMEOUT_MS = 2000;

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly redis: Redis;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.pool = new Pool({
      connectionString: env.databaseUrl,
      max: 2,
      connectionTimeoutMillis: CHECK_TIMEOUT_MS,
    });
    this.redis = new Redis(env.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: CHECK_TIMEOUT_MS,
      enableOfflineQueue: false,
    });
    // El fallo se reporta en `check()`; sin este manejador ioredis emite un error no controlado.
    this.redis.on('error', () => undefined);
  }

  async check(): Promise<HealthResponse> {
    const [postgres, redis] = await Promise.all([this.checkPostgres(), this.checkRedis()]);
    const allUp = postgres.status === 'up' && redis.status === 'up';
    return {
      status: allUp ? 'ok' : 'degraded',
      version: this.env.version,
      timestamp: new Date().toISOString(),
      checks: { postgres, redis },
    };
  }

  private async checkPostgres(): Promise<DependencyHealth> {
    return this.timed(async () => {
      await this.pool.query('SELECT 1');
    });
  }

  private async checkRedis(): Promise<DependencyHealth> {
    return this.timed(async () => {
      if (this.redis.status !== 'ready') await this.redis.connect();
      const reply = await this.redis.ping();
      if (reply !== 'PONG') throw new Error(`Respuesta inesperada de Redis: ${reply}`);
    });
  }

  private async timed(probe: () => Promise<void>): Promise<DependencyHealth> {
    const started = Date.now();
    try {
      await withTimeout(probe(), CHECK_TIMEOUT_MS);
      return { status: 'up', latencyMs: Date.now() - started };
    } catch (err) {
      return {
        status: 'down',
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([this.pool.end(), this.redis.quit()]);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Tiempo de espera agotado (${ms} ms)`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
