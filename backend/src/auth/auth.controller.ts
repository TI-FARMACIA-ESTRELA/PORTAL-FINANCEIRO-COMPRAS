import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClientInfoParam, type ClientInfo } from '../common/decorators/client-info.decorator';
import type { AuthenticatedUser } from './auth.types';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { REFRESH_COOKIE_NAME, buildRefreshCookieOptions } from './cookie.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @ClientInfoParam() client: ClientInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.login(
      dto.userNumber,
      dto.password,
      { ipAddress: client.ipAddress, userAgent: client.userAgent },
    );
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, buildRefreshCookieOptions(this.config));
    return { user, accessToken };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    return this.authService.refresh(token);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfoParam() client: ClientInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout({
      userId: user.id,
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });
    const options = buildRefreshCookieOptions(this.config);
    res.clearCookie(REFRESH_COOKIE_NAME, { ...options, maxAge: undefined });
    return { success: true };
  }
}
