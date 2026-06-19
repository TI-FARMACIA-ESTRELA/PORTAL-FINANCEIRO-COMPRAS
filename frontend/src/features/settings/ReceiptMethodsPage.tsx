import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import {
  DataTable,
  FilterBar,
  StatusBadge,
  ConfirmDialog,
  ReasonModal,
  Select,
  type Column,
  type SelectOption,
} from '@/components';
import { formatDate } from '@/utils/format';
import { extractApiError } from '@/services/api/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listReceiptMethods,
  createReceiptMethod,
  updateReceiptMethod,
  setReceiptMethodActive,
  type ReceiptMethod,
  type ReceiptMethodPayload,
} from './receiptMethodsApi';
import { ReceiptMethodFormModal } from './ReceiptMethodFormModal';

const PAGE_SIZE = 20;

const statusOptions: SelectOption[] = [
  { value: '', label: 'Todos os status' },
  { value: 'true', label: 'Ativos' },
  { value: 'false', label: 'Inativos' },
];

export function ReceiptMethodsPage() {
  const user = useCurrentUser();
  const isAdmin = user.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<ReceiptMethod | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<ReceiptMethod | null>(null);
  const [inactivate, setInactivate] = useState<ReceiptMethod | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const query = useMemo(
    () => ({
      search: search || undefined,
      active: statusFilter || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, statusFilter, page],
  );

  const dataQuery = useQuery({
    queryKey: ['receipt-methods', query],
    queryFn: () => listReceiptMethods(query),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['receipt-methods'] });

  const createMutation = useMutation({
    mutationFn: (data: ReceiptMethodPayload) => createReceiptMethod(data),
    onSuccess: () => {
      toast.success('Forma de recebimento criada');
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReceiptMethodPayload }) =>
      updateReceiptMethod(id, data),
    onSuccess: () => {
      toast.success('Forma de recebimento atualizada');
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const activateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => setReceiptMethodActive(id, true),
    onSuccess: () => {
      toast.success('Forma de recebimento ativada');
      setConfirmActivate(null);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const inactivateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      setReceiptMethodActive(id, false, reason),
    onSuccess: () => {
      toast.success('Forma de recebimento inativada');
      setInactivate(null);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const openCreate = () => {
    setFormMode('create');
    setSelected(null);
    setFormOpen(true);
  };

  const openEdit = (m: ReceiptMethod) => {
    setFormMode('edit');
    setSelected(m);
    setFormOpen(true);
  };

  const columns: Column<ReceiptMethod>[] = [
    {
      key: 'name',
      header: 'Nome',
      render: (m) => <span className="font-medium text-gray-900">{m.name}</span>,
    },
    { key: 'description', header: 'Descrição', render: (m) => m.description ?? '—' },
    {
      key: 'isCurrentAccountCredit',
      header: 'Crédito em conta corrente',
      render: (m) =>
        m.isCurrentAccountCredit ? (
          <StatusBadge label="Sim" variant="purple" />
        ) : (
          <StatusBadge label="Não" variant="gray" />
        ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (m) =>
        m.isActive ? (
          <StatusBadge label="Ativo" variant="green" />
        ) : (
          <StatusBadge label="Inativo" variant="gray" />
        ),
    },
    { key: 'createdAt', header: 'Criado em', render: (m) => formatDate(m.createdAt) },
  ];

  if (isAdmin) {
    columns.push({
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(m)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
            title="Editar"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => (m.isActive ? setInactivate(m) : setConfirmActivate(m))}
            className={
              m.isActive
                ? 'rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600'
                : 'rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600'
            }
            title={m.isActive ? 'Inativar' : 'Ativar'}
          >
            {m.isActive ? (
              <NoSymbolIcon className="h-4 w-4" />
            ) : (
              <CheckCircleIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Formas de recebimento</h2>
          <p className="mt-1 text-sm text-gray-500">
            Formas de baixa e recebimento usadas nas quitações
          </p>
        </div>
        {isAdmin ? (
          <button type="button" className="btn-primary" onClick={openCreate}>
            <PlusIcon className="h-5 w-5" />
            Nova forma
          </button>
        ) : null}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome ou descrição..."
      >
        <div className="w-40">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={dataQuery.data?.data ?? []}
        rowKey={(m) => m.id}
        loading={dataQuery.isLoading}
        emptyTitle="Nenhuma forma de recebimento encontrada"
        emptyDescription="Ajuste os filtros ou cadastre uma nova forma."
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: dataQuery.data?.total ?? 0,
          onPageChange: setPage,
        }}
      />

      <ReceiptMethodFormModal
        open={formOpen}
        mode={formMode}
        initial={selected}
        saving={createMutation.isPending || editMutation.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={(data) =>
          formMode === 'create'
            ? createMutation.mutate(data)
            : selected && editMutation.mutate({ id: selected.id, data })
        }
      />

      <ReasonModal
        open={!!inactivate}
        title="Inativar forma de recebimento"
        description={
          inactivate ? `Deseja inativar "${inactivate.name}"? Ela não aparecerá nos selects.` : undefined
        }
        confirmLabel="Inativar"
        tone="danger"
        loading={inactivateMutation.isPending}
        onClose={() => setInactivate(null)}
        onConfirm={(reason) =>
          inactivate && inactivateMutation.mutate({ id: inactivate.id, reason })
        }
      />

      <ConfirmDialog
        open={!!confirmActivate}
        title="Ativar forma de recebimento"
        message={`Deseja ativar "${confirmActivate?.name}"?`}
        tone="primary"
        confirmLabel="Ativar"
        loading={activateMutation.isPending}
        onClose={() => setConfirmActivate(null)}
        onConfirm={() => confirmActivate && activateMutation.mutate({ id: confirmActivate.id })}
      />
    </div>
  );
}
