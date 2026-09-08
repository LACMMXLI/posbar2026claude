import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { buildLoggerParams } from './common/logger';
import { type Env, loadEnv } from './config/env';
import { ENV } from './config/env.token';
import { BranchesModule } from './modules/branches/branches.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { TenancyModule } from './modules/tenancy';
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
    TenancyModule,
    HealthModule,
    BusinessesModule,
    BranchesModule,
  ],
})
export class AppModule {}
