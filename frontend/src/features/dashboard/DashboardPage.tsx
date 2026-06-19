import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BanknotesIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  WalletIcon,
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  Card,
  FilterBar,
  ExportButtons,
  KpiCard,
  LoadingSpinner,
  Select,
  DateInput,
  type SelectOption,
} from '@/components';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { formatCurrency } from '@/utils/format';
import { listActiveSuppliers, listActiveActionTypes } from '@/features/receivables/receivablesApi';
import { listCurrentAccountUserOptions } from '@/features/current-accounts/currentAccountsApi';
import { getDashboard, type DashboardQuery } from './dashboardApi';
import { exportDashboard } from '@/features/reports/reportsApi';
import { DashboardChartsSection } from './DashboardCharts';
import { DashboardQuickLists, DashboardCurrentAccountsSection } from './DashboardQuickLists';

export function DashboardPage() {
  const user = useCurrentUser();
  const canSeeBuyer = user.role === 'ADMIN' || user.role === 'DIRETORIA';

  const [buyerId, setBuyerId] = useState('');
  const [competenceMonth, setCompetenceMonth] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [actionTypeId, setActionTypeId] = useState('');

  const filters: DashboardQuery = useMemo(
    () => ({
      buyerId: canSeeBuyer ? buyerId || undefined : undefined,
      competenceMonth: competenceMonth || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      supplierId: supplierId || undefined,
      actionTypeId: actionTypeId || undefined,
    }),
    [buyerId, competenceMonth, dateFrom, dateTo, supplierId, actionTypeId, canSeeBuyer],
  );

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => getDashboard(filters),
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers-active'],
    queryFn: listActiveSuppliers,
  });

  const actionsQuery = useQuery({
    queryKey: ['action-types-active'],
    queryFn: listActiveActionTypes,
  });

  const usersQuery = useQuery({
    queryKey: ['ca-user-options'],
    queryFn: listCurrentAccountUserOptions,
    enabled: canSeeBuyer,
  });

  const buyerOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Todos os compradores' },
      ...(usersQuery.data ?? []).map((u) => ({
        value: u.id,
        label: `#${u.userNumber} ${u.name}`,
      })),
    ],
    [usersQuery.data],
  );

  const supplierOptions: SelectOption[] = [
    { value: '', label: 'Todos os fornecedores' },
    ...(suppliersQuery.data ?? []).map((s) => ({ value: s.id, label: s.label })),
  ];

  const actionOptions: SelectOption[] = [
    { value: '', label: 'Todas as ações' },
    ...(actionsQuery.data ?? []).map((a) => ({ value: a.id, label: a.label })),
  ];

  const { kpis, charts, lists, currentAccounts } = dashboardQuery.data ?? {
    kpis: null,
    charts: null,
    lists: null,
    currentAccounts: null,
  };

  if (dashboardQuery.isLoading) {
    return <LoadingSpinner label="Carregando dashboard..." />;
  }

  if (dashboardQuery.isError || !kpis || !charts || !lists || !currentAccounts) {
    return (
      <Card title="Dashboard">
        <p className="text-sm text-red-600">Não foi possível carregar os dados da dashboard.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">Visão geral financeira comercial</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <ExportButtons
            showCsv={false}
            onExportXlsx={() => exportDashboard(filters)}
          />
          <span className="hidden text-gray-300 sm:inline">·</span>
          <Link to="/lancamentos" className="text-primary-600 hover:underline">
            Lançamentos
          </Link>
          <span className="text-gray-300">·</span>
          <Link to="/recebimentos" className="text-primary-600 hover:underline">
            Recebimentos
          </Link>
          <span className="text-gray-300">·</span>
          <Link to="/conta-corrente" className="text-primary-600 hover:underline">
            Conta corrente
          </Link>
        </div>
      </div>

      <FilterBar>
        {canSeeBuyer ? (
          <div className="w-52">
            <Select options={buyerOptions} value={buyerId} onChange={(e) => setBuyerId(e.target.value)} />
          </div>
        ) : null}
        <div className="w-40">
          <input
            type="month"
            value={competenceMonth}
            onChange={(e) => setCompetenceMonth(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            title="Competência"
          />
        </div>
        <div className="w-40">
          <DateInput value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Previsão de" />
        </div>
        <div className="w-40">
          <DateInput value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Previsão até" />
        </div>
        <div className="w-48">
          <Select
            options={supplierOptions}
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            options={actionOptions}
            value={actionTypeId}
            onChange={(e) => setActionTypeId(e.target.value)}
          />
        </div>
      </FilterBar>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <KpiCard
          label="Total a receber"
          value={formatCurrency(Number(kpis.totalReceivableOpen))}
          icon={BanknotesIcon}
          tone="info"
        />
        <KpiCard
          label="Total vencido"
          value={formatCurrency(Number(kpis.totalOverdue))}
          icon={ExclamationTriangleIcon}
          tone="danger"
        />
        <KpiCard
          label="Recebido no mês"
          value={formatCurrency(Number(kpis.receivedThisMonth))}
          icon={ArrowTrendingUpIcon}
          tone="success"
        />
        <KpiCard
          label="Recebido no ano"
          value={formatCurrency(Number(kpis.receivedThisYear))}
          icon={ChartBarIcon}
          tone="success"
        />
        <KpiCard
          label="Previsão 30 dias"
          value={formatCurrency(Number(kpis.forecastNext30Days))}
          icon={CalendarDaysIcon}
          tone="info"
        />
        <KpiCard
          label="Saldo contas correntes"
          value={formatCurrency(Number(kpis.currentAccountsBalance))}
          icon={WalletIcon}
          tone="default"
        />
        <KpiCard
          label="Lançamentos pendentes"
          value={String(kpis.pendingReceivablesCount)}
          hint="Não quitados e não cancelados"
          icon={ClockIcon}
          tone="warning"
        />
        <KpiCard
          label="Lançamentos vencidos"
          value={String(kpis.overdueReceivablesCount)}
          icon={ExclamationTriangleIcon}
          tone="danger"
        />
        <KpiCard
          label="Receb. pendentes conf."
          value={String(kpis.pendingReceiptsConfirmationCount)}
          icon={CheckCircleIcon}
          tone="warning"
        />
        <KpiCard
          label="CC positivas"
          value={String(kpis.positiveCurrentAccountsCount)}
          icon={WalletIcon}
          tone="success"
        />
        <KpiCard
          label="CC zeradas"
          value={String(kpis.zeroCurrentAccountsCount)}
          icon={WalletIcon}
          tone="default"
        />
        <KpiCard
          label="CC negativas"
          value={String(kpis.negativeCurrentAccountsCount)}
          icon={WalletIcon}
          tone="danger"
        />
      </div>

      <DashboardCurrentAccountsSection featured={currentAccounts.featured} showBuyer={canSeeBuyer} />

      <DashboardChartsSection charts={charts} />

      <DashboardQuickLists lists={lists} showBuyer={canSeeBuyer} />
    </div>
  );
}
