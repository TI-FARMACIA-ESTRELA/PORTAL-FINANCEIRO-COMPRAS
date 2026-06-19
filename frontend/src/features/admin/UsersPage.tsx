import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  KeyIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  AdjustmentsHorizontalIcon,
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
import type { UserRole } from '@/types';
import { roleLabel } from '@/layouts/roleBadge';
import {
  listUsers,
  createUser,
  updateUser,
  setUserActive,
  resetUserPassword,
  changeUserRole,
  type AdminUser,
} from './usersApi';
import {
  UserFormModal,
  type CreateFormData,
  type EditFormData,
} from './UserFormModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { ChangeRoleModal } from './ChangeRoleModal';

const roleVariant: Record<UserRole, 'red' | 'blue' | 'green'> = {
  ADMIN: 'red',
  COMPRADOR: 'blue',
  DIRETORIA: 'green',
};

const roleFilterOptions: SelectOption[] = [
  { value: '', label: 'Todos os perfis' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'COMPRADOR', label: 'Comprador' },
  { value: 'DIRETORIA', label: 'Diretoria' },
];

const statusFilterOptions: SelectOption[] = [
  { value: '', label: 'Todos os status' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
];

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<AdminUser | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<AdminUser | null>(null);
  const [inactivateUser, setInactivateUser] = useState<AdminUser | null>(null);

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: listUsers });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success('Usuário criado com sucesso');
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditFormData }) =>
      updateUser(id, { name: data.name, email: data.email }),
    onSuccess: () => {
      toast.success('Usuário atualizado');
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const activateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => setUserActive(id, true),
    onSuccess: () => {
      toast.success('Usuário ativado');
      setConfirmActivate(null);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const inactivateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      setUserActive(id, false, reason),
    onSuccess: () => {
      toast.success('Usuário inativado');
      setInactivateUser(null);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password, reason }: { id: string; password: string; reason: string }) =>
      resetUserPassword(id, password, reason),
    onSuccess: () => {
      toast.success('Senha redefinida');
      setResetOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role, reason }: { id: string; role: UserRole; reason: string }) =>
      changeUserRole(id, role, reason),
    onSuccess: () => {
      toast.success('Perfil alterado');
      setRoleUser(null);
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const filtered = useMemo(() => {
    const items = usersQuery.data ?? [];
    return items.filter((u) => {
      const matchesSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        String(u.userNumber).includes(search) ||
        (u.email ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'active' && u.isActive) ||
        (statusFilter === 'inactive' && !u.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [usersQuery.data, search, roleFilter, statusFilter]);

  const openCreate = () => {
    setFormMode('create');
    setSelectedUser(null);
    setFormOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setFormMode('edit');
    setSelectedUser(user);
    setFormOpen(true);
  };

  const openReset = (user: AdminUser) => {
    setSelectedUser(user);
    setResetOpen(true);
  };

  const columns: Column<AdminUser>[] = [
    { key: 'userNumber', header: 'Número', render: (u) => u.userNumber },
    {
      key: 'name',
      header: 'Nome',
      render: (u) => <span className="font-medium text-gray-900">{u.name}</span>,
    },
    { key: 'email', header: 'E-mail', render: (u) => u.email ?? '—' },
    {
      key: 'role',
      header: 'Perfil',
      render: (u) => <StatusBadge label={roleLabel[u.role]} variant={roleVariant[u.role]} />,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (u) =>
        u.isActive ? (
          <StatusBadge label="Ativo" variant="green" />
        ) : (
          <StatusBadge label="Inativo" variant="gray" />
        ),
    },
    {
      key: 'lastLoginAt',
      header: 'Último login',
      render: (u) => (u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(u)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
            title="Editar"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setRoleUser(u)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple-600"
            title="Alterar perfil"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openReset(u)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-amber-600"
            title="Resetar senha"
          >
            <KeyIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => (u.isActive ? setInactivateUser(u) : setConfirmActivate(u))}
            className={
              u.isActive
                ? 'rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600'
                : 'rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600'
            }
            title={u.isActive ? 'Inativar' : 'Ativar'}
          >
            {u.isActive ? (
              <NoSymbolIcon className="h-4 w-4" />
            ) : (
              <CheckCircleIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Usuários</h2>
          <p className="mt-1 text-sm text-gray-500">
            Administração de usuários, perfis e permissões
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>
          <PlusIcon className="h-5 w-5" />
          Novo usuário
        </button>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, número ou e-mail..."
      >
        <div className="w-44">
          <Select
            options={roleFilterOptions}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(u) => u.id}
        loading={usersQuery.isLoading}
        emptyTitle="Nenhum usuário encontrado"
        emptyDescription="Ajuste os filtros ou cadastre um novo usuário."
      />

      <UserFormModal
        open={formOpen}
        mode={formMode}
        initial={selectedUser}
        saving={createMutation.isPending || editMutation.isPending}
        onClose={() => setFormOpen(false)}
        onCreate={(data: CreateFormData) => createMutation.mutate(data)}
        onEdit={(data: EditFormData) =>
          selectedUser && editMutation.mutate({ id: selectedUser.id, data })
        }
      />

      <ResetPasswordModal
        open={resetOpen}
        user={selectedUser}
        saving={resetMutation.isPending}
        onClose={() => setResetOpen(false)}
        onConfirm={(password, reason) =>
          selectedUser && resetMutation.mutate({ id: selectedUser.id, password, reason })
        }
      />

      <ChangeRoleModal
        open={!!roleUser}
        user={roleUser}
        saving={roleMutation.isPending}
        onClose={() => setRoleUser(null)}
        onConfirm={(role, reason) =>
          roleUser && roleMutation.mutate({ id: roleUser.id, role, reason })
        }
      />

      <ReasonModal
        open={!!inactivateUser}
        title="Inativar usuário"
        description={
          inactivateUser
            ? `Deseja inativar ${inactivateUser.name}? O usuário não poderá mais fazer login.`
            : undefined
        }
        confirmLabel="Inativar"
        tone="danger"
        loading={inactivateMutation.isPending}
        onClose={() => setInactivateUser(null)}
        onConfirm={(reason) =>
          inactivateUser && inactivateMutation.mutate({ id: inactivateUser.id, reason })
        }
      />

      <ConfirmDialog
        open={!!confirmActivate}
        title="Ativar usuário"
        message={`Deseja ativar ${confirmActivate?.name}? O usuário poderá fazer login novamente.`}
        tone="primary"
        confirmLabel="Ativar"
        loading={activateMutation.isPending}
        onClose={() => setConfirmActivate(null)}
        onConfirm={() =>
          confirmActivate && activateMutation.mutate({ id: confirmActivate.id })
        }
      />
    </div>
  );
}
