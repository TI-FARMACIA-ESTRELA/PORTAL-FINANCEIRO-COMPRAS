import type { UserRole } from '@/types';

export const roleLabel: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  COMPRADOR: 'Comprador',
  DIRETORIA: 'Diretoria',
};

/** Badge de perfil no sidebar (fundo escuro). */
export const sidebarRoleBadge: Record<UserRole, string> = {
  ADMIN: 'bg-red-500/20 text-red-300',
  COMPRADOR: 'bg-blue-500/20 text-blue-300',
  DIRETORIA: 'bg-green-500/20 text-green-300',
};

/** Badge de perfil no header (fundo claro). */
export const headerRoleBadge: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  COMPRADOR: 'bg-blue-100 text-blue-700',
  DIRETORIA: 'bg-green-100 text-green-700',
};
