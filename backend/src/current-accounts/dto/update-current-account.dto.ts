import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCurrentAccountDto {
  @IsOptional()
  @IsString({ message: 'Nome inválido.' })
  @MinLength(2, { message: 'O nome da conta deve ter ao menos 2 caracteres.' })
  @MaxLength(120, { message: 'O nome da conta deve ter no máximo 120 caracteres.' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'A observação deve ter no máximo 1000 caracteres.' })
  notes?: string;

  // Apenas ADMIN pode reatribuir o dono da conta.
  @IsOptional()
  @IsString()
  ownerUserId?: string;
}
