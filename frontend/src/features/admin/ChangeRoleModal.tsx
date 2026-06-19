import { useEffect, useState } from 'react';
import { Modal, Select, TextArea, LoadingSpinner, type SelectOption } from '@/components';
import type { UserRole } from '@/types';
import type { AdminUser } from './usersApi';

const roleOptions: SelectOption[] = [
  { value: 'COMPRADOR', label: 'Comprador' },
  { value: 'DIRETORIA', label: 'Diretoria' },
  { value: 'ADMIN', label: 'Administrador' },
];

interface ChangeRoleModalProps {
  open: boolean;
  user: AdminUser | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (role: UserRole, reason: string) => void;
}

export function ChangeRoleModal({ open, user, saving, onClose, onConfirm }: ChangeRoleModalProps) {
  const [role, setRole] = useState<UserRole>('COMPRADOR');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      setRole(user.role);
      setReason('');
      setError(null);
    }
  }, [open, user]);

  const handleConfirm = () => {
    if (user && role === user.role) {
      setError('Selecione um perfil diferente do atual.');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Informe um motivo com ao menos 5 caracteres.');
      return;
    }
    onConfirm(role, reason.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Alterar perfil"
      description={user ? `Alterar a hierarquia de ${user.name} (#${user.userNumber})` : undefined}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={handleConfirm} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" className="border-white" /> : null}
            Alterar perfil
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Novo perfil"
          required
          options={roleOptions}
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
        />
        <TextArea
          label="Motivo"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Descreva o motivo da alteração de hierarquia..."
          rows={3}
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
}
