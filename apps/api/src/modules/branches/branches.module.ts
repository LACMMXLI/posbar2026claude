import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { TenantIdentityMiddleware } from '../tenancy';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
  controllers: [BranchesController],
  providers: [BranchesService],
})
export class BranchesModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantIdentityMiddleware).forRoutes(BranchesController);
  }
}
