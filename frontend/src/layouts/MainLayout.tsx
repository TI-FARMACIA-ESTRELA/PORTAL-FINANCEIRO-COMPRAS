import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const PAGE_TITLES: { prefix: string; title: string; breadcrumb?: string[] }[] = [
  { prefix: '/dashboard', title: 'Dashboard' },
  { prefix: '/lancamentos', title: 'Lançamentos' },
  { prefix: '/recebimentos', title: 'Recebimentos/Baixas' },
  { prefix: '/conta-corrente', title: 'Conta Corrente' },
  {
    prefix: '/cadastros/fornecedores',
    title: 'Fornecedores',
    breadcrumb: ['Cadastros', 'Fornecedores'],
  },
  {
    prefix: '/cadastros/descricoes-acoes',
    title: 'Descrições de ação',
    breadcrumb: ['Cadastros', 'Descrições de ação'],
  },
  {
    prefix: '/cadastros/formas-recebimento',
    title: 'Formas de recebimento',
    breadcrumb: ['Cadastros', 'Formas de recebimento'],
  },
  { prefix: '/admin/usuarios', title: 'Usuários', breadcrumb: ['Administração', 'Usuários'] },
  { prefix: '/admin/auditoria', title: 'Auditoria', breadcrumb: ['Administração', 'Auditoria'] },
  { prefix: '/perfil', title: 'Perfil' },
];

function resolveTitle(pathname: string) {
  const match = [...PAGE_TITLES]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((entry) => pathname.startsWith(entry.prefix));
  return match ?? { title: 'Portal Financeiro Estrela', breadcrumb: undefined };
}

export function MainLayout() {
  const user = useCurrentUser();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { title, breadcrumb } = resolveTitle(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        user={user}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="lg:pl-[260px]">
        <Header
          user={user}
          title={title}
          breadcrumb={breadcrumb}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
