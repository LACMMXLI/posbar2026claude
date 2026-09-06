import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Logs estructurados con Pino. Cada línea lleva `requestId`; a partir de la fase 02
 * el TenantContext añadirá `businessId` sin tocar este archivo.
 */
export function buildLoggerParams(level: string, pretty: boolean): Params {
  return {
    pinoHttp: {
      level,
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const incoming = req.headers[REQUEST_ID_HEADER];
        const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
        res.setHeader(REQUEST_ID_HEADER, id);
        return id;
      },
      customProps: (req: IncomingMessage) => ({ requestId: req.id }),
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      ...(pretty ? { transport: { target: 'pino-pretty', options: { singleLine: true } } } : {}),
    },
  };
}
