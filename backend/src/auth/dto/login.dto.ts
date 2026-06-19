import { IsInt, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class LoginDto {
  @Type(() => Number)
  @IsInt({ message: 'O número de usuário deve ser um número inteiro.' })
  userNumber!: number;

  @IsString({ message: 'A senha é obrigatória.' })
  @MinLength(1, { message: 'A senha é obrigatória.' })
  password!: string;
}
