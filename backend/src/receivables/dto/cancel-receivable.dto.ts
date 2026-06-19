import { IsString, MinLength } from 'class-validator';

export class CancelReceivableDto {
  @IsString({ message: 'O motivo do cancelamento é obrigatório.' })
  @MinLength(5, { message: 'Informe um motivo com ao menos 5 caracteres.' })
  reason!: string;
}
