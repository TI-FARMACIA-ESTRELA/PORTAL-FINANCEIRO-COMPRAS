import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateReceivableDto {
  @IsOptional()
  @IsDateString({}, { message: 'Data da negociação inválida.' })
  negotiationDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Competência deve estar no formato AAAA-MM.',
  })
  competenceMonth?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data prevista de recebimento inválida.' })
  expectedReceiptDate?: string;

  @IsOptional()
  @IsString({ message: 'Fornecedor inválido.' })
  supplierId?: string;

  @IsOptional()
  @IsString({ message: 'Descrição da ação inválida.' })
  actionTypeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor inválido (use no máximo 2 casas decimais).' })
  @IsPositive({ message: 'O valor deve ser maior que zero.' })
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'A observação deve ter no máximo 1000 caracteres.' })
  notes?: string;

  // Apenas ADMIN pode alterar o comprador responsável.
  @IsOptional()
  @IsString()
  buyerId?: string;
}
