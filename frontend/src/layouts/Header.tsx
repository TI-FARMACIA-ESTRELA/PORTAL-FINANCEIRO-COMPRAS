import { useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { NotificationsBell } from '@/features/notifications/NotificationsBell';
import { cn } from '@/utils/cn';
import type { AuthUser } from '@/types';
import { useAuth } from '@/features/auth/authContext';
import { roleLabel, headerRoleBadge } from './roleBadge';

interface HeaderProps {
  user: AuthUser;
  title: string;
  breadcrumb?: string[];
  onOpenMobile: () => void;
}

export function Header({ user, title, breadcrumb, onOpenMobile }: HeaderProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast.success('Sessão encerrada');
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          aria-label="Abrir menu"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-gray-900">{title}</h1>
          {breadcrumb && breadcrumb.length > 0 ? (
            <p className="truncate text-xs text-gray-500">{breadcrumb.join(' / ')}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <NotificationsBell />
          <button
            type="button"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Ajuda"
          >
            <QuestionMarkCircleIcon className="h-6 w-6" />
          </button>

          <div className="ml-2 hidden items-center gap-3 border-l border-gray-200 pl-4 sm:flex">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  headerRoleBadge[user.role],
                )}
              >
                {roleLabel[user.role]}
              </span>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {user.name.charAt(0)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-600"
            aria-label="Sair"
            title="Sair"
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
