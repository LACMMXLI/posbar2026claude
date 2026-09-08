import { BadRequestException, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { TenantContext } from './tenant-context';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TENANT_HEADER = 'x-business-id';

/**
 * Identidad de tenant simulada (criterio de la fase 02): hasta que exista auth
 * real (fase 03) el llamador declara el negocio con la cabecera `x-business-id`.
 * Se sustituirá por el token de sesión sin tocar el resto de la cadena: todo lo
 * demás lee TenantContext, nunca la cabecera directamente.
 */
@Injectable()
export class TenantIdentityMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const businessId = req.header(TENANT_HEADER);
    if (!businessId || !UUID_RE.test(businessId)) {
      throw new BadRequestException(`Cabecera ${TENANT_HEADER} ausente o no es un UUID válido.`);
    }
    TenantContext.run({ realm: 'tenant', businessId }, next);
  }
}
