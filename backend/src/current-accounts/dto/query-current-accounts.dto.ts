import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const CA_BALANCE_STATUS = ['POSITIVO', 'ZERADO', 'NEGATIVO'] as const;
export const CA_SORTABLE = ['name', 'createdAt'] as const;

export class QueryCurrentAccountsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  // Filtro por comprador responsável: aplicado apenas para ADMIN/DIRETORIA.
  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsIn(CA_BALANCE_STATUS, { message: 'Filtro de saldo inválido.' })
  balanceStatus?: (typeof CA_BALANCE_STATUS)[number];

  @IsOptional()
  @IsIn(CA_SORTABLE, { message: 'Campo de ordenação inválido.' })
  sortBy?: (typeof CA_SORTABLE)[number];

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
