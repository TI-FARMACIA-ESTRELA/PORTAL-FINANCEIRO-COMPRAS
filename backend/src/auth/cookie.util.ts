import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';

export const REFRESH_COOKIE_NAME = 'refresh_token';

/** Converte expressões como "7d", "15m", "30s", "12h" em milissegundos. */
export function durationToMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)\s*([smhd])$/.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2];
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * unitMs[unit];
}

/**
 * Opções do cookie de refresh token.
 * Em produção (cross-domain via Coolify) usa SameSite=None + Secure.
 * Em desenvolvimento usa SameSite=Lax sem Secure (HTTP local).
 */
export function buildRefreshCookieOptions(config: ConfigService): CookieOptions {
  const isProd = (config.get<string>('NODE_ENV') ?? 'development') === 'production';
  const cookieDomain = config.get<string>('COOKIE_DOMAIN');
  const refreshExpires = config.get<string>('REFRESH_TOKEN_EXPIRES_IN') ?? '7d';

  const options: CookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: durationToMs(refreshExpires, 7 * 86_400_000),
  };

  // Só define domain quando configurado e diferente de localhost.
  if (cookieDomain && cookieDomain !== 'localhost') {
    options.domain = cookieDomain;
  }

  return options;
}
