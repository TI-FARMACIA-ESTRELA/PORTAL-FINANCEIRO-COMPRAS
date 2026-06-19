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
  listActionTypes,
  createActionType,
  updateActionType,
  setActionTypeActive,
  type ActionType,
  type ActionTypePayload,
} from './actionTypesApi';
import { ActionTypeFormModal } from './ActionTypeFormModal';

const PAGE_SIZE = 20;

const statusOptions: SelectOption[] = [
  { value: '', label: 'Todos os status' },
  { value: 'true', label: 'Ativos' },
  { value: 'false', label: 'Inativos' },
];

export function ActionTypesPage() {
  const user = useCurrentUser();
  const isAdmin = user.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<ActionType | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<ActionType | null>(null);
  const [inactivate, setInactivate] = useState<ActionType | null>(null);

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
    queryKey: ['action-types', query],
    queryFn: () => listActionTypes(query),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['action-types'] });

  const createMutation = useMutation({
    mutationFn: (data: ActionTypePayload) => createActionType(data),
    onSuccess: () => {
      toast.success('Descrição de ação criada');
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActionTypePayload }) =>
      updateActionType(id, data),
    onSuccess: () => {
      toast.success('Descrição de ação atualizada');
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const activateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => setActionTypeActive(id, true),
    onSuccess: () => {
      toast.success('Descrição de ação ativada');
      setConfirmActivate(null);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const inactivateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      setActionTypeActive(id, false, reason),
    onSuccess: () => {
      toast.success('Descrição de ação inativada');
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

  const openEdit = (a: ActionType) => {
    setFormMode('edit');
    setSelected(a);
    setFormOpen(true);
  };

  const columns: Column<ActionType>[] = [
    {
      key: 'name',
      header: 'Nome',
      render: (a) => <span className="font-medium text-gray-900">{a.name}</span>,
    },
    { key: 'description', header: 'Descrição', render: (a) => a.description ?? '—' },
    {
      key: 'isActive',
      header: 'Status',
      render: (a) =>
        a.isActive ? (
          <StatusBadge label="Ativo" variant="green" />
        ) : (
          <StatusBadge label="Inativo" variant="gray" />
        ),
    },
    { key: 'createdAt', header: 'Criado em', render: (a) => formatDate(a.createdAt) },
  ];

  if (isAdmin) {
    columns.push({
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (a) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(a)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
            title="Editar"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => (a.isActive ? setInactivate(a) : setConfirmActivate(a))}
            className={
              a.isActive
                ? 'rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600'
                : 'rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600'
            }
            title={a.isActive ? 'Inativar' : 'Ativar'}
          >
            {a.isActive ? (
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
          <h2 className="text-xl font-semibold text-gray-900">Descrições de ação</h2>
          <p className="mt-1 text-sm text-gray-500">
            Motivos comerciais usados nos lançamentos financeiros
          </p>
        </div>
        {isAdmin ? (
          <button type="button" className="btn-primary" onClick={openCreate}>
            <PlusIcon className="h-5 w-5" />
            Nova descrição
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
        rowKey={(a) => a.id}
        loading={dataQuery.isLoading}
        emptyTitle="Nenhuma descrição de ação encontrada"
        emptyDescription="Ajuste os filtros ou cadastre uma nova descrição."
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: dataQuery.data?.total ?? 0,
          onPageChange: setPage,
        }}
      />

      <ActionTypeFormModal
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
        title="Inativar descrição de ação"
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
        title="Ativar descrição de ação"
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
