import { Link } from 'react-router-dom';
import { Card, EmptyState, StatusBadge } from '@/components';
import { dueStatusBadge } from '@/components/statusBadges';
import { balanceStatusBadge, balanceTextClass } from '@/features/current-accounts/currentAccountsUi';
import { formatCurrency, formatDate } from '@/utils/format';
import type { DashboardLists } from './dashboardApi';

interface QuickListProps {
  title: string;
  subtitle?: string;
  items: {
    id: string;
    primary: string;
    secondary: string;
    amount: string;
    date?: string;
    badge?: { label: string; variant: 'green' | 'blue' | 'red' | 'amber' | 'gray' | 'purple' };
    link: string;
    buyerLabel?: string;
  }[];
  emptyTitle: string;
}

function QuickList({ title, subtitle, items, emptyTitle }: QuickListProps) {
  return (
    <Card title={title} subtitle={subtitle} padded={false}>
      {items.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.link}
                className="flex items-start justify-between gap-3 px-5 py-3 transition hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{item.primary}</p>
                  <p className="truncate text-xs text-gray-500">{item.secondary}</p>
                  {item.buyerLabel ? (
                    <p className="mt-0.5 text-xs text-gray-400">{item.buyerLabel}</p>
                  ) : null}
                  {item.date ? <p className="mt-0.5 text-xs text-gray-400">{item.date}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(Number(item.amount))}
                  </span>
                  {item.badge ? (
                    <StatusBadge label={item.badge.label} variant={item.badge.variant} />
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

interface DashboardQuickListsProps {
  lists: DashboardLists;
  showBuyer: boolean;
}

export function DashboardQuickLists({ lists, showBuyer }: DashboardQuickListsProps) {
  const mapReceivable = (items: DashboardLists['overdueReceivables']) =>
    items.map((r) => ({
      id: r.id,
      primary: r.supplierName,
      secondary: r.actionTypeName,
      amount: r.openBalance,
      date: `Previsão: ${formatDate(r.expectedReceiptDate)}`,
      badge: dueStatusBadge[r.dueStatus],
      link: r.link,
      buyerLabel: showBuyer && r.buyer ? `#${r.buyer.userNumber} ${r.buyer.name}` : undefined,
    }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-4">
      <QuickList
        title="Lançamentos vencidos"
        items={mapReceivable(lists.overdueReceivables)}
        emptyTitle="Nenhum lançamento vencido"
      />
      <QuickList
        title="Vencendo hoje"
        items={mapReceivable(lists.dueTodayReceivables)}
        emptyTitle="Nada vence hoje"
      />
      <QuickList
        title="Vencendo em 7 dias"
        items={mapReceivable(lists.dueNext7DaysReceivables)}
        emptyTitle="Nenhum vencimento próximo"
      />
      <QuickList
        title="Vencendo em 30 dias"
        items={mapReceivable(lists.dueNext30DaysReceivables)}
        emptyTitle="Nenhum vencimento em 30 dias"
      />

      <QuickList
        title="Últimos recebimentos confirmados"
        subtitle="Até 10 registros"
        items={lists.lastConfirmedReceipts.map((r) => ({
          id: r.id,
          primary: r.supplierName,
          secondary: r.methodName,
          amount: r.amount,
          date: formatDate(r.receiptDate),
          link: r.link,
          buyerLabel: showBuyer && r.buyer ? `#${r.buyer.userNumber} ${r.buyer.name}` : undefined,
        }))}
        emptyTitle="Nenhum recebimento confirmado"
      />

      <QuickList
        title="Recebimentos pendentes"
        subtitle="Aguardando confirmação"
        items={lists.pendingConfirmationReceipts.map((r) => ({
          id: r.id,
          primary: r.supplierName,
          secondary: r.methodName,
          amount: r.amount,
          date: formatDate(r.receiptDate),
          badge: { label: 'Pendente', variant: 'amber' as const },
          link: r.link,
          buyerLabel: showBuyer && r.buyer ? `#${r.buyer.userNumber} ${r.buyer.name}` : undefined,
        }))}
        emptyTitle="Nenhum recebimento pendente"
      />

      <QuickList
        title="Últimas movimentações CC"
        subtitle="Conta corrente comercial"
        items={lists.lastCurrentAccountMovements.map((m) => ({
          id: m.id,
          primary: `${m.accountName} · ${m.supplierName}`,
          secondary: m.type,
          amount: m.amount,
          date: formatDate(m.movementDate),
          link: m.link,
          buyerLabel: showBuyer && m.owner ? `#${m.owner.userNumber} ${m.owner.name}` : undefined,
        }))}
        emptyTitle="Nenhuma movimentação recente"
      />

      <QuickList
        title="Contas com saldo negativo"
        items={lists.negativeCurrentAccounts.map((a) => ({
          id: a.id,
          primary: a.name,
          secondary: a.supplierName,
          amount: a.balance,
          badge: balanceStatusBadge[a.balanceStatus],
          link: a.link,
          buyerLabel: showBuyer && a.owner ? `#${a.owner.userNumber} ${a.owner.name}` : undefined,
        }))}
        emptyTitle="Nenhuma conta negativa"
      />
    </div>
  );
}

interface CurrentAccountsFeaturedProps {
  accounts: DashboardLists['negativeCurrentAccounts'];
  featured: import('./dashboardApi').CurrentAccountListItem[];
  showBuyer: boolean;
}

export function DashboardCurrentAccountsSection({
  featured,
  showBuyer,
}: Omit<CurrentAccountsFeaturedProps, 'accounts'>) {
  return (
    <Card title="Principais contas correntes" subtitle="Negativas primeiro, depois maiores saldos">
      {featured.length === 0 ? (
        <EmptyState title="Nenhuma conta corrente acessível" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((acc) => {
            const badge = balanceStatusBadge[acc.balanceStatus];
            return (
              <Link
                key={acc.id}
                to={acc.link}
                className="rounded-lg border border-gray-100 p-4 transition hover:border-primary-200 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{acc.name}</p>
                    <p className="truncate text-xs text-gray-500">{acc.supplierName}</p>
                    {showBuyer && acc.owner ? (
                      <p className="mt-1 text-xs text-gray-400">
                        #{acc.owner.userNumber} {acc.owner.name}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge label={badge.label} variant={badge.variant} />
                </div>
                <p className={`mt-3 text-lg font-semibold ${balanceTextClass(acc.balanceStatus)}`}>
                  {formatCurrency(Number(acc.balance))}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
