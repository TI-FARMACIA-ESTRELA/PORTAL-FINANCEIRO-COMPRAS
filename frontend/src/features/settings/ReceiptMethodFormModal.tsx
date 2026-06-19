import { useEffect, useState } from 'react';
import { Modal, TextArea, LoadingSpinner } from '@/components';
import type { ReceiptMethod, ReceiptMethodPayload } from './receiptMethodsApi';

interface ReceiptMethodFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: ReceiptMethod | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: ReceiptMethodPayload) => void;
}

export function ReceiptMethodFormModal({
  open,
  mode,
  initial,
  saving,
  onClose,
  onSubmit,
}: ReceiptMethodFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCurrentAccountCredit, setIsCurrentAccountCredit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === 'edit' && initial) {
      setName(initial.name);
      setDescription(initial.description ?? '');
      setIsCurrentAccountCredit(initial.isCurrentAccountCredit);
    } else {
      setName('');
      setDescription('');
      setIsCurrentAccountCredit(false);
    }
  }, [open, mode, initial]);

  const handleSubmit = () => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Informe um nome com ao menos 2 caracteres.');
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      isCurrentAccountCredit,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Nova forma de recebimento' : 'Editar forma de recebimento'}
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
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base"
            placeholder="Ex.: PIX CNPJ"
          />
        </div>
        <TextArea
          label="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhe quando usar esta forma de recebimento..."
          rows={3}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isCurrentAccountCredit}
            onChange={(e) => setIsCurrentAccountCredit(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Gera crédito em conta corrente
        </label>
        {error ? (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-600/10">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
