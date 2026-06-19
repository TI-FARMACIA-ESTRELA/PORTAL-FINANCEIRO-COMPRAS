import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClientInfoParam, type ClientInfo } from '../common/decorators/client-info.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { ActorContext } from '../audit/audit.types';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ReceiptMethodsService } from './receipt-methods.service';
import { CreateReceiptMethodDto } from './dto/create-receipt-method.dto';
import { UpdateReceiptMethodDto } from './dto/update-receipt-method.dto';
import { SetActiveDto } from './dto/set-active.dto';

function buildActor(user: AuthenticatedUser, client: ClientInfo): ActorContext {
  return { userId: user.id, ipAddress: client.ipAddress, userAgent: client.userAgent };
}

@Controller('receipt-methods')
export class ReceiptMethodsController {
  constructor(private readonly service: ReceiptMethodsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DIRETORIA)
  list(@Query() query: PaginationQueryDto) {
    return this.service.list(query);
  }

  @Get('active')
  listActive() {
    return this.service.listActive();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DIRETORIA)
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body() dto: CreateReceiptMethodDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.create(dto, buildActor(user, client));
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReceiptMethodDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.update(id, dto, buildActor(user, client));
  }

  @Patch(':id/active')
  @Roles(Role.ADMIN)
  setActive(
    @Param('id') id: string,
    @Body() dto: SetActiveDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.setActive(id, dto.isActive, dto.reason, buildActor(user, client));
  }
}
