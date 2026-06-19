import { Navigate, Outlet } from 'react-router-dom';
import { LoadingSpinner } from '@/components';
import { useAuth } from './authContext';

export function ProtectedRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" label="Carregando sessão..." />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
