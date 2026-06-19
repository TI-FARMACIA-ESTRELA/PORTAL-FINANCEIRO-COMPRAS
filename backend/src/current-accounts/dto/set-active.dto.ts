import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetCurrentAccountActiveDto {
  @IsBoolean({ message: 'Informe se a conta deve ficar ativa.' })
  isActive!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
