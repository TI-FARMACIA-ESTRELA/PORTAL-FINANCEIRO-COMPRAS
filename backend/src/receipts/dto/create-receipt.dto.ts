import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DestinationType, ReceiptType } from '@prisma/client';

export class CreateReceiptDto {
  @IsString({ message: 'Lançamento é obrigatório.' })
  receivableId!: string;

  @IsDateString({}, { message: 'Data do recebimento inválida.' })
  receiptDate!: string;

  @IsString({ message: 'Forma de recebimento é obrigatória.' })
  receiptMethodId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor inválido (use no máximo 2 casas decimais).' })
  @IsPositive({ message: 'O valor deve ser maior que zero.' })
  amount!: number;

  @IsEnum(ReceiptType, { message: 'Tipo de recebimento inválido.' })
  receiptType!: ReceiptType;

  @IsOptional()
  @IsEnum(DestinationType, { message: 'Destino do recebimento inválido.' })
  destinationType?: DestinationType;

  @IsOptional()
  @IsString({ message: 'Conta corrente inválida.' })
  currentAccountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'A observação deve ter no máximo 1000 caracteres.' })
  notes?: string;
}
