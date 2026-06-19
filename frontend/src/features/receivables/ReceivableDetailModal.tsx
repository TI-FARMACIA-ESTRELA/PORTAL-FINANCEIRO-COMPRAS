import { Modal, StatusBadge } from '@/components';
import { financialStatusBadge, dueStatusBadge } from '@/components/statusBadges';
import { formatCurrency, formatDate, formatCompetence, formatDateTime } from '@/utils/format';
import type { Receivable } from './receivablesApi';

interface ReceivableDetailModalProps {
  open: boolean;
  receivable: Receivable | null;
  onClose: () => void;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm text-gray-900">{value}</p>
    </div>
  );
}

export function ReceivableDetailModal({ open, receivable, onClose }: ReceivableDetailModalProps) {
  const r = receivable;
  const fin = r ? financialStatusBadge[r.financialStatus] : null;
  const due = r ? dueStatusBadge[r.dueStatus] : null;

  return (
    <Modal open={open} onClose={onClose} title="Detalhe do lançamento" size="lg">
      {r ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Data da negociação" value={formatDate(r.negotiationDate)} />
            <Field label="Competência" value={formatCompetence(r.competenceMonth)} />
            <Field label="Previsão de recebimento" value={formatDate(r.expectedReceiptDate)} />
            <Field label="Comprador" value={`#${r.buyer.userNumber} · ${r.buyer.name}`} />
            <Field label="Fornecedor" value={r.supplier.tradeName} />
            <Field label="Descrição da ação" value={r.actionType.name} />
            <Field label="Valor original" value={formatCurrency(Number(r.amount))} />
            <Field label="Total recebido" value={formatCurrency(Number(r.totalReceived))} />
            <Field label="Saldo em aberto" value={formatCurrency(Number(r.openBalance))} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
              <div className="mt-1 flex gap-2">
                {fin ? <StatusBadge label={fin.label} variant={fin.variant} /> : null}
                {due ? <StatusBadge label={due.label} variant={due.variant} /> : null}
              </div>
            </div>
            <Field label="Observações" value={r.notes ?? '—'} />
          </div>

          {r.financialStatus === 'CANCELADO' ? (
            <div className="rounded-lg bg-red-50/60 p-3 ring-1 ring-red-600/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Cancelamento
              </p>
              <p className="mt-1 text-sm text-gray-800">
                {r.canceledAt ? formatDateTime(r.canceledAt) : '—'}
                {r.canceledBy ? ` · por #${r.canceledBy.userNumber} ${r.canceledBy.name}` : ''}
              </p>
              <p className="mt-1 text-sm text-gray-800">Motivo: {r.cancelReason ?? '—'}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
