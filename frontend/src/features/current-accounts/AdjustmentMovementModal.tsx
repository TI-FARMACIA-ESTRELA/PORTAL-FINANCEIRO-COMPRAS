import { useEffect, useState } from 'react';
import { Modal, Select, MoneyInput, DateInput, TextArea, LoadingSpinner, type SelectOption } from '@/components';
import type { AdjustmentPayload } from './currentAccountsApi';

interface Props {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: AdjustmentPayload) => void;
}

const directionOptions: SelectOption[] = [
  { value: 'POSITIVO', label: 'Ajuste positivo (soma)' },
  { value: 'NEGATIVO', label: 'Ajuste negativo (subtrai)' },
];

export function AdjustmentMovementModal({ open, saving, onClose, onSubmit }: Props) {
  const [movementDate, setMovementDate] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [direction, setDirection] = useState<'POSITIVO' | 'NEGATIVO'>('POSITIVO');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMovementDate(new Date().toISOString().slice(0, 10));
    setAmount('');
    setDirection('POSITIVO');
    setReason('');
    setDescription('');
    setError(null);
  }, [open]);

  const handleSubmit = () => {
    setError(null);
    if (!movementDate) return setError('Informe a data da movimentação.');
    if (amount === '' || amount <= 0) return setError('Informe um valor maior que zero.');
    if (reason.trim().length < 5) return setError('Informe um motivo com pelo menos 5 caracteres.');
    onSubmit({
      movementDate,
      amount: Number(amount),
      direction,
      reason: reason.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajuste de saldo"
      description="Disponível apenas para administradores. Exige motivo."
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" className="border-white" /> : null}
            Registrar ajuste
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateInput label="Data" required value={movementDate} onChange={(e) => setMovementDate(e.target.value)} />
        <MoneyInput label="Valor" required value={amount} onValueChange={setAmount} />
        <Select
          label="Tipo de ajuste"
          required
          options={directionOptions}
          value={direction}
          onChange={(e) => setDirection(e.target.value as 'POSITIVO' | 'NEGATIVO')}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Descrição (opcional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-base"
          />
        </div>
        <div className="sm:col-span-2">
          <TextArea
            label="Motivo do ajuste"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Descreva o motivo do ajuste manual..."
          />
        </div>
        {error ? (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-600/10 sm:col-span-2">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
