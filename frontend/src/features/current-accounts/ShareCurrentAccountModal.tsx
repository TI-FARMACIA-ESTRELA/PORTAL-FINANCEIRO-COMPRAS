import { useEffect, useState } from 'react';
import { Modal, Select, LoadingSpinner, type SelectOption } from '@/components';
import type { CurrentAccount, SharePayload, UserOption } from './currentAccountsApi';

interface Props {
  open: boolean;
  account: CurrentAccount | null;
  saving: boolean;
  userOptions: UserOption[];
  onClose: () => void;
  onSubmit: (data: SharePayload) => void;
}

export function ShareCurrentAccountModal({ open, account, saving, userOptions, onClose, onSubmit }: Props) {
  const [userId, setUserId] = useState('');
  const [canView, setCanView] = useState(true);
  const [canMove, setCanMove] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUserId('');
    setCanView(true);
    setCanMove(false);
    setCanEdit(false);
    setError(null);
  }, [open]);

  const candidates: SelectOption[] = [
    { value: '', label: 'Selecione um usuário...' },
    ...userOptions
      .filter((u) => u.id !== account?.owner.id)
      .map((u) => ({ value: u.id, label: `#${u.userNumber} ${u.name} (${u.role})` })),
  ];

  const handleSubmit = () => {
    setError(null);
    if (!userId) return setError('Selecione o usuário para compartilhar.');
    onSubmit({ userId, canView, canMove, canEdit });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compartilhar conta corrente"
      description={account ? `Conta: ${account.name}` : undefined}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Fechar
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" className="border-white" /> : null}
            Compartilhar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Usuário"
          required
          options={candidates}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <input type="checkbox" checked={canView} onChange={(e) => setCanView(e.target.checked)} />
            Visualizar
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <input type="checkbox" checked={canMove} onChange={(e) => setCanMove(e.target.checked)} />
            Movimentar
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} />
            Editar
          </label>
        </div>

        {error ? (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-600/10">
            {error}
          </div>
        ) : null}

        {account && account.shares.length > 0 ? (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">Usuários com acesso</h4>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              {account.shares.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-gray-800">
                    #{s.user.userNumber} {s.user.name}
                  </span>
                  <span className="flex gap-1 text-xs text-gray-500">
                    {s.canView ? <span className="rounded bg-gray-100 px-1.5 py-0.5">ver</span> : null}
                    {s.canMove ? <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">mover</span> : null}
                    {s.canEdit ? <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">editar</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
