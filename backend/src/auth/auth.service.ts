import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService, type SafeUser } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity, type ActorContext } from '../audit/audit.types';
import type { AuthenticatedUser, JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  /** Valida credenciais (número + senha) e bloqueia usuário inativo. */
  async validateCredentials(
    userNumber: number,
    password: string,
    actor: ActorContext,
  ): Promise<AuthenticatedUser> {
    const genericError = new UnauthorizedException('Número de usuário ou senha inválidos.');

    const user = await this.users.findByUserNumberWithHash(userNumber);
    if (!user) {
      throw genericError;
    }
    if (!user.isActive) {
      await this.audit.log({
        userId: user.id,
        action: AuditAction.AUTH_LOGIN_BLOCKED_INACTIVE,
        entityType: AuditEntity.AUTH,
        entityId: user.id,
        reason: 'Tentativa de login de usuário inativo.',
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
      throw new UnauthorizedException('Usuário inativo. Contate o administrador.');
    }

    const passwordOk = await argon2.verify(user.passwordHash, password);
    if (!passwordOk) {
      throw genericError;
    }

    return {
      id: user.id,
      userNumber: user.userNumber,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };
  }

  async login(userNumber: number, password: string, actor: ActorContext) {
    const user = await this.validateCredentials(userNumber, password, actor);
    await this.users.updateLastLogin(user.id);

    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user);

    await this.audit.log({
      userId: user.id,
      action: AuditAction.AUTH_LOGIN_SUCCESS,
      entityType: AuditEntity.AUTH,
      entityId: user.id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { user, accessToken, refreshToken };
  }

  async logout(actor: ActorContext) {
    if (actor.userId) {
      await this.audit.log({
        userId: actor.userId,
        action: AuditAction.AUTH_LOGOUT,
        entityType: AuditEntity.AUTH,
        entityId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
    }
  }

  /** Emite novo access token a partir de um refresh token válido. */
  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('REFRESH_TOKEN_SECRET') ?? 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
    }

    const user = await this.users.findById(payload.sub).catch(() => null);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário inativo ou inexistente.');
    }

    const accessToken = await this.signAccessToken(user);
    return { user, accessToken };
  }

  getMe(user: AuthenticatedUser): Promise<SafeUser> {
    return this.users.findById(user.id);
  }

  private signAccessToken(user: AuthenticatedUser | SafeUser) {
    const payload: JwtPayload = {
      sub: user.id,
      userNumber: user.userNumber,
      role: user.role,
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET') ?? 'dev-access-secret',
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '15m',
    });
  }

  private signRefreshToken(user: AuthenticatedUser) {
    const payload: JwtPayload = {
      sub: user.id,
      userNumber: user.userNumber,
      role: user.role,
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('REFRESH_TOKEN_SECRET') ?? 'dev-refresh-secret',
      expiresIn: this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN') ?? '7d',
    });
  }
}
