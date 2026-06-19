import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { RequireRole } from '@/features/auth/RequireRole';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ReceivablesPage } from '@/features/receivables/ReceivablesPage';
import { ReceiptsPage } from '@/features/receipts/ReceiptsPage';
import { CurrentAccountsPage } from '@/features/current-accounts/CurrentAccountsPage';
import { CurrentAccountDetailPage } from '@/features/current-accounts/CurrentAccountDetailPage';
import { SuppliersPage } from '@/features/settings/SuppliersPage';
import { ActionTypesPage } from '@/features/settings/ActionTypesPage';
import { ReceiptMethodsPage } from '@/features/settings/ReceiptMethodsPage';
import { ProfilePage } from '@/features/settings/ProfilePage';
import { UsersPage } from '@/features/admin/UsersPage';
import { AuditPage } from '@/features/admin/AuditPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/lancamentos', element: <ReceivablesPage /> },
          { path: '/recebimentos', element: <ReceiptsPage /> },
          { path: '/conta-corrente', element: <CurrentAccountsPage /> },
          { path: '/conta-corrente/:id', element: <CurrentAccountDetailPage /> },
          { path: '/perfil', element: <ProfilePage /> },
          // Cadastros e auditoria: ADMIN e DIRETORIA
          {
            element: <RequireRole allow={['ADMIN', 'DIRETORIA']} />,
            children: [
              { path: '/cadastros/fornecedores', element: <SuppliersPage /> },
              { path: '/cadastros/descricoes-acoes', element: <ActionTypesPage /> },
              { path: '/cadastros/formas-recebimento', element: <ReceiptMethodsPage /> },
              { path: '/admin/auditoria', element: <AuditPage /> },
            ],
          },
          // Administração de usuários: somente ADMIN
          {
            element: <RequireRole allow={['ADMIN']} />,
            children: [{ path: '/admin/usuarios', element: <UsersPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
