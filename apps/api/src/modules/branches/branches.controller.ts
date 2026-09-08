import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { createBranchSchema, updateBranchSchema } from '@posbar/contracts';
import { BranchesService } from './branches.service';

/** Cabecera `x-business-id` obligatoria (TenantIdentityMiddleware) hasta la fase 03. */
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  list() {
    return this.branches.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.branches.getById(id);
  }

  @Post()
  create(@Body() body: unknown) {
    return this.branches.create(createBranchSchema.parse(body));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.branches.update(id, updateBranchSchema.parse(body));
  }
}
