import { IsEnum, IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { ConfirmationStatus, FinancialStatus, ReceiptType } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const RECEIPT_SORTABLE = ['receiptDate', 'amount', 'confirmationStatus', 'createdAt'] as const;

export class QueryReceiptsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  receiptFrom?: string;

  @IsOptional()
  @IsString()
  receiptTo?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  actionTypeId?: string;

  @IsOptional()
  @IsString()
  receiptMethodId?: string;

  @IsOptional()
  @IsEnum(ReceiptType, { message: 'Tipo de recebimento inválido.' })
  receiptType?: ReceiptType;

  @IsOptional()
  @IsEnum(ConfirmationStatus, { message: 'Status de confirmação inválido.' })
  confirmationStatus?: ConfirmationStatus;

  @IsOptional()
  @IsEnum(FinancialStatus, { message: 'Status do lançamento inválido.' })
  receivableStatus?: FinancialStatus;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Competência deve estar no formato AAAA-MM.' })
  competenceMonth?: string;

  // Filtro por comprador: aplicado apenas para ADMIN/DIRETORIA.
  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @IsIn(RECEIPT_SORTABLE, { message: 'Campo de ordenação inválido.' })
  sortBy?: (typeof RECEIPT_SORTABLE)[number];

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
