import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  NoSymbolIcon,
  EyeIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import {
  DataTable,
  FilterBar,
  ExportButtons,
  KpiCard,
  StatusBadge,
  ReasonModal,
  Select,
  DateInput,
  type Column,
  type SelectOption,
} from '@/components';
import { financialStatusBadge, dueStatusBadge } from '@/components/statusBadges';
import { formatCurrency, formatDate, formatCompetence } from '@/utils/format';
import { extractApiError } from '@/services/api/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listReceivables,
  getReceivablesSummary,
  createReceivable,
  updateReceivable,
  cancelReceivable,
  listActiveSuppliers,
  listActiveActionTypes,
  type Receivable,
  type ReceivablePayload,
  type ReceivableQuery,
  type FinancialStatus,
  type DueStatus,
} from './receivablesApi';
import { ReceivableFormModal } from './ReceivableFormModal';
import { ReceivableDetailModal } from './ReceivableDetailModal';
import { ReceiptFormModal, type ReceiptFormValues } from '@/features/receipts/ReceiptFormModal';
import { createReceipt, listActiveReceiptMethods } from '@/features/receipts/receiptsApi';
import { exportReceivables } from '@/features/reports/reportsApi';

const PAGE_SIZE = 20;

const financialOptions: SelectOption[] = [
  { value: '', label: 'Status financeiro' },
  { value: 'ABERTO', label: 'Aberto' },
  { value: 'PARCIAL', label: 'Parcial' },
  { value: 'QUITADO', label: 'Quitado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const dueOptions: SelectOption[] = [
  { value: '', label: 'Status vencimento' },
  { value: 'EM_DIA', label: 'Em dia' },
  { value: 'VENCE_HOJE', label: 'Vence hoje' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'SEM_VENCIMENTO', label: 'Sem vencimento' },
];

export function ReceivablesPage() {
  const user = useCurrentUser();
  const canWrite = user.role === 'ADMIN' || user.role === 'COMPRADOR';
  const canSeeBuyer = user.role === 'ADMIN' || user.role === 'DIRETORIA';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [competenceMonth, setCompetenceMonth] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [actionTypeId, setActionTypeId] = useState('');
  const [financialStatus, setFinancialStatus] = useState('');
  const [dueStatus, setDueStatus] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [expectedFrom, setExpectedFrom] = useState('');
  const [expectedTo, setExpectedTo] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<Receivable | null>(null);
  const [detail, setDetail] = useState<Receivable | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Receivable | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<Receivable | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, competenceMonth, supplierId, actionTypeId, financialStatus, dueStatus, buyerId, expectedFrom, expectedTo]);

  const filters: ReceivableQuery = useMemo(
    () => ({
      search: search || undefined,
      competenceMonth: competenceMonth || undefined,
      supplierId: supplierId || undefined,
      actionTypeId: actionTypeId || undefined,
      financialStatus: (financialStatus || undefined) as FinancialStatus | undefined,
      dueStatus: (dueStatus || undefined) as DueStatus | undefined,
      buyerId: canSeeBuyer ? buyerId || undefined : undefined,
      expectedFrom: expectedFrom || undefined,
      expectedTo: expectedTo || undefined,
    }),
    [search, competenceMonth, supplierId, actionTypeId, financialStatus, dueStatus, buyerId, expectedFrom, expectedTo, canSeeBuyer],
  );

  const suppliersQuery = useQuery({ queryKey: ['suppliers-active'], queryFn: listActiveSuppliers });
  const actionTypesQuery = useQuery({ queryKey: ['action-types-active'], queryFn: listActiveActionTypes });
  const methodsQuery = useQuery({ queryKey: ['receipt-methods-active'], queryFn: listActiveReceiptMethods });

  const listQuery = useQuery({
    queryKey: ['receivables', filters, page],
    queryFn: () => listReceivables({ ...filters, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const summaryQuery = useQuery({
    queryKey: ['receivables-summary', filters],
    queryFn: () => getReceivablesSummary(filters),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['receivables'] });
    queryClient.invalidateQueries({ queryKey: ['receivables-summary'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: ReceivablePayload) => createReceivable(data),
    onSuccess: () => {
      toast.success('Lançamento criado');
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReceivablePayload }) => updateReceivable(id, data),
    onSuccess: () => {
      toast.success('Lançamento atualizado');
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelReceivable(id, reason),
    onSuccess: () => {
      toast.success('Lançamento cancelado');
      setCancelTarget(null);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const receiptMutation = useMutation({
    mutationFn: ({ receivableId, values }: { receivableId: string; values: ReceiptFormValues }) =>
      createReceipt({
        receivableId,
        receiptDate: values.receiptDate,
        receiptMethodId: values.receiptMethodId,
        amount: values.amount,
        receiptType: values.receiptType,
        currentAccountId: values.currentAccountId,
        notes: values.notes,
      }),
    onSuccess: () => {
      toast.success('Recebimento registrado');
      setReceiptTarget(null);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipts-summary'] });
      queryClient.invalidateQueries({ queryKey: ['current-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['current-account'] });
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  // Compradores presentes nos resultados (para o filtro de comprador).
  const buyerOptions: SelectOption[] = useMemo(() => {
    const map = new Map<string, string>();
    (listQuery.data?.data ?? []).forEach((r) => map.set(r.buyer.id, `#${r.buyer.userNumber} ${r.buyer.name}`));
    return [{ value: '', label: 'Todos os compradores' }, ...[...map].map(([id, label]) => ({ value: id, label }))];
  }, [listQuery.data]);

  const supplierFilterOptions: SelectOption[] = [
    { value: '', label: 'Todos os fornecedores' },
    ...(suppliersQuery.data ?? []).map((s) => ({ value: s.id, label: s.label })),
  ];
  const actionFilterOptions: SelectOption[] = [
    { value: '', label: 'Todas as ações' },
    ...(actionTypesQuery.data ?? []).map((a) => ({ value: a.id, label: a.label })),
  ];

  const openCreate = () => {
    setFormMode('create');
    setSelected(null);
    setFormOpen(true);
  };
  const openEdit = (r: Receivable) => {
    setFormMode('edit');
    setSelected(r);
    setFormOpen(true);
  };

  const summary = summaryQuery.data;

  const columns: Column<Receivable>[] = [
    { key: 'negotiationDate', header: 'Negociação', render: (r) => formatDate(r.negotiationDate) },
    { key: 'competenceMonth', header: 'Competência', render: (r) => formatCompetence(r.competenceMonth) },
    {
      key: 'expectedReceiptDate',
      header: 'Previsão',
      render: (r) => formatDate(r.expectedReceiptDate),
    },
    {
      key: 'supplier',
      header: 'Fornecedor',
      render: (r) => <span className="font-medium text-gray-900">{r.supplier.tradeName}</span>,
    },
    { key: 'actionType', header: 'Descrição da ação', render: (r) => r.actionType.name },
    {
      key: 'amount',
      header: 'Valor original',
      align: 'right',
      render: (r) => formatCurrency(Number(r.amount)),
    },
    {
      key: 'totalReceived',
      header: 'Recebido',
      align: 'right',
      render: (r) => formatCurrency(Number(r.totalReceived)),
    },
    {
      key: 'openBalance',
      header: 'Saldo aberto',
      align: 'right',
      render: (r) => (
        <span className="font-medium text-gray-900">{formatCurrency(Number(r.openBalance))}</span>
      ),
    },
    {
      key: 'financialStatus',
      header: 'Financeiro',
      render: (r) => {
        const b = financialStatusBadge[r.financialStatus];
        return <StatusBadge label={b.label} variant={b.variant} />;
      },
    },
    {
      key: 'dueStatus',
      header: 'Vencimento',
      render: (r) => {
        const b = dueStatusBadge[r.dueStatus];
        return <StatusBadge label={b.label} variant={b.variant} />;
      },
    },
  ];

  if (canSeeBuyer) {
    columns.push({
      key: 'buyer',
      header: 'Comprador',
      render: (r) => `#${r.buyer.userNumber} ${r.buyer.name}`,
    });
  }

  columns.push({
    key: 'actions',
    header: 'Ações',
    align: 'right',
    render: (r) => {
      const isCanceled = r.financialStatus === 'CANCELADO';
      return (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setDetail(r)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
            title="Visualizar"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {canWrite ? (
            <>
              <button
                type="button"
                onClick={() => openEdit(r)}
                disabled={isCanceled}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
                title={isCanceled ? 'Lançamento cancelado' : 'Editar'}
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCancelTarget(r)}
                disabled={isCanceled}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                title={isCanceled ? 'Já cancelado' : 'Cancelar'}
              >
                <NoSymbolIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setReceiptTarget(r)}
                disabled={isCanceled || r.financialStatus === 'QUITADO'}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600 disabled:cursor-not-allowed disabled:opacity-40"
                title={
                  isCanceled
                    ? 'Lançamento cancelado'
                    : r.financialStatus === 'QUITADO'
                      ? 'Lançamento quitado'
                      : 'Registrar recebimento'
                }
              >
                <BanknotesIcon className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      );
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Lançamentos</h2>
          <p className="mt-1 text-sm text-gray-500">
            Controle de valores negociados e pendentes de recebimento
          </p>
        </div>
        {canWrite ? (
          <button type="button" className="btn-primary" onClick={openCreate}>
            <PlusIcon className="h-5 w-5" />
            Novo lançamento
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total em aberto"
          value={formatCurrency(Number(summary?.totalOpen ?? 0))}
          icon={BanknotesIcon}
          tone="info"
        />
        <KpiCard
          label="Total vencido"
          value={formatCurrency(Number(summary?.totalOverdue ?? 0))}
          icon={ExclamationTriangleIcon}
          tone="danger"
        />
        <KpiCard
          label="Pendentes"
          value={String(summary?.pendingCount ?? 0)}
          hint={`${summary?.overdueCount ?? 0} vencido(s)`}
          icon={ClockIcon}
          tone="warning"
        />
        <KpiCard
          label="Previsão 30 dias"
          value={formatCurrency(Number(summary?.next30Days ?? 0))}
          icon={CalendarDaysIcon}
          tone="success"
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por fornecedor, ação, observação ou comprador..."
      >
        <div className="w-36">
          <input
            type="month"
            value={competenceMonth}
            onChange={(e) => setCompetenceMonth(e.target.value)}
            className="input-base"
            title="Competência"
          />
        </div>
        <div className="w-48">
          <Select
            options={supplierFilterOptions}
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            options={actionFilterOptions}
            value={actionTypeId}
            onChange={(e) => setActionTypeId(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            options={financialOptions}
            value={financialStatus}
            onChange={(e) => setFinancialStatus(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            options={dueOptions}
            value={dueStatus}
            onChange={(e) => setDueStatus(e.target.value)}
          />
        </div>
        {canSeeBuyer ? (
          <div className="w-52">
            <Select
              options={buyerOptions}
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
            />
          </div>
        ) : null}
        <div className="w-40">
          <DateInput
            value={expectedFrom}
            onChange={(e) => setExpectedFrom(e.target.value)}
            title="Previsão de"
          />
        </div>
        <div className="w-40">
          <DateInput
            value={expectedTo}
            onChange={(e) => setExpectedTo(e.target.value)}
            title="Previsão até"
          />
        </div>
        actions={
          <ExportButtons
            onExportXlsx={() => exportReceivables('xlsx', filters)}
            onExportCsv={() => exportReceivables('csv', filters)}
          />
        }
      </FilterBar>

      <DataTable
        columns={columns}
        data={listQuery.data?.data ?? []}
        rowKey={(r) => r.id}
        loading={listQuery.isLoading}
        onRowClick={(r) => setDetail(r)}
        emptyTitle="Nenhum lançamento encontrado"
        emptyDescription="Ajuste os filtros ou crie um novo lançamento."
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: listQuery.data?.total ?? 0,
          onPageChange: setPage,
        }}
      />

      <ReceivableFormModal
        open={formOpen}
        mode={formMode}
        initial={selected}
        saving={createMutation.isPending || editMutation.isPending}
        supplierOptions={suppliersQuery.data ?? []}
        actionTypeOptions={actionTypesQuery.data ?? []}
        onClose={() => setFormOpen(false)}
        onSubmit={(data) =>
          formMode === 'create'
            ? createMutation.mutate(data)
            : selected && editMutation.mutate({ id: selected.id, data })
        }
      />

      <ReceivableDetailModal
        open={!!detail}
        receivable={detail}
        onClose={() => setDetail(null)}
      />

      <ReceiptFormModal
        open={!!receiptTarget}
        mode="create"
        saving={receiptMutation.isPending}
        receipt={null}
        receivable={
          receiptTarget
            ? {
                id: receiptTarget.id,
                supplierId: receiptTarget.supplier.id,
                supplierName: receiptTarget.supplier.tradeName,
                actionName: receiptTarget.actionType.name,
                competenceMonth: receiptTarget.competenceMonth,
                amount: receiptTarget.amount,
                openBalance: receiptTarget.openBalance,
              }
            : null
        }
        methods={methodsQuery.data ?? []}
        onClose={() => setReceiptTarget(null)}
        onSubmit={(values) =>
          receiptTarget && receiptMutation.mutate({ receivableId: receiptTarget.id, values })
        }
      />

      <ReasonModal
        open={!!cancelTarget}
        title="Cancelar lançamento"
        description={
          cancelTarget
            ? `Cancelar o lançamento de ${cancelTarget.supplier.tradeName} (${formatCurrency(Number(cancelTarget.amount))})? Esta ação não exclui o registro.`
            : undefined
        }
        confirmLabel="Cancelar lançamento"
        tone="danger"
        loading={cancelMutation.isPending}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => cancelTarget && cancelMutation.mutate({ id: cancelTarget.id, reason })}
      />
    </div>
  );
}
