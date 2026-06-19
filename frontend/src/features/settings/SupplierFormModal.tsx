import { useEffect, useState } from 'react';
import { Modal, Select, TextArea, LoadingSpinner, type SelectOption } from '@/components';
import {
  supplierTypeLabel,
  type Supplier,
  type SupplierPayload,
  type SupplierType,
} from './suppliersApi';

const typeOptions: SelectOption[] = (Object.keys(supplierTypeLabel) as SupplierType[]).map((t) => ({
  value: t,
  label: supplierTypeLabel[t],
}));

interface SupplierFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Supplier | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: SupplierPayload) => void;
}

export function SupplierFormModal({
  open,
  mode,
  initial,
  saving,
  onClose,
  onSubmit,
}: SupplierFormModalProps) {
  const [tradeName, setTradeName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [supplierType, setSupplierType] = useState<SupplierType>('FORNECEDOR');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === 'edit' && initial) {
      setTradeName(initial.tradeName);
      setLegalName(initial.legalName ?? '');
      setCnpj(initial.cnpj ?? '');
      setSupplierType(initial.supplierType);
      setNotes(initial.notes ?? '');
    } else {
      setTradeName('');
      setLegalName('');
      setCnpj('');
      setSupplierType('FORNECEDOR');
      setNotes('');
    }
  }, [open, mode, initial]);

  const handleSubmit = () => {
    setError(null);
    if (tradeName.trim().length < 2) {
      setError('Informe um nome fantasia com ao menos 2 caracteres.');
      return;
    }
    const digits = cnpj.replace(/\D/g, '');
    if (digits && digits.length !== 14) {
      setError('O CNPJ deve ter 14 dígitos quando informado.');
      return;
    }
    onSubmit({
      tradeName: tradeName.trim(),
      legalName: legalName.trim() || undefined,
      cnpj: digits || undefined,
      supplierType,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Novo fornecedor' : 'Editar fornecedor'}
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
            Nome fantasia <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
            className="input-base"
            placeholder="Ex.: Laboratório Estrela"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Razão social (opcional)
          </label>
          <input
            type="text"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            className="input-base"
            placeholder="Ex.: Estrela Indústria Farmacêutica S.A."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">CNPJ (opcional)</label>
          <input
            type="text"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            className="input-base"
            placeholder="00.000.000/0000-00"
          />
        </div>

        <Select
          label="Tipo"
          required
          options={typeOptions}
          value={supplierType}
          onChange={(e) => setSupplierType(e.target.value as SupplierType)}
        />

        <TextArea
          label="Observação (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anotações internas sobre o fornecedor..."
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
