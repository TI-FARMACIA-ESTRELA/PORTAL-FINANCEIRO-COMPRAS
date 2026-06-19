import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Supplier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity, type ActorContext } from '../audit/audit.types';
import { onlyDigits } from '../common/validators/cnpj.util';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';

function auditSnapshot(s: Supplier) {
  return {
    tradeName: s.tradeName,
    legalName: s.legalName,
    cnpj: s.cnpj,
    supplierType: s.supplierType,
    notes: s.notes,
    isActive: s.isActive,
  };
}

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: QuerySupplierDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.SupplierWhereInput = {};
    if (query.active !== undefined) where.isActive = query.active === 'true';
    if (query.supplierType) where.supplierType = query.supplierType;
    if (query.search) {
      const s = query.search;
      const digits = onlyDigits(s);
      where.OR = [
        { tradeName: { contains: s, mode: 'insensitive' } },
        { legalName: { contains: s, mode: 'insensitive' } },
        ...(digits ? [{ cnpj: { contains: digits } }] : []),
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        orderBy: { tradeName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  listActive(): Promise<Supplier[]> {
    return this.prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { tradeName: 'asc' },
    });
  }

  async findById(id: string): Promise<Supplier> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.');
    return supplier;
  }

  private async ensureCnpjAvailable(cnpj: string, ignoreId?: string) {
    const owner = await this.prisma.supplier.findUnique({ where: { cnpj } });
    if (owner && owner.id !== ignoreId) {
      throw new ConflictException('Já existe um fornecedor com este CNPJ.');
    }
  }

  async create(dto: CreateSupplierDto, actor: ActorContext): Promise<Supplier> {
    const cnpj = dto.cnpj ? onlyDigits(dto.cnpj) : null;
    if (cnpj) await this.ensureCnpjAvailable(cnpj);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.supplier.create({
        data: {
          tradeName: dto.tradeName.trim(),
          legalName: dto.legalName?.trim() || null,
          cnpj,
          supplierType: dto.supplierType,
          notes: dto.notes?.trim() || null,
        },
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.SUPPLIER_CREATED,
          entityType: AuditEntity.SUPPLIER,
          entityId: created.id,
          newValues: auditSnapshot(created),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return created;
    });
  }

  async update(id: string, dto: UpdateSupplierDto, actor: ActorContext): Promise<Supplier> {
    const current = await this.findById(id);
    const cnpj =
      dto.cnpj !== undefined ? (dto.cnpj ? onlyDigits(dto.cnpj) : null) : current.cnpj;
    if (cnpj && cnpj !== current.cnpj) await this.ensureCnpjAvailable(cnpj, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supplier.update({
        where: { id },
        data: {
          tradeName: dto.tradeName?.trim() ?? current.tradeName,
          legalName:
            dto.legalName !== undefined ? dto.legalName?.trim() || null : current.legalName,
          cnpj,
          supplierType: dto.supplierType ?? current.supplierType,
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : current.notes,
        },
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.SUPPLIER_UPDATED,
          entityType: AuditEntity.SUPPLIER,
          entityId: id,
          oldValues: auditSnapshot(current),
          newValues: auditSnapshot(updated),
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
  ): Promise<Supplier> {
    const current = await this.findById(id);
    if (!isActive && (!reason || reason.trim().length < 5)) {
      throw new BadRequestException('Informe um motivo (mín. 5 caracteres) para inativar.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supplier.update({ where: { id }, data: { isActive } });
      await this.audit.log(
        {
          userId: actor.userId,
          action: isActive ? AuditAction.SUPPLIER_ACTIVATED : AuditAction.SUPPLIER_DEACTIVATED,
          entityType: AuditEntity.SUPPLIER,
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
