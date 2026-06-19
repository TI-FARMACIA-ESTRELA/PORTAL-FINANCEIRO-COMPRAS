import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @Type(() => Number)
  @IsInt({ message: 'O número de usuário deve ser um número inteiro.' })
  @Min(1, { message: 'O número de usuário deve ser maior que zero.' })
  userNumber!: number;

  @IsString({ message: 'O nome é obrigatório.' })
  @MinLength(2, { message: 'O nome deve ter ao menos 2 caracteres.' })
  name!: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido.' })
  email?: string;

  @IsString({ message: 'A senha inicial é obrigatória.' })
  @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres.' })
  password!: string;

  @IsEnum(Role, { message: 'Perfil inválido.' })
  role!: Role;

  @IsOptional()
  @IsBoolean({ message: 'O status ativo deve ser verdadeiro ou falso.' })
  isActive?: boolean;
}
