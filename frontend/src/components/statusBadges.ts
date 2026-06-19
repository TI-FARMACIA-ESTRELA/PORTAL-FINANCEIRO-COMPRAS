import type { BadgeVariant } from './StatusBadge';

/** Mapeamentos prontos de badges conforme a especificação visual do sistema. */
export const financialStatusBadge: Record<string, { label: string; variant: BadgeVariant }> = {
  ABERTO: { label: 'Aberto', variant: 'amber' },
  PARCIAL: { label: 'Parcial', variant: 'blue' },
  QUITADO: { label: 'Quitado', variant: 'green' },
  CANCELADO: { label: 'Cancelado', variant: 'gray' },
};

export const dueStatusBadge: Record<string, { label: string; variant: BadgeVariant }> = {
  EM_DIA: { label: 'Em dia', variant: 'green' },
  VENCE_HOJE: { label: 'Vence hoje', variant: 'amber' },
  VENCIDO: { label: 'Vencido', variant: 'red' },
  SEM_VENCIMENTO: { label: 'Sem vencimento', variant: 'gray' },
};

export const confirmationStatusBadge: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDENTE_CONFIRMACAO: { label: 'Pendente', variant: 'amber' },
  CONFIRMADO: { label: 'Confirmado', variant: 'green' },
  ESTORNADO: { label: 'Estornado', variant: 'red' },
  CANCELADO: { label: 'Cancelado', variant: 'gray' },
};
