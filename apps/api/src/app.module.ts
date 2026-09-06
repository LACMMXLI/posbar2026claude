import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { buildLoggerParams } from './common/logger';
import { type Env, loadEnv } from './config/env';
import { ENV } from './config/env.token';
import { HealthModule } from './health/health.module';

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: (): Env => loadEnv() }],
  exports: [ENV],
})
export class ConfigModule {}

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => buildLoggerParams(env.logLevel, env.nodeEnv === 'development'),
    }),
    HealthModule,
  ],
})
export class AppModule {}
