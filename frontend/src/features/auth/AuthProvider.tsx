import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '@/types';
import {
  setAccessToken,
  setOnAuthFailure,
} from '@/services/api/client';
import {
  loginRequest,
  logoutRequest,
  refreshRequest,
} from './authApi';
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // Tenta restaurar a sessão no boot usando o refresh token (cookie httpOnly).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { accessToken, user: refreshedUser } = await refreshRequest();
        if (!active) return;
        setAccessToken(accessToken);
        setUser(refreshedUser);
        setStatus('authenticated');
      } catch {
        if (!active) return;
        clearSession();
      }
    })();
    return () => {
      active = false;
    };
  }, [clearSession]);

  // Quando o refresh automático do axios falha, encerra a sessão.
  useEffect(() => {
    setOnAuthFailure(() => {
      clearSession();
    });
    return () => setOnAuthFailure(null);
  }, [clearSession]);

  const login = useCallback(async (userNumber: number, password: string) => {
    const { accessToken, user: loggedUser } = await loginRequest({ userNumber, password });
    setAccessToken(accessToken);
    setUser(loggedUser);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
