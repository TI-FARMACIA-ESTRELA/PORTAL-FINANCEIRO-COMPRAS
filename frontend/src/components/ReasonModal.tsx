import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { TextArea } from './TextArea';
import { LoadingSpinner } from './LoadingSpinner';

interface ReasonModalProps {
  open: boolean;
  title: string;
  description?: string;
  label?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  minLength?: number;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/**
 * Modal de motivo obrigatório, usado em cancelamentos, estornos e edições sensíveis.
 */
export function ReasonModal({
  open,
  title,
  description,
  label = 'Motivo',
  confirmLabel = 'Confirmar',
  tone = 'danger',
  loading = false,
  minLength = 5,
  onConfirm,
  onClose,
}: ReasonModalProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  const error =
    touched && reason.trim().length < minLength
      ? `Informe um motivo com pelo menos ${minLength} caracteres.`
      : undefined;

  const handleConfirm = () => {
    setTouched(true);
    if (reason.trim().length < minLength) return;
    onConfirm(reason.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" className="border-white" /> : null}
            {confirmLabel}
          </button>
        </>
      }
    >
      <TextArea
        label={label}
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onBlur={() => setTouched(true)}
        error={error}
        placeholder="Descreva o motivo desta ação..."
        rows={4}
      />
    </Modal>
  );
}
