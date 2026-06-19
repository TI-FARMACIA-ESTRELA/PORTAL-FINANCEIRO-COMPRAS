import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClientInfoParam, type ClientInfo } from '../common/decorators/client-info.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { ActorContext } from '../audit/audit.types';
import { CurrentAccountsService } from './current-accounts.service';
import { CreateCurrentAccountDto } from './dto/create-current-account.dto';
import { UpdateCurrentAccountDto } from './dto/update-current-account.dto';
import { SetCurrentAccountActiveDto } from './dto/set-active.dto';
import { ShareCurrentAccountDto } from './dto/share-current-account.dto';
import {
  CreateEntryMovementDto,
  CreateExitMovementDto,
  CreateAdjustmentMovementDto,
} from './dto/create-movement.dto';
import { ReverseMovementDto } from './dto/reverse-movement.dto';
import { QueryCurrentAccountsDto } from './dto/query-current-accounts.dto';
import { QueryCurrentAccountMovementsDto } from './dto/query-movements.dto';

function actorOf(user: AuthenticatedUser, client: ClientInfo): ActorContext {
  return { userId: user.id, ipAddress: client.ipAddress, userAgent: client.userAgent };
}

@Controller('current-accounts')
export class CurrentAccountsController {
  constructor(private readonly service: CurrentAccountsService) {}

  @Get()
  list(@Query() query: QueryCurrentAccountsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(query, user);
  }

  @Get('summary')
  summary(@Query() query: QueryCurrentAccountsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.summary(query, user);
  }

  // Usuários ativos para seleção de dono / compartilhamento.
  @Get('options/users')
  userOptions() {
    return this.service.listUserOptions();
  }

  /** Contas elegíveis para crédito via recebimento (mesmo fornecedor). */
  @Get('options/for-receipt')
  @Roles(Role.ADMIN, Role.COMPRADOR)
  listForReceipt(@Query('supplierId') supplierId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listForReceipt(supplierId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findById(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.COMPRADOR)
  create(
    @Body() dto: CreateCurrentAccountDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.create(dto, user, actorOf(user, client));
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.COMPRADOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCurrentAccountDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.update(id, dto, user, actorOf(user, client));
  }

  @Patch(':id/active')
  @Roles(Role.ADMIN, Role.COMPRADOR)
  setActive(
    @Param('id') id: string,
    @Body() dto: SetCurrentAccountActiveDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.setActive(id, dto.isActive, dto.reason, user, actorOf(user, client));
  }

  @Patch(':id/share')
  @Roles(Role.ADMIN, Role.COMPRADOR)
  share(
    @Param('id') id: string,
    @Body() dto: ShareCurrentAccountDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.share(id, dto, user, actorOf(user, client));
  }

  @Get(':id/movements')
  movements(
    @Param('id') id: string,
    @Query() query: QueryCurrentAccountMovementsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.listMovements(id, query, user);
  }

  @Post(':id/movements/entry')
  @Roles(Role.ADMIN, Role.COMPRADOR)
  entry(
    @Param('id') id: string,
    @Body() dto: CreateEntryMovementDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.createEntry(id, dto, user, actorOf(user, client));
  }

  @Post(':id/movements/exit')
  @Roles(Role.ADMIN, Role.COMPRADOR)
  exit(
    @Param('id') id: string,
    @Body() dto: CreateExitMovementDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.createExit(id, dto, user, actorOf(user, client));
  }

  // Ajuste: somente ADMIN.
  @Post(':id/movements/adjustment')
  @Roles(Role.ADMIN)
  adjustment(
    @Param('id') id: string,
    @Body() dto: CreateAdjustmentMovementDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.createAdjustment(id, dto, user, actorOf(user, client));
  }

  // Estorno: somente ADMIN.
  @Patch(':id/movements/:movementId/reverse')
  @Roles(Role.ADMIN)
  reverse(
    @Param('id') id: string,
    @Param('movementId') movementId: string,
    @Body() dto: ReverseMovementDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.service.reverseMovement(id, movementId, dto.reason, user, actorOf(user, client));
  }
}
