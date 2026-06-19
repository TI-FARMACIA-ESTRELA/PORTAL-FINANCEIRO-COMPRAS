import { IsEnum, IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { FinancialStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const DUE_STATUSES = ['EM_DIA', 'VENCE_HOJE', 'VENCIDO', 'SEM_VENCIMENTO'] as const;
export const SORTABLE = [
  'negotiationDate',
  'expectedReceiptDate',
  'competenceMonth',
  'amount',
  'financialStatus',
  'createdAt',
] as const;

export class QueryReceivablesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  negotiationFrom?: string;

  @IsOptional()
  @IsString()
  negotiationTo?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Competência deve estar no formato AAAA-MM.' })
  competenceMonth?: string;

  @IsOptional()
  @IsString()
  expectedFrom?: string;

  @IsOptional()
  @IsString()
  expectedTo?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  actionTypeId?: string;

  @IsOptional()
  @IsEnum(FinancialStatus, { message: 'Status financeiro inválido.' })
  financialStatus?: FinancialStatus;

  @IsOptional()
  @IsIn(DUE_STATUSES, { message: 'Status de vencimento inválido.' })
  dueStatus?: (typeof DUE_STATUSES)[number];

  // Filtro por comprador: aplicado apenas para ADMIN/DIRETORIA (ignorado p/ COMPRADOR).
  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @IsIn(SORTABLE, { message: 'Campo de ordenação inválido.' })
  sortBy?: (typeof SORTABLE)[number];

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
