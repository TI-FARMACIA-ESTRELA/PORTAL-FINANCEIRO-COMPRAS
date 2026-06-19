import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  AdjustmentsHorizontalIcon,
  ShareIcon,
  PencilSquareIcon,
  PowerIcon,
  EyeIcon,
  ArrowUturnLeftIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  DataTable,
  FilterBar,
  ExportButtons,
  KpiCard,
  StatusBadge,
  ReasonModal,
  ConfirmDialog,
  LoadingSpinner,
  Select,
  DateInput,
  type Column,
  type SelectOption,
} from '@/components';
import { formatCurrency, formatDate } from '@/utils/format';
import { extractApiError } from '@/services/api/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listActiveSuppliers, listActiveActionTypes } from '@/features/receivables/receivablesApi';
import { listActiveReceiptMethods } from '@/features/receipts/receiptsApi';
import {
  getCurrentAccount,
  listCurrentAccountMovements,
  listCurrentAccountUserOptions,
  updateCurrentAccount,
  setCurrentAccountActive,
  shareCurrentAccount,
  createEntryMovement,
  createExitMovement,
  createAdjustmentMovement,
  reverseMovement,
  type CurrentAccountMovement,
  type MovementQuery,
  type MovementType,
} from './currentAccountsApi';
import { balanceStatusBadge, movementTypeBadge, movementAmountClass } from './currentAccountsUi';
import { CurrentAccountFormModal } from './CurrentAccountFormModal';
import { ShareCurrentAccountModal } from './ShareCurrentAccountModal';
import { EntryMovementModal } from './EntryMovementModal';
import { ExitMovementModal } from './ExitMovementModal';
import { AdjustmentMovementModal } from './AdjustmentMovementModal';
import { MovementDetailModal } from './MovementDetailModal';
import { exportCurrentAccountMovements } from '@/features/reports/reportsApi';

const PAGE_SIZE = 20;

const typeOptions: SelectOption[] = [
  { value: '', label: 'Todos os tipos' },
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'SAIDA', label: 'Saída' },
  { value: 'AJUSTE_POSITIVO', label: 'Ajuste +' },
  { value: 'AJUSTE_NEGATIVO', label: 'Ajuste -' },
  { value: 'ESTORNO', label: 'Estorno' },
];

export function CurrentAccountDetailPage() {
  const { id = '' } = useParams();
  const user = useCurrentUser();
  const isAdmin = user.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState('');
  const [receiptMethodId, setReceiptMethodId] = useState('');
  const [actionTypeId, setActionTypeId] = useState('');
  const [page, setPage] = useState(1);

  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [detail, setDetail] = useState<CurrentAccountMovement | null>(null);
  const [reverseTarget, setReverseTarget] = useState<CurrentAccountMovement | null>(null);
  const [activeConfirm, setActiveConfirm] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [search, from, to, type, receiptMethodId, actionTypeId]);

  const accountQuery = useQuery({ queryKey: ['current-account', id], queryFn: () => getCurrentAccount(id) });
  const suppliersQuery = useQuery({ queryKey: ['suppliers-active'], queryFn: listActiveSuppliers });
  const actionTypesQuery = useQuery({ queryKey: ['action-types-active'], queryFn: listActiveActionTypes });
  const methodsQuery = useQuery({ queryKey: ['receipt-methods-active'], queryFn: listActiveReceiptMethods });
  const usersQuery = useQuery({ queryKey: ['ca-user-options'], queryFn: listCurrentAccountUserOptions });

  const filters: MovementQuery = useMemo(
    () => ({
      search: search || undefined,
      from: from || undefined,
      to: to || undefined,
      type: (type || undefined) as MovementType | undefined,
      receiptMethodId: receiptMethodId || undefined,
      actionTypeId: actionTypeId || undefined,
    }),
    [search, from, to, type, receiptMethodId, actionTypeId],
  );

  const movementsQuery = useQuery({
    queryKey: ['current-account-movements', id, filters, page],
    queryFn: () => listCurrentAccountMovements(id, { ...filters, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['current-account', id] });
    queryClient.invalidateQueries({ queryKey: ['current-account-movements', id] });
    queryClient.invalidateQueries({ queryKey: ['current-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['current-accounts-summary'] });
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateCurrentAccount>[1]) => updateCurrentAccount(id, payload),
    onSuccess: () => {
      toast.success('Conta atualizada');
      setEditOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const activeMutation = useMutation({
    mutationFn: (isActive: boolean) => setCurrentAccountActive(id, isActive),
    onSuccess: () => {
      toast.success('Status atualizado');
      setActiveConfirm(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const shareMutation = useMutation({
    mutationFn: (payload: Parameters<typeof shareCurrentAccount>[1]) => shareCurrentAccount(id, payload),
    onSuccess: () => {
      toast.success('Compartilhamento atualizado');
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const entryMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createEntryMovement>[1]) => createEntryMovement(id, payload),
    onSuccess: () => {
      toast.success('Entrada registrada');
      setEntryOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const exitMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createExitMovement>[1]) => createExitMovement(id, payload),
    onSuccess: () => {
      toast.success('Saída registrada');
      setExitOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const adjustMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createAdjustmentMovement>[1]) => createAdjustmentMovement(id, payload),
    onSuccess: () => {
      toast.success('Ajuste registrado');
      setAdjustOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const reverseMutation = useMutation({
    mutationFn: ({ movementId, reason }: { movementId: string; reason: string }) =>
      reverseMovement(id, movementId, reason),
    onSuccess: () => {
      toast.success('Movimentação estornada');
      setReverseTarget(null);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const account = accountQuery.data;

  const methodFilterOptions: SelectOption[] = [
    { value: '', label: 'Forma de recebimento' },
    ...(methodsQuery.data ?? []).map((m) => ({ value: m.id, label: m.name })),
  ];
  const actionFilterOptions: SelectOption[] = [
    { value: '', label: 'Descrição de ação' },
    ...(actionTypesQuery.data ?? []).map((a) => ({ value: a.id, label: a.label })),
  ];

  const columns: Column<CurrentAccountMovement>[] = [
    { key: 'movementDate', header: 'Data', render: (m) => formatDate(m.movementDate) },
    {
      key: 'type',
      header: 'Tipo',
      render: (m) => {
        const b = movementTypeBadge[m.type];
        return <StatusBadge label={b.label} variant={b.variant} />;
      },
    },
    { key: 'description', header: 'Descrição', render: (m) => m.description || (m.origin === 'RECEIPT' ? 'Recebimento' : '—') },
    {
      key: 'origin',
      header: 'Origem',
      render: (m) =>
        m.origin === 'RECEIPT' ? (
          <StatusBadge label="Recebimento" variant="purple" />
        ) : (
          <span className="text-gray-400">Manual</span>
        ),
    },
    { key: 'method', header: 'Forma', render: (m) => m.receiptMethod?.name || '—' },
    { key: 'action', header: 'Ação', render: (m) => m.actionType?.name || '—' },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right',
      render: (m) => (
        <span className={`font-medium ${movementAmountClass(m.sign)}`}>
          {m.sign} {formatCurrency(Number(m.amount))}
        </span>
      ),
    },
    {
      key: 'balanceAfter',
      header: 'Saldo após',
      align: 'right',
      render: (m) => (m.balanceAfter != null ? formatCurrency(Number(m.balanceAfter)) : '—'),
    },
    { key: 'user', header: 'Usuário', render: (m) => `#${m.createdBy.userNumber} ${m.createdBy.name}` },
    {
      key: 'status',
      header: 'Status',
      render: (m) =>
        m.isReversed ? (
          <StatusBadge label="Estornada" variant="amber" />
        ) : m.type === 'ESTORNO' ? (
          <StatusBadge label="Estorno" variant="amber" />
        ) : (
          <StatusBadge label="Ativa" variant="green" />
        ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (m) => {
        const canReverse = isAdmin && !m.isReversed && m.type !== 'ESTORNO';
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDetail(m);
              }}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
              title="Visualizar"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            {canReverse ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReverseTarget(m);
                }}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                title="Estornar"
              >
                <ArrowUturnLeftIcon className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  if (accountQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (accountQuery.isError || !account) {
    return (
      <div className="space-y-4">
        <Link to="/conta-corrente" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
          <ArrowLeftIcon className="h-4 w-4" /> Voltar
        </Link>
        <div className="rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-900/5">
          <p className="text-gray-600">Conta corrente não encontrada ou sem acesso.</p>
        </div>
      </div>
    );
  }

  const badge = balanceStatusBadge[account.balanceStatus];
  const canMove = account.access.move && account.isActive;
  const canEdit = account.access.edit;
  const canToggleActive = isAdmin || account.owner.id === user.id;
  const canShare = isAdmin || account.owner.id === user.id;

  return (
    <div className="space-y-6">
      <Link to="/conta-corrente" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
        <ArrowLeftIcon className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900">{account.name}</h2>
            <StatusBadge label={badge.label} variant={badge.variant} />
            {!account.isActive ? <StatusBadge label="Inativa" variant="gray" /> : null}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {account.supplier.tradeName} · Responsável: #{account.owner.userNumber} {account.owner.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canMove ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => setEntryOpen(true)}>
                <ArrowUpCircleIcon className="h-4 w-4 text-green-600" /> Entrada
              </button>
              <button type="button" className="btn-secondary" onClick={() => setExitOpen(true)}>
                <ArrowDownCircleIcon className="h-4 w-4 text-red-600" /> Saída
              </button>
            </>
          ) : null}
          {isAdmin && account.isActive ? (
            <button type="button" className="btn-secondary" onClick={() => setAdjustOpen(true)}>
              <AdjustmentsHorizontalIcon className="h-4 w-4 text-purple-600" /> Ajuste
            </button>
          ) : null}
          {canShare ? (
            <button type="button" className="btn-secondary" onClick={() => setShareOpen(true)}>
              <ShareIcon className="h-4 w-4" /> Compartilhar
            </button>
          ) : null}
          {canEdit ? (
            <button type="button" className="btn-secondary" onClick={() => setEditOpen(true)}>
              <PencilSquareIcon className="h-4 w-4" /> Editar
            </button>
          ) : null}
          {canToggleActive ? (
            <button type="button" className="btn-secondary" onClick={() => setActiveConfirm(true)}>
              <PowerIcon className="h-4 w-4" /> {account.isActive ? 'Inativar' : 'Ativar'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Saldo atual"
          value={formatCurrency(Number(account.balance))}
          icon={BanknotesIcon}
          tone={account.balanceStatus === 'NEGATIVO' ? 'danger' : account.balanceStatus === 'POSITIVO' ? 'success' : 'info'}
        />
        <KpiCard label="Total de entradas" value={formatCurrency(Number(account.totalEntries))} icon={ArrowTrendingUpIcon} tone="success" />
        <KpiCard label="Total de saídas" value={formatCurrency(Number(account.totalExits))} icon={ArrowTrendingDownIcon} tone="warning" />
        <KpiCard
          label="Última movimentação"
          value={account.lastMovementAt ? formatDate(account.lastMovementAt) : '—'}
          icon={ClockIcon}
          tone="default"
        />
      </div>

      {account.notes ? (
        <div className="rounded-lg bg-white p-4 text-sm text-gray-600 shadow-sm ring-1 ring-gray-900/5">
          <span className="font-medium text-gray-700">Observações: </span>
          {account.notes}
        </div>
      ) : null}

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Extrato</h3>
        <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Buscar por descrição, observação ou usuário...">
          <div className="w-40">
            <DateInput value={from} onChange={(e) => setFrom(e.target.value)} title="De" />
          </div>
          <div className="w-40">
            <DateInput value={to} onChange={(e) => setTo(e.target.value)} title="Até" />
          </div>
          <div className="w-40">
            <Select options={typeOptions} value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          <div className="w-48">
            <Select options={methodFilterOptions} value={receiptMethodId} onChange={(e) => setReceiptMethodId(e.target.value)} />
          </div>
          <div className="w-48">
            <Select options={actionFilterOptions} value={actionTypeId} onChange={(e) => setActionTypeId(e.target.value)} />
          </div>
          actions={
            <ExportButtons
              onExportXlsx={() => exportCurrentAccountMovements(id, 'xlsx', filters)}
              onExportCsv={() => exportCurrentAccountMovements(id, 'csv', filters)}
            />
          }
        </FilterBar>

        <div className="mt-4">
          <DataTable
            columns={columns}
            data={movementsQuery.data?.data ?? []}
            rowKey={(m) => m.id}
            loading={movementsQuery.isLoading}
            onRowClick={(m) => setDetail(m)}
            emptyTitle="Nenhuma movimentação encontrada"
            emptyDescription="Registre entradas e saídas para movimentar esta conta."
            pagination={{ page, pageSize: PAGE_SIZE, total: movementsQuery.data?.total ?? 0, onPageChange: setPage }}
          />
        </div>
      </div>

      <CurrentAccountFormModal
        open={editOpen}
        mode="edit"
        initial={account}
        saving={updateMutation.isPending}
        isAdmin={isAdmin}
        supplierOptions={suppliersQuery.data ?? []}
        userOptions={usersQuery.data ?? []}
        onClose={() => setEditOpen(false)}
        onCreate={() => undefined}
        onUpdate={(data) => updateMutation.mutate(data)}
      />

      <ShareCurrentAccountModal
        open={shareOpen}
        account={account}
        saving={shareMutation.isPending}
        userOptions={usersQuery.data ?? []}
        onClose={() => setShareOpen(false)}
        onSubmit={(payload) => shareMutation.mutate(payload)}
      />

      <EntryMovementModal
        open={entryOpen}
        saving={entryMutation.isPending}
        methodOptions={methodsQuery.data ?? []}
        onClose={() => setEntryOpen(false)}
        onSubmit={(data) => entryMutation.mutate(data)}
      />

      <ExitMovementModal
        open={exitOpen}
        saving={exitMutation.isPending}
        actionTypeOptions={actionTypesQuery.data ?? []}
        onClose={() => setExitOpen(false)}
        onSubmit={(data) => exitMutation.mutate(data)}
      />

      <AdjustmentMovementModal
        open={adjustOpen}
        saving={adjustMutation.isPending}
        onClose={() => setAdjustOpen(false)}
        onSubmit={(data) => adjustMutation.mutate(data)}
      />

      <MovementDetailModal open={!!detail} movement={detail} onClose={() => setDetail(null)} />

      <ReasonModal
        open={!!reverseTarget}
        title="Estornar movimentação"
        description={
          reverseTarget
            ? `Estornar ${movementTypeBadge[reverseTarget.type].label.toLowerCase()} de ${formatCurrency(Number(reverseTarget.amount))}? O registro original é mantido e neutralizado por um estorno.`
            : undefined
        }
        confirmLabel="Estornar"
        tone="danger"
        loading={reverseMutation.isPending}
        onClose={() => setReverseTarget(null)}
        onConfirm={(reason) => reverseTarget && reverseMutation.mutate({ movementId: reverseTarget.id, reason })}
      />

      <ConfirmDialog
        open={activeConfirm}
        title={account.isActive ? 'Inativar conta corrente' : 'Ativar conta corrente'}
        message={
          account.isActive
            ? 'A conta ficará inativa e não poderá receber novas movimentações. O histórico é preservado.'
            : 'A conta voltará a aceitar movimentações.'
        }
        confirmLabel={account.isActive ? 'Inativar' : 'Ativar'}
        tone={account.isActive ? 'danger' : 'primary'}
        loading={activeMutation.isPending}
        onClose={() => setActiveConfirm(false)}
        onConfirm={() => activeMutation.mutate(!account.isActive)}
      />
    </div>
  );
}
