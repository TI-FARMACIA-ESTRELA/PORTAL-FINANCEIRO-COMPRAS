import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActionType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity, type ActorContext } from '../audit/audit.types';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateActionTypeDto } from './dto/create-action-type.dto';
import { UpdateActionTypeDto } from './dto/update-action-type.dto';

function snapshot(a: ActionType) {
  return { name: a.name, description: a.description, isActive: a.isActive };
}

@Injectable()
export class ActionTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.ActionTypeWhereInput = {};
    if (query.active !== undefined) where.isActive = query.active === 'true';
    if (query.search) {
      const s = query.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.actionType.count({ where }),
      this.prisma.actionType.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  listActive(): Promise<ActionType[]> {
    return this.prisma.actionType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async findById(id: string): Promise<ActionType> {
    const item = await this.prisma.actionType.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Descrição de ação não encontrada.');
    return item;
  }

  private async ensureNameAvailable(name: string, ignoreId?: string) {
    const owner = await this.prisma.actionType.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (owner && owner.id !== ignoreId) {
      throw new ConflictException('Já existe uma descrição de ação com este nome.');
    }
  }

  async create(dto: CreateActionTypeDto, actor: ActorContext): Promise<ActionType> {
    const name = dto.name.trim();
    await this.ensureNameAvailable(name);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.actionType.create({
        data: { name, description: dto.description?.trim() || null },
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.ACTION_TYPE_CREATED,
          entityType: AuditEntity.ACTION_TYPE,
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

  async update(id: string, dto: UpdateActionTypeDto, actor: ActorContext): Promise<ActionType> {
    const current = await this.findById(id);
    const name = dto.name?.trim() ?? current.name;
    if (dto.name && name.toLowerCase() !== current.name.toLowerCase()) {
      await this.ensureNameAvailable(name, id);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.actionType.update({
        where: { id },
        data: {
          name,
          description:
            dto.description !== undefined ? dto.description?.trim() || null : current.description,
        },
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.ACTION_TYPE_UPDATED,
          entityType: AuditEntity.ACTION_TYPE,
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
  ): Promise<ActionType> {
    const current = await this.findById(id);
    if (!isActive && (!reason || reason.trim().length < 5)) {
      throw new BadRequestException('Informe um motivo (mín. 5 caracteres) para inativar.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.actionType.update({ where: { id }, data: { isActive } });
      await this.audit.log(
        {
          userId: actor.userId,
          action: isActive
            ? AuditAction.ACTION_TYPE_ACTIVATED
            : AuditAction.ACTION_TYPE_DEACTIVATED,
          entityType: AuditEntity.ACTION_TYPE,
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
