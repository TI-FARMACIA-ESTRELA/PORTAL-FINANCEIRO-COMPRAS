import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAuditDto {
  @IsOptional()
  @IsString()
  userId?: string;

  /** Filtra pelo número do usuário relacionado (mais amigável que o UUID). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userNumber?: number;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  /** Data inicial (ISO) baseada em created_at. */
  @IsOptional()
  @IsString()
  dateFrom?: string;

  /** Data final (ISO) baseada em created_at. */
  @IsOptional()
  @IsString()
  dateTo?: string;

  /** Busca textual em ação, entidade, entityId, motivo e IP. */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
