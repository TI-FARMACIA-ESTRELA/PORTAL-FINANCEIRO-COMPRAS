import type { ComponentType, SVGProps } from 'react';
import {
  HomeIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  WalletIcon,
  BuildingStorefrontIcon,
  TagIcon,
  CreditCardIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import type { UserRole } from '@/types';

export interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  roles: UserRole[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

const ALL: UserRole[] = ['ADMIN', 'COMPRADOR', 'DIRETORIA'];

export const navGroups: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: HomeIcon, roles: ALL },
      { label: 'Lançamentos', to: '/lancamentos', icon: BanknotesIcon, roles: ALL },
      {
        label: 'Recebimentos/Baixas',
        to: '/recebimentos',
        icon: ArrowDownTrayIcon,
        roles: ALL,
      },
      { label: 'Conta Corrente', to: '/conta-corrente', icon: WalletIcon, roles: ALL },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      {
        label: 'Fornecedores',
        to: '/cadastros/fornecedores',
        icon: BuildingStorefrontIcon,
        roles: ALL,
      },
      {
        label: 'Descrições de ação',
        to: '/cadastros/descricoes-acoes',
        icon: TagIcon,
        roles: ALL,
      },
      {
        label: 'Formas de recebimento',
        to: '/cadastros/formas-recebimento',
        icon: CreditCardIcon,
        roles: ALL,
      },
    ],
  },
  {
    label: 'Administração',
    items: [
      { label: 'Usuários', to: '/admin/usuarios', icon: UsersIcon, roles: ['ADMIN'] },
      {
        label: 'Auditoria',
        to: '/admin/auditoria',
        icon: ClipboardDocumentListIcon,
        roles: ['ADMIN', 'DIRETORIA'],
      },
    ],
  },
  {
    items: [{ label: 'Perfil', to: '/perfil', icon: UserCircleIcon, roles: ALL }],
  },
];
