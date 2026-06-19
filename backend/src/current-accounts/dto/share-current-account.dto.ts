import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ShareCurrentAccountDto {
  @IsString({ message: 'Usuário é obrigatório.' })
  userId!: string;

  @IsOptional()
  @IsBoolean()
  canView?: boolean;

  @IsOptional()
  @IsBoolean()
  canMove?: boolean;

  @IsOptional()
  @IsBoolean()
  canEdit?: boolean;
}
