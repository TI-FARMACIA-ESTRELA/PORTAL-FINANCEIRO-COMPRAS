import { NavLink, useNavigate } from 'react-router-dom';
import { EstrelaLogo } from '@/components';
import { XMarkIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { cn } from '@/utils/cn';
import type { AuthUser } from '@/types';
import { useAuth } from '@/features/auth/authContext';
import { navGroups } from './navigation';
import { roleLabel, sidebarRoleBadge } from './roleBadge';

interface SidebarProps {
  user: AuthUser;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function SidebarContent({ user, onNavigate }: { user: AuthUser; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    onNavigate?.();
    await logout();
    toast.success('Sessão encerrada');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex flex-none flex-col items-center gap-2 border-b border-white/10 px-4 py-4">
        <EstrelaLogo className="h-10 w-full max-w-[210px]" />
        <p className="text-center text-xs font-semibold leading-snug text-white">
          Portal Financeiro Estrela
        </p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navGroups.map((group, idx) => {
          const visibleItems = group.items.filter((item) =>
            item.roles.includes(user.role),
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label ?? `group-${idx}`}>
              {group.label ? (
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-1">
                {visibleItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'border-l-[3px] border-primary-500 bg-white/10 text-white'
                            : 'border-l-[3px] border-transparent text-slate-300 hover:bg-white/5 hover:text-white',
                        )
                      }
                    >
                      <item.icon className="h-5 w-5 flex-none" />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="flex-none border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
            {user.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <span
              className={cn(
                'mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
                sidebarRoleBadge[user.role],
              )}
            >
              {roleLabel[user.role]}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 flex-none" />
          Sair
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ user, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Desktop fixo */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-[260px]">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile off-canvas */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-[260px]">
            <button
              type="button"
              onClick={onCloseMobile}
              className="absolute -right-10 top-4 rounded-lg p-1.5 text-white hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <SidebarContent user={user} onNavigate={onCloseMobile} />
          </div>
        </div>
      ) : null}
    </>
  );
}
