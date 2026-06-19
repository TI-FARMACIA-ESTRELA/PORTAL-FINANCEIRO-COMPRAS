// Tipos compartilhados do domínio (Fase 1: apenas base de perfis e enums visuais).
// Os tipos completos de lançamentos, recebimentos e conta corrente serão
// adicionados nas fases seguintes.

export type UserRole = 'ADMIN' | 'COMPRADOR' | 'DIRETORIA';

export interface AuthUser {
  id: string;
  userNumber: number;
  name: string;
  role: UserRole;
}

export type FinancialStatus = 'ABERTO' | 'PARCIAL' | 'QUITADO' | 'CANCELADO';

export type DueStatus = 'EM_DIA' | 'VENCE_HOJE' | 'VENCIDO' | 'SEM_VENCIMENTO';

export type ConfirmationStatus =
  | 'PENDENTE_CONFIRMACAO'
  | 'CONFIRMADO'
  | 'ESTORNADO'
  | 'CANCELADO';

export type MovementType =
  | 'ENTRADA'
  | 'SAIDA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'ESTORNO';
