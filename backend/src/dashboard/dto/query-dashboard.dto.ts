import { IsOptional, IsUUID, Matches, IsDateString } from 'class-validator';

export class QueryDashboardDto {
  /** Apenas ADMIN/DIRETORIA — ignorado para COMPRADOR. */
  @IsOptional()
  @IsUUID()
  buyerId?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'competenceMonth deve estar no formato AAAA-MM.' })
  competenceMonth?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  actionTypeId?: string;
}
