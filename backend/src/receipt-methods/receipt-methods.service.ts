import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReceiptMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity, type ActorContext } from '../audit/audit.types';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateReceiptMethodDto } from './dto/create-receipt-method.dto';
import { UpdateReceiptMethodDto } from './dto/update-receipt-method.dto';

function snapshot(m: ReceiptMethod) {
  return {
    name: m.name,
    description: m.description,
    isCurrentAccountCredit: m.isCurrentAccountCredit,
    isActive: m.isActive,
  };
}

@Injectable()
export class ReceiptMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.ReceiptMethodWhereInput = {};
    if (query.active !== undefined) where.isActive = query.active === 'true';
    if (query.search) {
      const s = query.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.receiptMethod.count({ where }),
      this.prisma.receiptMethod.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  listActive(): Promise<ReceiptMethod[]> {
    return this.prisma.receiptMethod.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<ReceiptMethod> {
    const item = await this.prisma.receiptMethod.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Forma de recebimento não encontrada.');
    return item;
  }

  private async ensureNameAvailable(name: string, ignoreId?: string) {
    const owner = await this.prisma.receiptMethod.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (owner && owner.id !== ignoreId) {
      throw new ConflictException('Já existe uma forma de recebimento com este nome.');
    }
  }

  async create(dto: CreateReceiptMethodDto, actor: ActorContext): Promise<ReceiptMethod> {
    const name = dto.name.trim();
    await this.ensureNameAvailable(name);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.receiptMethod.create({
        data: {
          name,
          description: dto.description?.trim() || null,
          isCurrentAccountCredit: dto.isCurrentAccountCredit ?? false,
        },
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.RECEIPT_METHOD_CREATED,
          entityType: AuditEntity.RECEIPT_METHOD,
          entityId: created.id,
          newValues: snapshot(created),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return created;
    });
  }

  async update(
    id: string,
    dto: UpdateReceiptMethodDto,
    actor: ActorContext,
  ): Promise<ReceiptMethod> {
    const current = await this.findById(id);
    const name = dto.name?.trim() ?? current.name;
    if (dto.name && name.toLowerCase() !== current.name.toLowerCase()) {
      await this.ensureNameAvailable(name, id);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.receiptMethod.update({
        where: { id },
        data: {
          name,
          description:
            dto.description !== undefined ? dto.description?.trim() || null : current.description,
          isCurrentAccountCredit:
            dto.isCurrentAccountCredit ?? current.isCurrentAccountCredit,
        },
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.RECEIPT_METHOD_UPDATED,
          entityType: AuditEntity.RECEIPT_METHOD,
          entityId: id,
          oldValues: snapshot(current),
          newValues: snapshot(updated),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return updated;
    });
  }

  async setActive(
    id: string,
    isActive: boolean,
    reason: string | undefined,
    actor: ActorContext,
  ): Promise<ReceiptMethod> {
    const current = await this.findById(id);
    if (!isActive && (!reason || reason.trim().length < 5)) {
      throw new BadRequestException('Informe um motivo (mín. 5 caracteres) para inativar.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.receiptMethod.update({ where: { id }, data: { isActive } });
      await this.audit.log(
        {
          userId: actor.userId,
          action: isActive
            ? AuditAction.RECEIPT_METHOD_ACTIVATED
            : AuditAction.RECEIPT_METHOD_DEACTIVATED,
          entityType: AuditEntity.RECEIPT_METHOD,
          entityId: id,
          oldValues: { isActive: current.isActive },
          newValues: { isActive: updated.isActive },
          reason: reason ?? null,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return updated;
    });
  }
}
