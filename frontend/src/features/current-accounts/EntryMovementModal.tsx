import { useEffect, useState } from 'react';
import { Modal, Select, MoneyInput, DateInput, TextArea, LoadingSpinner, type SelectOption } from '@/components';
import type { EntryPayload } from './currentAccountsApi';

interface Props {
  open: boolean;
  saving: boolean;
  methodOptions: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (data: EntryPayload) => void;
}

export function EntryMovementModal({ open, saving, methodOptions, onClose, onSubmit }: Props) {
  const [movementDate, setMovementDate] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [receiptMethodId, setReceiptMethodId] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMovementDate(new Date().toISOString().slice(0, 10));
    setAmount('');
    setReceiptMethodId('');
    setDescription('');
    setNotes('');
    setError(null);
  }, [open]);

  const options: SelectOption[] = [
    { value: '', label: 'Selecione...' },
    ...methodOptions.map((m) => ({ value: m.id, label: m.name })),
  ];

  const handleSubmit = () => {
    setError(null);
    if (!movementDate) return setError('Informe a data da movimentação.');
    if (amount === '' || amount <= 0) return setError('Informe um valor maior que zero.');
    if (!receiptMethodId) return setError('Selecione a forma de recebimento.');
    onSubmit({
      movementDate,
      amount: Number(amount),
      receiptMethodId,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova entrada"
      description="Crédito na conta corrente (soma ao saldo)."
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" className="border-white" /> : null}
            Registrar entrada
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateInput label="Data" required value={movementDate} onChange={(e) => setMovementDate(e.target.value)} />
        <MoneyInput label="Valor" required value={amount} onValueChange={setAmount} />
        <Select
          label="Forma de recebimento"
          required
          options={options}
          value={receiptMethodId}
          onChange={(e) => setReceiptMethodId(e.target.value)}
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
          <TextArea label="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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
