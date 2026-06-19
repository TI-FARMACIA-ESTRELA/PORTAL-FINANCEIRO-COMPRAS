import type { BadgeVariant } from '@/components';
import type { SelectOption } from '@/components';

/** Rótulos legíveis para cada ação auditada. */
export const actionLabel: Record<string, string> = {
  USER_CREATED: 'Usuário criado',
  USER_UPDATED: 'Usuário editado',
  USER_ACTIVATED: 'Usuário ativado',
  USER_DEACTIVATED: 'Usuário inativado',
  USER_PASSWORD_RESET: 'Senha redefinida',
  USER_ROLE_CHANGED: 'Perfil alterado',
  AUTH_LOGIN_SUCCESS: 'Login realizado',
  AUTH_LOGIN_BLOCKED_INACTIVE: 'Login bloqueado (inativo)',
  AUTH_LOGOUT: 'Logout',
};

export const actionVariant: Record<string, BadgeVariant> = {
  USER_CREATED: 'green',
  USER_UPDATED: 'blue',
  USER_ACTIVATED: 'green',
  USER_DEACTIVATED: 'red',
  USER_PASSWORD_RESET: 'amber',
  USER_ROLE_CHANGED: 'purple',
  AUTH_LOGIN_SUCCESS: 'gray',
  AUTH_LOGIN_BLOCKED_INACTIVE: 'red',
  AUTH_LOGOUT: 'gray',
};

export function getActionLabel(action: string): string {
  return actionLabel[action] ?? action;
}

export const actionFilterOptions: SelectOption[] = [
  { value: '', label: 'Todas as ações' },
  { value: 'USER_CREATED', label: 'Usuário criado' },
  { value: 'USER_UPDATED', label: 'Usuário editado' },
  { value: 'USER_ACTIVATED', label: 'Usuário ativado' },
  { value: 'USER_DEACTIVATED', label: 'Usuário inativado' },
  { value: 'USER_PASSWORD_RESET', label: 'Senha redefinida' },
  { value: 'USER_ROLE_CHANGED', label: 'Perfil alterado' },
  { value: 'AUTH_LOGIN_SUCCESS', label: 'Login realizado' },
  { value: 'AUTH_LOGIN_BLOCKED_INACTIVE', label: 'Login bloqueado (inativo)' },
  { value: 'AUTH_LOGOUT', label: 'Logout' },
];

export const entityFilterOptions: SelectOption[] = [
  { value: '', label: 'Todas as entidades' },
  { value: 'User', label: 'Usuário' },
  { value: 'Auth', label: 'Autenticação' },
];
