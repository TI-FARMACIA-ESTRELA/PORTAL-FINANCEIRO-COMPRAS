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

export class CreateReceivableDto {
  @IsDateString({}, { message: 'Data da negociação inválida.' })
  negotiationDate!: string;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Competência deve estar no formato AAAA-MM.',
  })
  competenceMonth!: string;

  @IsDateString({}, { message: 'Data prevista de recebimento inválida.' })
  expectedReceiptDate!: string;

  @IsString({ message: 'Fornecedor é obrigatório.' })
  supplierId!: string;

  @IsString({ message: 'Descrição da ação é obrigatória.' })
  actionTypeId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor inválido (use no máximo 2 casas decimais).' })
  @IsPositive({ message: 'O valor deve ser maior que zero.' })
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'A observação deve ter no máximo 1000 caracteres.' })
  notes?: string;

  // Apenas ADMIN pode definir o comprador; COMPRADOR sempre usa o próprio usuário.
  @IsOptional()
  @IsString()
  buyerId?: string;
}
