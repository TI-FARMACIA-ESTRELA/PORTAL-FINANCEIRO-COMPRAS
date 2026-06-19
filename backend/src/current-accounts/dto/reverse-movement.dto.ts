import { IsString, MinLength } from 'class-validator';

export class ReverseMovementDto {
  @IsString({ message: 'O motivo do estorno é obrigatório.' })
  @MinLength(5, { message: 'Informe um motivo com ao menos 5 caracteres.' })
  reason!: string;
}
