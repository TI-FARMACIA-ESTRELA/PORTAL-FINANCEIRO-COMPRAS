import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCurrentAccountDto {
  @IsString({ message: 'Fornecedor é obrigatório.' })
  supplierId!: string;

  @IsString({ message: 'O nome da conta é obrigatório.' })
  @MinLength(2, { message: 'O nome da conta deve ter ao menos 2 caracteres.' })
  @MaxLength(120, { message: 'O nome da conta deve ter no máximo 120 caracteres.' })
  name!: string;

  // Apenas ADMIN pode definir o dono; COMPRADOR sempre usa o próprio usuário.
  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'A observação deve ter no máximo 1000 caracteres.' })
  notes?: string;
}
