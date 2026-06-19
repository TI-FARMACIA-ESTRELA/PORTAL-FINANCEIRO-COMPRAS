import { useEffect, useState } from 'react';
import {
  Modal,
  Select,
  TextArea,
  DateInput,
  MoneyInput,
  LoadingSpinner,
  type SelectOption,
} from '@/components';
import type { ActiveOption, Receivable, ReceivablePayload } from './receivablesApi';

interface ReceivableFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Receivable | null;
  saving: boolean;
  supplierOptions: ActiveOption[];
  actionTypeOptions: ActiveOption[];
  onClose: () => void;
  onSubmit: (data: ReceivablePayload) => void;
}

function toOptions(items: ActiveOption[], placeholder: string): SelectOption[] {
  return [{ value: '', label: placeholder }, ...items.map((i) => ({ value: i.id, label: i.label }))];
}

export function ReceivableFormModal({
  open,
  mode,
  initial,
  saving,
  supplierOptions,
  actionTypeOptions,
  onClose,
  onSubmit,
}: ReceivableFormModalProps) {
  const [negotiationDate, setNegotiationDate] = useState('');
  const [competenceMonth, setCompetenceMonth] = useState('');
  const [expectedReceiptDate, setExpectedReceiptDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [actionTypeId, setActionTypeId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === 'edit' && initial) {
      setNegotiationDate(initial.negotiationDate);
      setCompetenceMonth(initial.competenceMonth);
      setExpectedReceiptDate(initial.expectedReceiptDate);
      setSupplierId(initial.supplier.id);
      setActionTypeId(initial.actionType.id);
      setAmount(Number(initial.amount));
      setNotes(initial.notes ?? '');
    } else {
      setNegotiationDate('');
      setCompetenceMonth('');
      setExpectedReceiptDate('');
      setSupplierId('');
      setActionTypeId('');
      setAmount('');
      setNotes('');
    }
  }, [open, mode, initial]);

  const handleSubmit = () => {
    setError(null);
    if (!negotiationDate) return setError('Informe a data da negociação.');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competenceMonth))
      return setError('Informe a competência (mês/ano).');
    if (!expectedReceiptDate) return setError('Informe a data prevista de recebimento.');
    if (!supplierId) return setError('Selecione o fornecedor.');
    if (!actionTypeId) return setError('Selecione a descrição da ação.');
    if (amount === '' || amount <= 0) return setError('Informe um valor maior que zero.');

    onSubmit({
      negotiationDate,
      competenceMonth,
      expectedReceiptDate,
      supplierId,
      actionTypeId,
      amount: Number(amount),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Novo lançamento' : 'Editar lançamento'}
      size="lg"
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateInput
          label="Data da negociação"
          required
          value={negotiationDate}
          onChange={(e) => setNegotiationDate(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Competência <span className="text-red-500">*</span>
          </label>
          <input
            type="month"
            value={competenceMonth}
            onChange={(e) => setCompetenceMonth(e.target.value)}
            className="input-base"
          />
        </div>
        <DateInput
          label="Previsão de recebimento"
          required
          value={expectedReceiptDate}
          onChange={(e) => setExpectedReceiptDate(e.target.value)}
        />
        <MoneyInput
          label="Valor do investimento"
          required
          value={amount}
          onValueChange={setAmount}
        />
        <Select
          label="Fornecedor"
          required
          options={toOptions(supplierOptions, 'Selecione...')}
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        />
        <Select
          label="Descrição da ação"
          required
          options={toOptions(actionTypeOptions, 'Selecione...')}
          value={actionTypeId}
          onChange={(e) => setActionTypeId(e.target.value)}
        />
        <div className="sm:col-span-2">
          <TextArea
            label="Observações (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalhes da negociação..."
            rows={3}
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
