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
import { formatDate, formatCnpj } from '@/utils/format';
import { extractApiError } from '@/services/api/client';
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  setSupplierActive,
  supplierTypeLabel,
  type Supplier,
  type SupplierPayload,
  type SupplierType,
} from './suppliersApi';
import { SupplierFormModal } from './SupplierFormModal';

const PAGE_SIZE = 20;

const statusOptions: SelectOption[] = [
  { value: '', label: 'Todos os status' },
  { value: 'true', label: 'Ativos' },
  { value: 'false', label: 'Inativos' },
];

const typeOptions: SelectOption[] = [
  { value: '', label: 'Todos os tipos' },
  ...(Object.keys(supplierTypeLabel) as SupplierType[]).map((t) => ({
    value: t,
    label: supplierTypeLabel[t],
  })),
];

export function SuppliersPage() {
  const canManage = true;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<Supplier | null>(null);
  const [inactivate, setInactivate] = useState<Supplier | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  const query = useMemo(
    () => ({
      search: search || undefined,
      active: statusFilter || undefined,
      supplierType: (typeFilter || undefined) as SupplierType | undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, statusFilter, typeFilter, page],
  );

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', query],
    queryFn: () => listSuppliers(query),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['suppliers'] });

  const createMutation = useMutation({
    mutationFn: (data: SupplierPayload) => createSupplier(data),
    onSuccess: () => {
      toast.success('Fornecedor criado');
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SupplierPayload }) => updateSupplier(id, data),
    onSuccess: () => {
      toast.success('Fornecedor atualizado');
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const activateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => setSupplierActive(id, true),
    onSuccess: () => {
      toast.success('Fornecedor ativado');
      setConfirmActivate(null);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const inactivateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      setSupplierActive(id, false, reason),
    onSuccess: () => {
      toast.success('Fornecedor inativado');
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

  const openEdit = (s: Supplier) => {
    setFormMode('edit');
    setSelected(s);
    setFormOpen(true);
  };

  const columns: Column<Supplier>[] = [
    {
      key: 'tradeName',
      header: 'Nome fantasia',
      render: (s) => <span className="font-medium text-gray-900">{s.tradeName}</span>,
    },
    { key: 'legalName', header: 'Razão social', render: (s) => s.legalName ?? '—' },
    { key: 'cnpj', header: 'CNPJ', render: (s) => formatCnpj(s.cnpj) },
    {
      key: 'supplierType',
      header: 'Tipo',
      render: (s) => <StatusBadge label={supplierTypeLabel[s.supplierType]} variant="blue" />,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (s) =>
        s.isActive ? (
          <StatusBadge label="Ativo" variant="green" />
        ) : (
          <StatusBadge label="Inativo" variant="gray" />
        ),
    },
    { key: 'createdAt', header: 'Criado em', render: (s) => formatDate(s.createdAt) },
  ];

  if (canManage) {
    columns.push({
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(s)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
            title="Editar"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => (s.isActive ? setInactivate(s) : setConfirmActivate(s))}
            className={
              s.isActive
                ? 'rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600'
                : 'rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600'
            }
            title={s.isActive ? 'Inativar' : 'Ativar'}
          >
            {s.isActive ? (
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
          <h2 className="text-xl font-semibold text-gray-900">Fornecedores</h2>
          <p className="mt-1 text-sm text-gray-500">
            Indústrias, laboratórios, distribuidores e fornecedores
          </p>
        </div>
        {canManage ? (
          <button type="button" className="btn-primary" onClick={openCreate}>
            <PlusIcon className="h-5 w-5" />
            Novo fornecedor
          </button>
        ) : null}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, razão social ou CNPJ..."
      >
        <div className="w-44">
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
        </div>
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
        data={suppliersQuery.data?.data ?? []}
        rowKey={(s) => s.id}
        loading={suppliersQuery.isLoading}
        emptyTitle="Nenhum fornecedor encontrado"
        emptyDescription="Ajuste os filtros ou cadastre um novo fornecedor."
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: suppliersQuery.data?.total ?? 0,
          onPageChange: setPage,
        }}
      />

      <SupplierFormModal
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
        title="Inativar fornecedor"
        description={
          inactivate ? `Deseja inativar ${inactivate.tradeName}? Ele não aparecerá nos selects.` : undefined
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
        title="Ativar fornecedor"
        message={`Deseja ativar ${confirmActivate?.tradeName}?`}
        tone="primary"
        confirmLabel="Ativar"
        loading={activateMutation.isPending}
        onClose={() => setConfirmActivate(null)}
        onConfirm={() => confirmActivate && activateMutation.mutate({ id: confirmActivate.id })}
      />
    </div>
  );
}
