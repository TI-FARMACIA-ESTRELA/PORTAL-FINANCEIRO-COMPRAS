import type { AuthUser } from '@/types';
import { useAuth } from '@/features/auth/authContext';

/**
 * Retorna o usuário autenticado. Deve ser usado apenas dentro de rotas
 * protegidas (onde a sessão já foi resolvida pelo AuthProvider).
 */
export function useCurrentUser(): AuthUser {
  const { user } = useAuth();
  if (!user) {
    throw new Error('Nenhum usuário autenticado no contexto.');
  }
  return user;
}
