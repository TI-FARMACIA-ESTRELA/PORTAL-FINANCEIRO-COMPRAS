import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ArrowPathIcon, BellIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';
import { LoadingSpinner } from './LoadingSpinner';

type NotificationSeverity = 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
  severity?: NotificationSeverity;
}

interface NotificationDropdownProps {
  items: NotificationItem[];
  unreadCount: number;
  loading?: boolean;
  refreshing?: boolean;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onRefresh?: () => void;
}

const severityDot: Record<NotificationSeverity, string> = {
  INFO: 'bg-blue-500',
  WARNING: 'bg-amber-500',
  DANGER: 'bg-red-500',
  SUCCESS: 'bg-green-500',
};

export function NotificationDropdown({
  items,
  unreadCount,
  loading = false,
  refreshing = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
}: NotificationDropdownProps) {
  return (
    <Popover className="relative">
      <PopoverButton className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </PopoverButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <PopoverPanel className="absolute right-0 z-40 mt-2 w-80 origin-top-right overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-900/5 sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notificações</h3>
            <div className="flex items-center gap-2">
              {onRefresh ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="rounded p-1 text-gray-400 hover:text-primary-600 disabled:opacity-50"
                  title="Atualizar"
                >
                  <ArrowPathIcon className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                </button>
              ) : null}
              {onMarkAllAsRead && unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Marcar todas como lidas
                </button>
              ) : null}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-8">
                <LoadingSpinner label="Carregando notificações..." />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                Nenhuma notificação no momento.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      'px-4 py-3 transition-colors hover:bg-gray-50',
                      !item.read && 'bg-primary-50/40',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onMarkAsRead?.(item.id)}
                      className="flex w-full gap-2 text-left"
                    >
                      {item.severity ? (
                        <span
                          className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', severityDot[item.severity])}
                          aria-hidden
                        />
                      ) : null}
                      <span className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{item.message}</p>
                        <p className="mt-1 text-[11px] text-gray-400">{item.createdAt}</p>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverPanel>
      </Transition>
    </Popover>
  );
}
