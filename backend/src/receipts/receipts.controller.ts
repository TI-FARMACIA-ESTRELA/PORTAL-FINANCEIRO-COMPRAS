import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClientInfoParam, type ClientInfo } from '../common/decorators/client-info.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { ActorContext } from '../audit/audit.types';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { ReverseReceiptDto } from './dto/reverse-receipt.dto';
import { QueryReceiptsDto } from './dto/query-receipts.dto';

function actorOf(user: AuthenticatedUser, client: ClientInfo): ActorContext {
  return { userId: user.id, ipAddress: client.ipAddress, userAgent: client.userAgent };
}

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly service: ReceiptsService) {}

  @Get()
  list(@Query() query: QueryReceiptsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(query, user);
  }

  @Get('summary')
  summary(@Query() query: QueryReceiptsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.summary(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findById(id, user);
  }

  // Criar recebimento: ADMIN e COMPRADOR (DIRETORIA recebe 403).
  @Post()
  @Roles(Role.ADMIN, Role.COMPRADOR)
  create(
    @Body() dto: CreateReceiptDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.create(dto, user, actorOf(user, client));
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.COMPRADOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReceiptDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.update(id, dto, user, actorOf(user, client));
  }

  // Confirmar: apenas ADMIN.
  @Patch(':id/confirm')
  @Roles(Role.ADMIN)
  confirm(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.confirm(id, user, actorOf(user, client));
  }

  // Estornar: apenas ADMIN.
  @Patch(':id/reverse')
  @Roles(Role.ADMIN)
  reverse(
    @Param('id') id: string,
    @Body() dto: ReverseReceiptDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.reverse(id, dto.reason, user, actorOf(user, client));
  }
}
