import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { TenantIdentityMiddleware } from '../tenancy';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';

@Module({
  controllers: [BusinessesController],
  providers: [BusinessesService],
})
export class BusinessesModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantIdentityMiddleware).forRoutes(BusinessesController);
  }
}
