import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'A nova senha é obrigatória.' })
  @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres.' })
  password!: string;

  @IsString({ message: 'O motivo é obrigatório.' })
  @MinLength(5, { message: 'Informe um motivo com ao menos 5 caracteres.' })
  reason!: string;
}
