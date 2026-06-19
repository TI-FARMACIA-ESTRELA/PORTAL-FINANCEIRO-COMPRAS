import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ScaleIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
} from '@heroicons/react/24/outline';
import {
  FilterBar,
  ExportButtons,
  KpiCard,
  StatusBadge,
  Pagination,
  LoadingSpinner,
  EmptyState,
  Select,
  type SelectOption,
} from '@/components';
import { formatCurrency, formatDate } from '@/utils/format';
import { extractApiError } from '@/services/api/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listActiveSuppliers } from '@/features/receivables/receivablesApi';
import {
  listCurrentAccounts,
  getCurrentAccountsSummary,
  listCurrentAccountUserOptions,
  createCurrentAccount,
  shareCurrentAccount,
  type CurrentAccount,
  type CurrentAccountQuery,
  type BalanceStatus,
} from './currentAccountsApi';
import { balanceStatusBadge, balanceTextClass } from './currentAccountsUi';
import { CurrentAccountFormModal } from './CurrentAccountFormModal';
import { ShareCurrentAccountModal } from './ShareCurrentAccountModal';
import { exportCurrentAccounts } from '@/features/reports/reportsApi';

const PAGE_SIZE = 12;

const balanceOptions: SelectOption[] = [
  { value: '', label: 'Todos os saldos' },
  { value: 'POSITIVO', label: 'Positivo' },
  { value: 'ZERADO', label: 'Zerado' },
  { value: 'NEGATIVO', label: 'Negativo' },
];

const activeOptions: SelectOption[] = [
  { value: '', label: 'Todos os status' },
  { value: 'true', label: 'Ativas' },
  { value: 'false', label: 'Inativas' },
];

export function CurrentAccountsPage() {
  const user = useCurrentUser();
  const isAdmin = user.role === 'ADMIN';
  const canWrite = user.role === 'ADMIN' || user.role === 'COMPRADOR';
  const canSeeOwnerFilter = user.role === 'ADMIN' || user.role === 'DIRETORIA';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [balanceStatus, setBalanceStatus] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<CurrentAccount | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, supplierId, ownerUserId, balanceStatus, active]);

  const filters: CurrentAccountQuery = useMemo(
    () => ({
      search: search || undefined,
      supplierId: supplierId || undefined,
      ownerUserId: canSeeOwnerFilter ? ownerUserId || undefined : undefined,
      balanceStatus: (balanceStatus || undefined) as BalanceStatus | undefined,
      active: active || undefined,
    }),
    [search, supplierId, ownerUserId, balanceStatus, active, canSeeOwnerFilter],
  );

  const suppliersQuery = useQuery({ queryKey: ['suppliers-active'], queryFn: listActiveSuppliers });
  const usersQuery = useQuery({ queryKey: ['ca-user-options'], queryFn: listCurrentAccountUserOptions });

  const listQuery = useQuery({
    queryKey: ['current-accounts', filters, page],
    queryFn: () => listCurrentAccounts({ ...filters, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const summaryQuery = useQuery({
    queryKey: ['current-accounts-summary', filters],
    queryFn: () => getCurrentAccountsSummary(filters),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['current-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['current-accounts-summary'] });
  };

  const createMutation = useMutation({
    mutationFn: createCurrentAccount,
    onSuccess: () => {
      toast.success('Conta corrente criada');
      setCreateOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const shareMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof shareCurrentAccount>[1] }) =>
      shareCurrentAccount(id, payload),
    onSuccess: (acc) => {
      toast.success('Compartilhamento atualizado');
      setShareTarget(acc);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const supplierFilterOptions: SelectOption[] = [
    { value: '', label: 'Todos os fornecedores' },
    ...(suppliersQuery.data ?? []).map((s) => ({ value: s.id, label: s.label })),
  ];
  const ownerFilterOptions: SelectOption[] = [
    { value: '', label: 'Todos os compradores' },
    ...(usersQuery.data ?? [])
      .filter((u) => u.role === 'COMPRADOR' || u.role === 'ADMIN')
      .map((u) => ({ value: u.id, label: `#${u.userNumber} ${u.name}` })),
  ];

  const summary = summaryQuery.data;
  const accounts = listQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Conta Corrente</h2>
          <p className="mt-1 text-sm text-gray-500">Controle de saldos comerciais por indústria</p>
        </div>
        {canWrite ? (
          <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" /> Nova conta corrente
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <KpiCard
          label="Saldo total"
          value={formatCurrency(Number(summary?.totalBalance ?? 0))}
          icon={BanknotesIcon}
          tone={Number(summary?.totalBalance ?? 0) < 0 ? 'danger' : 'success'}
        />
        <KpiCard label="Contas positivas" value={String(summary?.positiveCount ?? 0)} icon={ArrowUpCircleIcon} tone="success" />
        <KpiCard label="Contas zeradas" value={String(summary?.zeroCount ?? 0)} icon={ScaleIcon} tone="info" />
        <KpiCard label="Contas negativas" value={String(summary?.negativeCount ?? 0)} icon={ArrowDownCircleIcon} tone="danger" />
        <KpiCard label="Total de entradas" value={formatCurrency(Number(summary?.totalEntries ?? 0))} icon={ArrowTrendingUpIcon} tone="success" />
        <KpiCard label="Total de saídas" value={formatCurrency(Number(summary?.totalExits ?? 0))} icon={ArrowTrendingDownIcon} tone="warning" />
      </div>

      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Buscar por conta, fornecedor ou comprador...">
        <div className="w-48">
          <Select options={supplierFilterOptions} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
        </div>
        {canSeeOwnerFilter ? (
          <div className="w-52">
            <Select options={ownerFilterOptions} value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} />
          </div>
        ) : null}
        <div className="w-40">
          <Select options={balanceOptions} value={balanceStatus} onChange={(e) => setBalanceStatus(e.target.value)} />
        </div>
        <div className="w-40">
          <Select options={activeOptions} value={active} onChange={(e) => setActive(e.target.value)} />
        </div>
        actions={
          <ExportButtons
            onExportXlsx={() => exportCurrentAccounts('xlsx', filters)}
            onExportCsv={() => exportCurrentAccounts('csv', filters)}
          />
        }
      </FilterBar>

      {listQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg bg-white py-8 shadow-sm ring-1 ring-gray-900/5">
          <EmptyState
            title="Nenhuma conta corrente encontrada"
            description={canWrite ? 'Crie uma nova conta corrente para começar.' : 'Ajuste os filtros para visualizar contas.'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((acc) => (
            <AccountCard key={acc.id} account={acc} />
          ))}
        </div>
      )}

      {listQuery.data && listQuery.data.total > PAGE_SIZE ? (
        <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-900/5">
          <Pagination page={page} pageSize={PAGE_SIZE} total={listQuery.data.total} onPageChange={setPage} />
        </div>
      ) : null}

      <CurrentAccountFormModal
        open={createOpen}
        mode="create"
        saving={createMutation.isPending}
        isAdmin={isAdmin}
        supplierOptions={suppliersQuery.data ?? []}
        userOptions={usersQuery.data ?? []}
        onClose={() => setCreateOpen(false)}
        onCreate={(data) => createMutation.mutate(data)}
        onUpdate={() => undefined}
      />

      <ShareCurrentAccountModal
        open={!!shareTarget}
        account={shareTarget}
        saving={shareMutation.isPending}
        userOptions={usersQuery.data ?? []}
        onClose={() => setShareTarget(null)}
        onSubmit={(payload) => shareTarget && shareMutation.mutate({ id: shareTarget.id, payload })}
      />
    </div>
  );
}

function AccountCard({ account }: { account: CurrentAccount }) {
  const badge = balanceStatusBadge[account.balanceStatus];
  return (
    <Link
      to={`/conta-corrente/${account.id}`}
      className="flex flex-col gap-3 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-900/5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{account.name}</p>
          <p className="truncate text-sm text-gray-500">{account.supplier.tradeName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge label={badge.label} variant={badge.variant} />
          {!account.isActive ? <StatusBadge label="Inativa" variant="gray" /> : null}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">Saldo atual</p>
        <p className={`text-2xl font-semibold ${balanceTextClass(account.balanceStatus)}`}>
          {formatCurrency(Number(account.balance))}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-gray-400">Entradas</p>
          <p className="font-medium text-green-700">{formatCurrency(Number(account.totalEntries))}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Saídas</p>
          <p className="font-medium text-red-700">{formatCurrency(Number(account.totalExits))}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
        <span>Resp.: #{account.owner.userNumber} {account.owner.name}</span>
        {account.shares.length > 0 ? (
          <span className="flex -space-x-2">
            {account.shares.slice(0, 3).map((s) => (
              <span
                key={s.id}
                title={`#${s.user.userNumber} ${s.user.name}`}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-700 ring-2 ring-white"
              >
                {s.user.name.slice(0, 2).toUpperCase()}
              </span>
            ))}
            {account.shares.length > 3 ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600 ring-2 ring-white">
                +{account.shares.length - 3}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
      {account.lastMovementAt ? (
        <p className="text-xs text-gray-400">Última mov.: {formatDate(account.lastMovementAt)}</p>
      ) : null}
    </Link>
  );
}
