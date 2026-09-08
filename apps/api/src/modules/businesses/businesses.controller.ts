import { Body, Controller, Get, Patch } from '@nestjs/common';
import { updateBusinessSchema } from '@posbar/contracts';
import { BusinessesService } from './businesses.service';

/** Cabecera `x-business-id` obligatoria (TenantIdentityMiddleware) hasta la fase 03. */
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get('me')
  getCurrent() {
    return this.businesses.getCurrent();
  }

  @Patch('me')
  updateCurrent(@Body() body: unknown) {
    return this.businesses.updateCurrent(updateBusinessSchema.parse(body));
  }
}
