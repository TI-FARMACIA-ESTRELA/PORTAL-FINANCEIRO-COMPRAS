import { useEffect, useState } from 'react';
import { Modal, Select, LoadingSpinner, type SelectOption } from '@/components';
import type { UserRole } from '@/types';
import { roleLabel } from '@/layouts/roleBadge';
import type { AdminUser } from './usersApi';

const roleOptions: SelectOption[] = [
  { value: 'COMPRADOR', label: 'Comprador' },
  { value: 'DIRETORIA', label: 'Diretoria' },
  { value: 'ADMIN', label: 'Administrador' },
];

export interface CreateFormData {
  userNumber: number;
  name: string;
  email?: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}

export interface EditFormData {
  name: string;
  email?: string;
}

interface UserFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: AdminUser | null;
  saving: boolean;
  onClose: () => void;
  onCreate: (data: CreateFormData) => void;
  onEdit: (data: EditFormData) => void;
}

export function UserFormModal({
  open,
  mode,
  initial,
  saving,
  onClose,
  onCreate,
  onEdit,
}: UserFormModalProps) {
  const [userNumber, setUserNumber] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('COMPRADOR');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === 'edit' && initial) {
      setUserNumber(String(initial.userNumber));
      setName(initial.name);
      setEmail(initial.email ?? '');
      setRole(initial.role);
      setIsActive(initial.isActive);
      setPassword('');
    } else {
      setUserNumber('');
      setName('');
      setEmail('');
      setPassword('');
      setRole('COMPRADOR');
      setIsActive(true);
    }
  }, [open, mode, initial]);

  const handleSubmit = () => {
    setError(null);
    if (!name.trim() || name.trim().length < 2) {
      setError('Informe um nome com ao menos 2 caracteres.');
      return;
    }

    if (mode === 'create') {
      const parsedNumber = Number(userNumber);
      if (!Number.isInteger(parsedNumber) || parsedNumber <= 0) {
        setError('Informe um número de usuário válido.');
        return;
      }
      if (password.length < 6) {
        setError('A senha inicial deve ter ao menos 6 caracteres.');
        return;
      }
      onCreate({
        userNumber: parsedNumber,
        name: name.trim(),
        email: email.trim() || undefined,
        password,
        role,
        isActive,
      });
    } else {
      onEdit({
        name: name.trim(),
        email: email.trim() || undefined,
      });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Novo usuário' : 'Editar usuário'}
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" className="border-white" /> : null}
            Salvar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Número de usuário {mode === 'create' ? <span className="text-red-500">*</span> : null}
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={userNumber}
            onChange={(e) => setUserNumber(e.target.value)}
            className="input-base"
            disabled={mode === 'edit'}
            placeholder="Ex.: 2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base"
            placeholder="Nome completo"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">E-mail (opcional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-base"
            placeholder="email@exemplo.com"
          />
        </div>

        {mode === 'create' ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Senha inicial <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base"
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>
        ) : null}

        {mode === 'create' ? (
          <Select
            label="Perfil"
            required
            options={roleOptions}
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          />
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Perfil</label>
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
              {roleLabel[role]}{' '}
              <span className="text-gray-400">
                — use "Alterar perfil" para mudar a hierarquia (exige motivo).
              </span>
            </p>
          </div>
        )}

        {mode === 'create' ? (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Usuário ativo
          </label>
        ) : null}

        {error ? (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-600/10">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
