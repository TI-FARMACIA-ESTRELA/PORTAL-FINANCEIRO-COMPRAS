import { BadRequestException } from '@nestjs/common';

export const MAX_EXPORT_ROWS = 50_000;

export function assertExportLimit(count: number, entityLabel: string): void {
  if (count > MAX_EXPORT_ROWS) {
    throw new BadRequestException(
      `Exportação excede o limite de ${MAX_EXPORT_ROWS.toLocaleString('pt-BR')} linhas (${entityLabel}: ${count}). Aplique filtros mais específicos.`,
    );
  }
}
