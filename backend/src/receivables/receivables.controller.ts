import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClientInfoParam, type ClientInfo } from '../common/decorators/client-info.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { ActorContext } from '../audit/audit.types';
import { ReceivablesService } from './receivables.service';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { UpdateReceivableDto } from './dto/update-receivable.dto';
import { CancelReceivableDto } from './dto/cancel-receivable.dto';
import { QueryReceivablesDto } from './dto/query-receivables.dto';

function actorOf(user: AuthenticatedUser, client: ClientInfo): ActorContext {
  return { userId: user.id, ipAddress: client.ipAddress, userAgent: client.userAgent };
}

@Controller('receivables')
export class ReceivablesController {
  constructor(private readonly service: ReceivablesService) {}

  // Listagem (escopo aplicado no service: COMPRADOR vê apenas os próprios).
  @Get()
  list(@Query() query: QueryReceivablesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(query, user);
  }

  // KPIs — declarado antes de :id para não colidir com a rota dinâmica.
  @Get('summary')
  summary(@Query() query: QueryReceivablesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.summary(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findById(id, user);
  }

  // Criação: ADMIN e COMPRADOR. DIRETORIA recebe 403.
  @Post()
  @Roles(Role.ADMIN, Role.COMPRADOR)
  create(
    @Body() dto: CreateReceivableDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.create(dto, user, actorOf(user, client));
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.COMPRADOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReceivableDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.update(id, dto, user, actorOf(user, client));
  }

  @Patch(':id/cancel')
  @Roles(Role.ADMIN, Role.COMPRADOR)
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelReceivableDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.cancel(id, dto.reason, user, actorOf(user, client));
  }
}
