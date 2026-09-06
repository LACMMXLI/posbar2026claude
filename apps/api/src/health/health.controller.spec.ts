import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { HealthResponse } from '@posbar/contracts';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

function fakeResponse(): Response & { statusCode: number } {
  const res = { statusCode: 200 } as Response & { statusCode: number };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  }) as unknown as Response['status'];
  return res;
}

async function buildController(result: HealthResponse): Promise<HealthController> {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [{ provide: HealthService, useValue: { check: vi.fn().mockResolvedValue(result) } }],
  }).compile();
  return moduleRef.get(HealthController);
}

const base: HealthResponse = {
  status: 'ok',
  version: 'test',
  timestamp: new Date().toISOString(),
  checks: { postgres: { status: 'up', latencyMs: 1 }, redis: { status: 'up', latencyMs: 1 } },
};

describe('HealthController', () => {
  it('responde 200 cuando todas las dependencias están arriba', async () => {
    const controller = await buildController(base);
    const res = fakeResponse();
    const body = await controller.get(res);
    expect(body.status).toBe('ok');
    expect(res.statusCode).toBe(HttpStatus.OK);
  });

  it('responde 503 y detalla el fallo cuando una dependencia está caída', async () => {
    const degraded: HealthResponse = {
      ...base,
      status: 'degraded',
      checks: { ...base.checks, redis: { status: 'down', error: 'ECONNREFUSED' } },
    };
    const controller = await buildController(degraded);
    const res = fakeResponse();
    const body = await controller.get(res);
    expect(body.checks.redis.status).toBe('down');
    expect(res.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });
});
