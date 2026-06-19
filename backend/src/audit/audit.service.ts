import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditLogInput } from './audit.types';
import { QueryAuditDto } from './dto/query-audit.dto';
import { assertExportLimit } from '../reports/export.constants';

/** Aceita o PrismaService ou um cliente de transação. */
type PrismaClientLike = PrismaService | Prisma.TransactionClient;

// Chaves que NUNCA podem ser gravadas em auditoria.
const SENSITIVE_KEYS = ['password', 'passwordHash', 'password_hash', 'token', 'refreshToken', 'accessToken'];

function sanitize(value: Prisma.InputJsonValue | null | undefined): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((v) => sanitize(v as Prisma.InputJsonValue) ?? null) as Prisma.InputJsonValue;
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.includes(key)) continue;
    result[key] = val;
  }
  return result as Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra uma ação na auditoria (append-only).
   * Aceita opcionalmente um cliente de transação para garantir atomicidade
   * com a operação auditada (usado pelas fases financeiras).
   * Falhas de auditoria não devem derrubar a operação principal quando
   * executadas fora de transação.
   */
  async log(input: AuditLogInput, client: PrismaClientLike = this.prisma): Promise<void> {
    try {
      await client.auditLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          oldValues: sanitize(input.oldValues),
          newValues: sanitize(input.newValues),
          reason: input.reason ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (error) {
      // Dentro de transação, propaga para garantir consistência.
      if (client !== this.prisma) {
        throw error;
      }
      this.logger.error(`Falha ao registrar auditoria (${input.action}): ${(error as Error).message}`);
    }
  }

  async query(dto: QueryAuditDto) {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;

    const where: Prisma.AuditLogWhereInput = {};
    if (dto.userId) where.userId = dto.userId;
    if (dto.userNumber) where.user = { userNumber: dto.userNumber };
    if (dto.action) where.action = dto.action;
    if (dto.entityType) where.entityType = dto.entityType;
    if (dto.entityId) where.entityId = dto.entityId;

    if (dto.dateFrom || dto.dateTo) {
      where.createdAt = {};
      if (dto.dateFrom) where.createdAt.gte = new Date(dto.dateFrom);
      if (dto.dateTo) where.createdAt.lte = new Date(dto.dateTo);
    }

    if (dto.search) {
      const s = dto.search;
      where.OR = [
        { action: { contains: s, mode: 'insensitive' } },
        { entityType: { contains: s, mode: 'insensitive' } },
        { entityId: { contains: s, mode: 'insensitive' } },
        { reason: { contains: s, mode: 'insensitive' } },
        { ipAddress: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, userNumber: true, name: true, role: true } },
        },
      }),
    ]);

    return {
      data: rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async exportAll(dto: QueryAuditDto) {
    const where: Prisma.AuditLogWhereInput = {};
    if (dto.userId) where.userId = dto.userId;
    if (dto.userNumber) where.user = { userNumber: dto.userNumber };
    if (dto.action) where.action = dto.action;
    if (dto.entityType) where.entityType = dto.entityType;
    if (dto.entityId) where.entityId = dto.entityId;
    if (dto.dateFrom || dto.dateTo) {
      where.createdAt = {};
      if (dto.dateFrom) where.createdAt.gte = new Date(dto.dateFrom);
      if (dto.dateTo) where.createdAt.lte = new Date(dto.dateTo);
    }
    if (dto.search) {
      const s = dto.search;
      where.OR = [
        { action: { contains: s, mode: 'insensitive' } },
        { entityType: { contains: s, mode: 'insensitive' } },
        { entityId: { contains: s, mode: 'insensitive' } },
        { reason: { contains: s, mode: 'insensitive' } },
        { ipAddress: { contains: s, mode: 'insensitive' } },
      ];
    }

    const total = await this.prisma.auditLog.count({ where });
    assertExportLimit(total, 'auditoria');
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, userNumber: true, name: true, role: true } } },
    });
  }
}
