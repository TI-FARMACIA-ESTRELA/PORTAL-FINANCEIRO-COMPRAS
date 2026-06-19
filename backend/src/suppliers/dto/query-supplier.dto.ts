import { IsEnum, IsOptional } from 'class-validator';
import { SupplierType } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QuerySupplierDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SupplierType, { message: 'Tipo de fornecedor inválido.' })
  supplierType?: SupplierType;
}
