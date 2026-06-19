import { IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class ChangeRoleDto {
  @IsEnum(Role, { message: 'Perfil inválido.' })
  role!: Role;

  @IsString({ message: 'O motivo é obrigatório.' })
  @MinLength(5, { message: 'Informe um motivo com ao menos 5 caracteres.' })
  reason!: string;
}
