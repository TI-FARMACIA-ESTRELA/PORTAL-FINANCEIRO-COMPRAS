import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReceiptType } from '@prisma/client';

export class UpdateReceiptDto {
  @IsOptional()
  @IsDateString({}, { message: 'Data do recebimento inválida.' })
  receiptDate?: string;

  @IsOptional()
  @IsString({ message: 'Forma de recebimento inválida.' })
  receiptMethodId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor inválido (use no máximo 2 casas decimais).' })
  @IsPositive({ message: 'O valor deve ser maior que zero.' })
  amount?: number;

  @IsOptional()
  @IsEnum(ReceiptType, { message: 'Tipo de recebimento inválido.' })
  receiptType?: ReceiptType;

  @IsOptional()
  @IsString({ message: 'Conta corrente inválida.' })
  currentAccountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'A observação deve ter no máximo 1000 caracteres.' })
  notes?: string;

  // Edição de recebimento exige motivo (auditoria).
  @IsString({ message: 'O motivo da edição é obrigatório.' })
  @MinLength(5, { message: 'Informe um motivo com ao menos 5 caracteres.' })
  reason!: string;
}
