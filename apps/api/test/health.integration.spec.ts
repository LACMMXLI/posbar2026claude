import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

// Integración real contra PostgreSQL y Redis (CI los provee; en local exige `pnpm dev`).
// Sin DATABASE_URL/REDIS_URL la prueba se omite en lugar de fallar por entorno.
const hasInfra = Boolean(process.env['DATABASE_URL'] && process.env['REDIS_URL']);

describe.skipIf(!hasInfra)('GET /health (integración)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('reporta postgres y redis arriba y propaga x-request-id', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'prueba-123')
      .expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.postgres.status).toBe('up');
    expect(res.body.checks.redis.status).toBe('up');
    expect(res.headers['x-request-id']).toBe('prueba-123');
  });
});
