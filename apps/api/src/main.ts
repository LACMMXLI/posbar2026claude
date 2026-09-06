import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableCors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') });
  app.enableShutdownHooks();
  await app.listen(env.port, '0.0.0.0');
  app.get(Logger).log(`pos-api escuchando en :${env.port} (${env.nodeEnv})`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
