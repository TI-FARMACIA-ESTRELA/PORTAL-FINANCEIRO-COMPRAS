import type { BadgeVariant } from '@/components';
import type { BalanceStatus, MovementType } from './currentAccountsApi';

export const balanceStatusBadge: Record<BalanceStatus, { label: string; variant: BadgeVariant }> = {
  POSITIVO: { label: 'Positivo', variant: 'green' },
  ZERADO: { label: 'Zerado', variant: 'blue' },
  NEGATIVO: { label: 'Negativo', variant: 'red' },
};

export const movementTypeBadge: Record<MovementType, { label: string; variant: BadgeVariant }> = {
  ENTRADA: { label: 'Entrada', variant: 'green' },
  SAIDA: { label: 'Saída', variant: 'red' },
  AJUSTE_POSITIVO: { label: 'Ajuste +', variant: 'purple' },
  AJUSTE_NEGATIVO: { label: 'Ajuste -', variant: 'purple' },
  ESTORNO: { label: 'Estorno', variant: 'amber' },
};

/** Cor de texto para o saldo conforme o status. */
export function balanceTextClass(status: BalanceStatus): string {
  if (status === 'POSITIVO') return 'text-green-700';
  if (status === 'NEGATIVO') return 'text-red-700';
  return 'text-gray-600';
}

/** Cor de texto para o valor de uma movimentação conforme o sinal. */
export function movementAmountClass(sign: '+' | '-' | ''): string {
  if (sign === '+') return 'text-green-700';
  if (sign === '-') return 'text-red-700';
  return 'text-gray-600';
}
