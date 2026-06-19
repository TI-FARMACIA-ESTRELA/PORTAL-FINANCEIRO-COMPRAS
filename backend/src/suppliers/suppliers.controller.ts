import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClientInfoParam, type ClientInfo } from '../common/decorators/client-info.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { ActorContext } from '../audit/audit.types';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SetActiveDto } from './dto/set-active.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';

function buildActor(user: AuthenticatedUser, client: ClientInfo): ActorContext {
  return { userId: user.id, ipAddress: client.ipAddress, userAgent: client.userAgent };
}

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  // Leitura completa: ADMIN e DIRETORIA.
  @Get()
  @Roles(Role.ADMIN, Role.DIRETORIA)
  list(@Query() query: QuerySupplierDto) {
    return this.suppliersService.list(query);
  }

  // Ativos: disponível a qualquer usuário autenticado (selects das próximas fases).
  @Get('active')
  listActive() {
    return this.suppliersService.listActive();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DIRETORIA)
  findOne(@Param('id') id: string) {
    return this.suppliersService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body() dto: CreateSupplierDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.suppliersService.create(dto, buildActor(user, client));
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.suppliersService.update(id, dto, buildActor(user, client));
  }

  @Patch(':id/active')
  @Roles(Role.ADMIN)
  setActive(
    @Param('id') id: string,
    @Body() dto: SetActiveDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.suppliersService.setActive(id, dto.isActive, dto.reason, buildActor(user, client));
  }
}
