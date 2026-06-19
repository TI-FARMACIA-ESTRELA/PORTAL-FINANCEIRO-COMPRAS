import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Modal } from './Modal';
import { LoadingSpinner } from './LoadingSpinner';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" className="border-white" /> : null}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        <span
          className={
            tone === 'danger'
              ? 'flex h-10 w-10 flex-none items-center justify-center rounded-full bg-red-100 text-red-600'
              : 'flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary-100 text-primary-600'
          }
        >
          <ExclamationTriangleIcon className="h-6 w-6" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
