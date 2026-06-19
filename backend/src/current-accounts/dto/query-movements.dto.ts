import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { MovementType } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const MOVEMENT_SORTABLE = ['movementDate', 'amount', 'type', 'createdAt'] as const;

export class QueryCurrentAccountMovementsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsEnum(MovementType, { message: 'Tipo de movimento inválido.' })
  type?: MovementType;

  @IsOptional()
  @IsString()
  receiptMethodId?: string;

  @IsOptional()
  @IsString()
  actionTypeId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsIn(MOVEMENT_SORTABLE, { message: 'Campo de ordenação inválido.' })
  sortBy?: (typeof MOVEMENT_SORTABLE)[number];

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
