import { useEffect, useState } from 'react';
import { Modal, TextArea, LoadingSpinner } from '@/components';
import type { ActionType, ActionTypePayload } from './actionTypesApi';

interface ActionTypeFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: ActionType | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: ActionTypePayload) => void;
}

export function ActionTypeFormModal({
  open,
  mode,
  initial,
  saving,
  onClose,
  onSubmit,
}: ActionTypeFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === 'edit' && initial) {
      setName(initial.name);
      setDescription(initial.description ?? '');
    } else {
      setName('');
      setDescription('');
    }
  }, [open, mode, initial]);

  const handleSubmit = () => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Informe um nome com ao menos 2 caracteres.');
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim() || undefined });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Nova descrição de ação' : 'Editar descrição de ação'}
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
            placeholder="Ex.: Campanha comercial"
          />
        </div>
        <TextArea
          label="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhe quando usar esta descrição de ação..."
          rows={3}
        />
        {error ? (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-600/10">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
