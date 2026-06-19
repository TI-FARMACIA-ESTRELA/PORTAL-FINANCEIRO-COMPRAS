import { Navigate, Outlet } from 'react-router-dom';
import type { UserRole } from '@/types';
import { useAuth } from './authContext';

interface RequireRoleProps {
  allow: UserRole[];
}

export function RequireRole({ allow }: RequireRoleProps) {
  const { user } = useAuth();

  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
