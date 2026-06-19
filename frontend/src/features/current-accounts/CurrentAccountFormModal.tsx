import { useEffect, useState } from 'react';
import { Modal, Select, TextArea, LoadingSpinner, type SelectOption } from '@/components';
import type { ActiveOption } from '@/features/receivables/receivablesApi';
import type {
  CreateAccountPayload,
  CurrentAccount,
  UpdateAccountPayload,
  UserOption,
} from './currentAccountsApi';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: CurrentAccount | null;
  saving: boolean;
  isAdmin: boolean;
  supplierOptions: ActiveOption[];
  userOptions: UserOption[];
  onClose: () => void;
  onCreate: (data: CreateAccountPayload) => void;
  onUpdate: (data: UpdateAccountPayload) => void;
}

function toOptions(items: { value: string; label: string }[], placeholder: string): SelectOption[] {
  return [{ value: '', label: placeholder }, ...items];
}

export function CurrentAccountFormModal({
  open,
  mode,
  initial,
  saving,
  isAdmin,
  supplierOptions,
  userOptions,
  onClose,
  onCreate,
  onUpdate,
}: Props) {
  const [name, setName] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === 'edit' && initial) {
      setName(initial.name);
      setSupplierId(initial.supplier.id);
      setOwnerUserId(initial.owner.id);
      setNotes(initial.notes ?? '');
    } else {
      setName('');
      setSupplierId('');
      setOwnerUserId('');
      setNotes('');
    }
  }, [open, mode, initial]);

  const buyerOptions = userOptions
    .filter((u) => u.role === 'COMPRADOR' || u.role === 'ADMIN')
    .map((u) => ({ value: u.id, label: `#${u.userNumber} ${u.name}` }));

  const handleSubmit = () => {
    setError(null);
    if (name.trim().length < 2) return setError('Informe o nome da conta (mínimo 2 caracteres).');
    if (mode === 'create') {
      if (!supplierId) return setError('Selecione o fornecedor/indústria.');
      onCreate({
        supplierId,
        name: name.trim(),
        ownerUserId: isAdmin && ownerUserId ? ownerUserId : undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      onUpdate({
        name: name.trim(),
        notes: notes.trim() || undefined,
        ownerUserId: isAdmin && ownerUserId ? ownerUserId : undefined,
      });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Nova conta corrente' : 'Editar conta corrente'}
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
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nome da conta <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base"
            placeholder="Ex.: Verba comercial — Indústria X"
          />
        </div>
        <Select
          label="Fornecedor/indústria"
          required
          disabled={mode === 'edit'}
          options={toOptions(
            supplierOptions.map((s) => ({ value: s.id, label: s.label })),
            'Selecione...',
          )}
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          hint={mode === 'edit' ? 'O fornecedor não pode ser alterado.' : undefined}
        />
        {isAdmin ? (
          <Select
            label="Comprador responsável"
            options={toOptions(buyerOptions, 'Usar meu usuário')}
            value={ownerUserId}
            onChange={(e) => setOwnerUserId(e.target.value)}
          />
        ) : null}
        <div className="sm:col-span-2">
          <TextArea
            label="Observações (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
