import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { HealthResponse } from '@posbar/contracts';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** 200 si todo está arriba; 503 si alguna dependencia falla. El cuerpo siempre detalla. */
  @Get()
  @HttpCode(HttpStatus.OK)
  async get(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const result = await this.health.check();
    if (result.status !== 'ok') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return result;
  }
}
