import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SupplierType } from '@prisma/client';
import { IsCnpj } from '../../common/validators/is-cnpj.decorator';

export class CreateSupplierDto {
  @IsString({ message: 'O nome fantasia é obrigatório.' })
  @MinLength(2, { message: 'O nome fantasia deve ter ao menos 2 caracteres.' })
  @MaxLength(150, { message: 'O nome fantasia deve ter no máximo 150 caracteres.' })
  tradeName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'A razão social deve ter no máximo 200 caracteres.' })
  legalName?: string;

  @IsOptional()
  @IsCnpj()
  cnpj?: string;

  @IsEnum(SupplierType, { message: 'Tipo de fornecedor inválido.' })
  supplierType!: SupplierType;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'A observação deve ter no máximo 1000 caracteres.' })
  notes?: string;
}
