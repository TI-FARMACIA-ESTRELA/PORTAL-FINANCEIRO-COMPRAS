import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class BaseMovementDto {
  @IsDateString({}, { message: 'Data da movimentação inválida.' })
  movementDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Valor inválido (use no máximo 2 casas decimais).' })
  @IsPositive({ message: 'O valor deve ser maior que zero.' })
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateEntryMovementDto extends BaseMovementDto {
  @IsString({ message: 'A forma de recebimento é obrigatória para entradas.' })
  receiptMethodId!: string;
}

export class CreateExitMovementDto extends BaseMovementDto {
  @IsString({ message: 'A descrição de ação é obrigatória para saídas.' })
  actionTypeId!: string;
}

export class CreateAdjustmentMovementDto extends BaseMovementDto {
  @IsIn(['POSITIVO', 'NEGATIVO'], { message: 'Direção do ajuste inválida.' })
  direction!: 'POSITIVO' | 'NEGATIVO';

  // Ajuste exige motivo obrigatório.
  @IsString({ message: 'O motivo do ajuste é obrigatório.' })
  @MinLength(5, { message: 'Informe um motivo com ao menos 5 caracteres.' })
  reason!: string;
}
