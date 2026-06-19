import { useEffect, useState } from 'react';
import { Modal, LoadingSpinner, TextArea } from '@/components';
import type { AdminUser } from './usersApi';

interface ResetPasswordModalProps {
  open: boolean;
  user: AdminUser | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (password: string, reason: string) => void;
}

export function ResetPasswordModal({
  open,
  user,
  saving,
  onClose,
  onConfirm,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setReason('');
      setError(null);
    }
  }, [open]);

  const handleConfirm = () => {
    if (password.length < 6) {
      setError('A nova senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Informe um motivo com ao menos 5 caracteres.');
      return;
    }
    onConfirm(password, reason.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resetar senha"
      description={user ? `Definir nova senha para ${user.name} (#${user.userNumber})` : undefined}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={handleConfirm} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" className="border-white" /> : null}
            Salvar nova senha
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nova senha <span className="text-red-500">*</span>
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
        <TextArea
          label="Motivo"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Descreva o motivo da redefinição..."
          rows={3}
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
}
