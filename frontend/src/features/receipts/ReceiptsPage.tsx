import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PencilSquareIcon,
  EyeIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ClockIcon,
  HashtagIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import {
  DataTable,
  FilterBar,
  ExportButtons,
  KpiCard,
  StatusBadge,
  ReasonModal,
  ConfirmDialog,
  Select,
  DateInput,
  type Column,
  type SelectOption,
} from '@/components';
import { confirmationStatusBadge, financialStatusBadge } from '@/components/statusBadges';
import { formatCurrency, formatDate, formatCompetence } from '@/utils/format';
import { extractApiError } from '@/services/api/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listActiveSuppliers, listActiveActionTypes } from '@/features/receivables/receivablesApi';
import {
  listReceipts,
  getReceiptsSummary,
  updateReceipt,
  confirmReceipt,
  reverseReceipt,
  listActiveReceiptMethods,
  type Receipt,
  type ReceiptQuery,
  type ReceiptType,
  type ConfirmationStatus,
  type FinancialStatus,
} from './receiptsApi';
import { ReceiptFormModal, type ReceiptFormValues } from './ReceiptFormModal';
import { ReceiptDetailModal } from './ReceiptDetailModal';
import { exportReceipts } from '@/features/reports/reportsApi';

const PAGE_SIZE = 20;

const confirmationOptions: SelectOption[] = [
  { value: '', label: 'Status confirmação' },
  { value: 'PENDENTE_CONFIRMACAO', label: 'Pendente' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'ESTORNADO', label: 'Estornado' },
];

const typeFilterOptions: SelectOption[] = [
  { value: '', label: 'Tipo' },
  { value: 'INTEGRAL', label: 'Integral' },
  { value: 'PARCIAL', label: 'Parcial' },
];

const receivableStatusOptions: SelectOption[] = [
  { value: '', label: 'Status lançamento' },
  { value: 'ABERTO', label: 'Aberto' },
  { value: 'PARCIAL', label: 'Parcial' },
  { value: 'QUITADO', label: 'Quitado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export function ReceiptsPage() {
  const user = useCurrentUser();
  const isAdmin = user.role === 'ADMIN';
  const canWrite = user.role === 'ADMIN' || user.role === 'COMPRADOR';
  const canSeeBuyer = user.role === 'ADMIN' || user.role === 'DIRETORIA';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [receiptFrom, setReceiptFrom] = useState('');
  const [receiptTo, setReceiptTo] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [actionTypeId, setActionTypeId] = useState('');
  const [receiptMethodId, setReceiptMethodId] = useState('');
  const [receiptType, setReceiptType] = useState('');
  const [confirmationStatus, setConfirmationStatus] = useState('');
  const [receivableStatus, setReceivableStatus] = useState('');
  const [competenceMonth, setCompetenceMonth] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<Receipt | null>(null);
  const [editTarget, setEditTarget] = useState<Receipt | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Receipt | null>(null);
  const [reverseTarget, setReverseTarget] = useState<Receipt | null>(null);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    receiptFrom,
    receiptTo,
    supplierId,
    actionTypeId,
    receiptMethodId,
    receiptType,
    confirmationStatus,
    receivableStatus,
    competenceMonth,
    buyerId,
  ]);

  const filters: ReceiptQuery = useMemo(
    () => ({
      search: search || undefined,
      receiptFrom: receiptFrom || undefined,
      receiptTo: receiptTo || undefined,
      supplierId: supplierId || undefined,
      actionTypeId: actionTypeId || undefined,
      receiptMethodId: receiptMethodId || undefined,
      receiptType: (receiptType || undefined) as ReceiptType | undefined,
      confirmationStatus: (confirmationStatus || undefined) as ConfirmationStatus | undefined,
      receivableStatus: (receivableStatus || undefined) as FinancialStatus | undefined,
      competenceMonth: competenceMonth || undefined,
      buyerId: canSeeBuyer ? buyerId || undefined : undefined,
    }),
    [
      search,
      receiptFrom,
      receiptTo,
      supplierId,
      actionTypeId,
      receiptMethodId,
      receiptType,
      confirmationStatus,
      receivableStatus,
      competenceMonth,
      buyerId,
      canSeeBuyer,
    ],
  );

  const suppliersQuery = useQuery({ queryKey: ['suppliers-active'], queryFn: listActiveSuppliers });
  const actionTypesQuery = useQuery({ queryKey: ['action-types-active'], queryFn: listActiveActionTypes });
  const methodsQuery = useQuery({ queryKey: ['receipt-methods-active'], queryFn: listActiveReceiptMethods });

  const listQuery = useQuery({
    queryKey: ['receipts', filters, page],
    queryFn: () => listReceipts({ ...filters, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const summaryQuery = useQuery({
    queryKey: ['receipts-summary', filters],
    queryFn: () => getReceiptsSummary(filters),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['receipts'] });
    queryClient.invalidateQueries({ queryKey: ['receipts-summary'] });
    queryClient.invalidateQueries({ queryKey: ['receivables'] });
    queryClient.invalidateQueries({ queryKey: ['receivables-summary'] });
    queryClient.invalidateQueries({ queryKey: ['current-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['current-account'] });
  };

  const editMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ReceiptFormValues }) =>
      updateReceipt(id, {
        receiptDate: values.receiptDate,
        receiptMethodId: values.receiptMethodId,
        amount: values.amount,
        receiptType: values.receiptType,
        currentAccountId: values.currentAccountId,
        notes: values.notes,
        reason: values.reason ?? '',
      }),
    onSuccess: () => {
      toast.success('Recebimento atualizado');
      setEditTarget(null);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmReceipt(id),
    onSuccess: () => {
      toast.success('Recebimento confirmado');
      setConfirmTarget(null);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const reverseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reverseReceipt(id, reason),
    onSuccess: () => {
      toast.success('Recebimento estornado');
      setReverseTarget(null);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const buyerOptions: SelectOption[] = useMemo(() => {
    const map = new Map<string, string>();
    (listQuery.data?.data ?? []).forEach((r) =>
      map.set(r.receivable.buyer.id, `#${r.receivable.buyer.userNumber} ${r.receivable.buyer.name}`),
    );
    return [
      { value: '', label: 'Todos os compradores' },
      ...[...map].map(([id, label]) => ({ value: id, label })),
    ];
  }, [listQuery.data]);

  const supplierFilterOptions: SelectOption[] = [
    { value: '', label: 'Todos os fornecedores' },
    ...(suppliersQuery.data ?? []).map((s) => ({ value: s.id, label: s.label })),
  ];
  const actionFilterOptions: SelectOption[] = [
    { value: '', label: 'Todas as ações' },
    ...(actionTypesQuery.data ?? []).map((a) => ({ value: a.id, label: a.label })),
  ];
  const methodFilterOptions: SelectOption[] = [
    { value: '', label: 'Forma de recebimento' },
    ...(methodsQuery.data ?? []).map((m) => ({ value: m.id, label: m.name })),
  ];

  const summary = summaryQuery.data;

  const columns: Column<Receipt>[] = [
    { key: 'receiptDate', header: 'Recebimento', render: (r) => formatDate(r.receiptDate) },
    {
      key: 'supplier',
      header: 'Fornecedor',
      render: (r) => <span className="font-medium text-gray-900">{r.receivable.supplier.tradeName}</span>,
    },
    { key: 'action', header: 'Ação', render: (r) => r.receivable.actionType.name },
    {
      key: 'competence',
      header: 'Competência',
      render: (r) => formatCompetence(r.receivable.competenceMonth),
    },
    {
      key: 'origAmount',
      header: 'Valor original',
      align: 'right',
      render: (r) => formatCurrency(Number(r.receivable.amount)),
    },
    {
      key: 'amount',
      header: 'Recebido',
      align: 'right',
      render: (r) => <span className="font-medium text-gray-900">{formatCurrency(Number(r.amount))}</span>,
    },
    {
      key: 'totalReceived',
      header: 'Total recebido',
      align: 'right',
      render: (r) => formatCurrency(Number(r.receivable.totalReceived)),
    },
    {
      key: 'openBalance',
      header: 'Saldo restante',
      align: 'right',
      render: (r) => formatCurrency(Number(r.receivable.openBalance)),
    },
    { key: 'type', header: 'Tipo', render: (r) => (r.receiptType === 'INTEGRAL' ? 'Integral' : 'Parcial') },
    { key: 'method', header: 'Forma', render: (r) => r.receiptMethod.name },
    {
      key: 'destination',
      header: 'Destino',
      render: (r) =>
        r.destinationType === 'CREDITO_CONTA_CORRENTE' ? (
          <span className="text-purple-700">
            Conta corrente{r.currentAccount ? `: ${r.currentAccount.name}` : ''}
          </span>
        ) : (
          <span className="text-gray-600">Baixa simples</span>
        ),
    },
    {
      key: 'confirmation',
      header: 'Confirmação',
      render: (r) => {
        const b = confirmationStatusBadge[r.confirmationStatus];
        return <StatusBadge label={b.label} variant={b.variant} />;
      },
    },
    {
      key: 'expected',
      header: 'Previsão',
      render: (r) => formatDate(r.receivable.expectedReceiptDate),
    },
    {
      key: 'financial',
      header: 'Lançamento',
      render: (r) => {
        const b = financialStatusBadge[r.receivable.financialStatus];
        return <StatusBadge label={b.label} variant={b.variant} />;
      },
    },
  ];

  if (canSeeBuyer) {
    columns.push({
      key: 'buyer',
      header: 'Comprador',
      render: (r) => `#${r.receivable.buyer.userNumber} ${r.receivable.buyer.name}`,
    });
  }

  columns.push({
    key: 'actions',
    header: 'Ações',
    align: 'right',
    render: (r) => {
      const finished = r.confirmationStatus === 'ESTORNADO' || r.confirmationStatus === 'CANCELADO';
      const editable = canWrite && !finished && !r.reversalOfReceiptId;
      return (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setDetail(r)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
            title="Visualizar recebimento"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {editable ? (
            <button
              type="button"
              onClick={() => setEditTarget(r)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
              title="Editar recebimento"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
          ) : null}
          {isAdmin && r.confirmationStatus === 'PENDENTE_CONFIRMACAO' ? (
            <button
              type="button"
              onClick={() => setConfirmTarget(r)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600"
              title="Confirmar recebimento"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </button>
          ) : null}
          {isAdmin && !finished ? (
            <button
              type="button"
              onClick={() => setReverseTarget(r)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Estornar recebimento"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      );
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Recebimentos/Baixas</h2>
        <p className="mt-1 text-sm text-gray-500">
          Histórico de recebimentos integrais, parciais e baixas comerciais
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label="Recebido no mês"
          value={formatCurrency(Number(summary?.receivedMonth ?? 0))}
          icon={BanknotesIcon}
          tone="success"
        />
        <KpiCard
          label="Recebido no ano"
          value={formatCurrency(Number(summary?.receivedYear ?? 0))}
          icon={CalendarDaysIcon}
          tone="info"
        />
        <KpiCard
          label="Recebimentos"
          value={String(summary?.receiptsCount ?? 0)}
          icon={HashtagIcon}
          tone="default"
        />
        <KpiCard
          label="Pendentes"
          value={String(summary?.pendingConfirmation ?? 0)}
          hint="aguardando confirmação"
          icon={ClockIcon}
          tone="warning"
        />
        <KpiCard
          label="Parcial em aberto"
          value={formatCurrency(Number(summary?.partialOpen ?? 0))}
          icon={ScaleIcon}
          tone="info"
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por fornecedor, ação, observação ou comprador..."
      >
        <div className="w-40">
          <DateInput value={receiptFrom} onChange={(e) => setReceiptFrom(e.target.value)} title="Recebido de" />
        </div>
        <div className="w-40">
          <DateInput value={receiptTo} onChange={(e) => setReceiptTo(e.target.value)} title="Recebido até" />
        </div>
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
          <Select options={supplierFilterOptions} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
        </div>
        <div className="w-44">
          <Select options={actionFilterOptions} value={actionTypeId} onChange={(e) => setActionTypeId(e.target.value)} />
        </div>
        <div className="w-48">
          <Select options={methodFilterOptions} value={receiptMethodId} onChange={(e) => setReceiptMethodId(e.target.value)} />
        </div>
        <div className="w-36">
          <Select options={typeFilterOptions} value={receiptType} onChange={(e) => setReceiptType(e.target.value)} />
        </div>
        <div className="w-44">
          <Select options={confirmationOptions} value={confirmationStatus} onChange={(e) => setConfirmationStatus(e.target.value)} />
        </div>
        <div className="w-44">
          <Select options={receivableStatusOptions} value={receivableStatus} onChange={(e) => setReceivableStatus(e.target.value)} />
        </div>
        {canSeeBuyer ? (
          <div className="w-52">
            <Select options={buyerOptions} value={buyerId} onChange={(e) => setBuyerId(e.target.value)} />
          </div>
        ) : null}
        actions={
          <ExportButtons
            onExportXlsx={() => exportReceipts('xlsx', filters)}
            onExportCsv={() => exportReceipts('csv', filters)}
          />
        }
      </FilterBar>

      <DataTable
        columns={columns}
        data={listQuery.data?.data ?? []}
        rowKey={(r) => r.id}
        loading={listQuery.isLoading}
        onRowClick={(r) => setDetail(r)}
        emptyTitle="Nenhum recebimento encontrado"
        emptyDescription="Registre recebimentos a partir da tela de Lançamentos."
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: listQuery.data?.total ?? 0,
          onPageChange: setPage,
        }}
      />

      <ReceiptDetailModal open={!!detail} receipt={detail} onClose={() => setDetail(null)} />

      <ReceiptFormModal
        open={!!editTarget}
        mode="edit"
        saving={editMutation.isPending}
        receipt={editTarget}
        receivable={
          editTarget
            ? {
                id: editTarget.receivable.id,
                supplierId: editTarget.receivable.supplier.id,
                supplierName: editTarget.receivable.supplier.tradeName,
                actionName: editTarget.receivable.actionType.name,
                competenceMonth: editTarget.receivable.competenceMonth,
                amount: editTarget.receivable.amount,
                openBalance: editTarget.receivable.openBalance,
              }
            : null
        }
        methods={methodsQuery.data ?? []}
        onClose={() => setEditTarget(null)}
        onSubmit={(values) => editTarget && editMutation.mutate({ id: editTarget.id, values })}
      />

      <ConfirmDialog
        open={!!confirmTarget}
        title="Confirmar recebimento"
        message={
          confirmTarget
            ? `Confirmar o recebimento de ${formatCurrency(Number(confirmTarget.amount))} de ${confirmTarget.receivable.supplier.tradeName}? O saldo do lançamento será recalculado.`
            : ''
        }
        confirmLabel="Confirmar"
        tone="primary"
        loading={confirmMutation.isPending}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && confirmMutation.mutate(confirmTarget.id)}
      />

      <ReasonModal
        open={!!reverseTarget}
        title="Estornar recebimento"
        description={
          reverseTarget
            ? `Estornar o recebimento de ${formatCurrency(Number(reverseTarget.amount))}? O registro não é excluído e o saldo será recalculado.`
            : undefined
        }
        confirmLabel="Estornar"
        tone="danger"
        loading={reverseMutation.isPending}
        onClose={() => setReverseTarget(null)}
        onConfirm={(reason) => reverseTarget && reverseMutation.mutate({ id: reverseTarget.id, reason })}
      />
    </div>
  );
}
