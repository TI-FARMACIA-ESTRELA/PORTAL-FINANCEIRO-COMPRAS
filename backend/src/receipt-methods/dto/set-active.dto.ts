import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SetActiveDto {
  @IsBoolean({ message: 'O status ativo deve ser verdadeiro ou falso.' })
  isActive!: boolean;

  @IsOptional()
  @IsString({ message: 'O motivo deve ser um texto.' })
  reason?: string;
}
