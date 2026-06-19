import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface ClientInfo {
  ipAddress: string | null;
  userAgent: string | null;
}

/** Extrai IP e User-Agent da requisição para fins de auditoria. */
export const ClientInfoParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientInfo => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim()) ||
      req.ip ||
      req.socket?.remoteAddress ||
      null;
    const userAgent = (req.headers['user-agent'] as string | undefined) ?? null;
    return { ipAddress: ip, userAgent };
  },
);
