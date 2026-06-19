import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClientInfoParam, type ClientInfo } from '../common/decorators/client-info.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { ActorContext } from '../audit/audit.types';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetActiveDto } from './dto/set-active.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangeRoleDto } from './dto/change-role.dto';

function buildActor(user: AuthenticatedUser, client: ClientInfo): ActorContext {
  return { userId: user.id, ipAddress: client.ipAddress, userAgent: client.userAgent };
}

// Todas as rotas exigem autenticação (JwtAuthGuard global) e perfil ADMIN.
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.usersService.create(dto, buildActor(user, client));
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.usersService.update(id, dto, buildActor(user, client));
  }

  @Patch(':id/active')
  setActive(
    @Param('id') id: string,
    @Body() dto: SetActiveDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.usersService.setActive(id, dto.isActive, dto.reason, buildActor(user, client));
  }

  @Patch(':id/password')
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.usersService.resetPassword(id, dto.password, dto.reason, buildActor(user, client));
  }

  @Patch(':id/role')
  changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() requester: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
  ) {
    return this.usersService.changeRole(
      id,
      dto.role,
      dto.reason,
      requester.id,
      buildActor(requester, client),
    );
  }
}
