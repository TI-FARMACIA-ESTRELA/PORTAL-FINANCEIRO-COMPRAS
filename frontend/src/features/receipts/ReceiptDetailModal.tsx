import { Modal, StatusBadge } from '@/components';
import { confirmationStatusBadge, financialStatusBadge } from '@/components/statusBadges';
import { formatCurrency, formatDate, formatDateTime, formatCompetence } from '@/utils/format';
import type { Receipt } from './receiptsApi';

interface ReceiptDetailModalProps {
  open: boolean;
  receipt: Receipt | null;
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

export function ReceiptDetailModal({ open, receipt, onClose }: ReceiptDetailModalProps) {
  const r = receipt;
  const conf = r ? confirmationStatusBadge[r.confirmationStatus] : null;
  const fin = r ? financialStatusBadge[r.receivable.financialStatus] : null;

  return (
    <Modal open={open} onClose={onClose} title="Detalhe do recebimento" size="lg">
      {r ? (
        <div className="space-y-5">
          <div className="rounded-lg bg-gray-50 p-3 text-sm ring-1 ring-gray-900/5">
            <p className="font-medium text-gray-900">{r.receivable.supplier.tradeName}</p>
            <p className="text-gray-600">
              {r.receivable.actionType.name} · Competência {formatCompetence(r.receivable.competenceMonth)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Data do recebimento" value={formatDate(r.receiptDate)} />
            <Field label="Forma de recebimento" value={r.receiptMethod.name} />
            <Field
              label="Destino"
              value={
                r.destinationType === 'CREDITO_CONTA_CORRENTE'
                  ? `Crédito em conta corrente${r.currentAccount ? ` · ${r.currentAccount.name}` : ''}`
                  : 'Baixa simples'
              }
            />
            <Field label="Valor recebido" value={formatCurrency(Number(r.amount))} />
            <Field label="Tipo" value={r.receiptType === 'INTEGRAL' ? 'Integral' : 'Parcial'} />
            <Field label="Valor do lançamento" value={formatCurrency(Number(r.receivable.amount))} />
            <Field label="Total recebido (lançamento)" value={formatCurrency(Number(r.receivable.totalReceived))} />
            <Field label="Saldo restante" value={formatCurrency(Number(r.receivable.openBalance))} />
            <Field label="Comprador" value={`#${r.receivable.buyer.userNumber} · ${r.receivable.buyer.name}`} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
              <div className="mt-1 flex gap-2">
                {conf ? <StatusBadge label={conf.label} variant={conf.variant} /> : null}
                {fin ? <StatusBadge label={fin.label} variant={fin.variant} /> : null}
              </div>
            </div>
            <Field label="Observações" value={r.notes ?? '—'} />
          </div>

          {r.confirmedAt ? (
            <div className="rounded-lg bg-green-50/60 p-3 ring-1 ring-green-600/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Confirmação</p>
              <p className="mt-1 text-sm text-gray-800">
                {formatDateTime(r.confirmedAt)}
                {r.confirmedBy ? ` · por #${r.confirmedBy.userNumber} ${r.confirmedBy.name}` : ''}
              </p>
            </div>
          ) : null}

          {r.destinationType === 'CREDITO_CONTA_CORRENTE' && r.currentAccount ? (
            <div className="rounded-lg bg-purple-50/60 p-3 ring-1 ring-purple-600/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Conta corrente</p>
              <p className="mt-1 text-sm text-gray-800">
                {r.currentAccount.name} · {r.currentAccount.supplier.tradeName}
              </p>
              {r.currentAccountMovementId ? (
                <p className="mt-1 text-xs text-gray-600">
                  Movimentação vinculada: {r.currentAccountMovementId.slice(0, 8)}…
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-600">
                  Entrada na conta corrente será criada após confirmação do recebimento.
                </p>
              )}
            </div>
          ) : null}

          {r.isReversed || r.confirmationStatus === 'ESTORNADO' ? (
            <div className="rounded-lg bg-red-50/60 p-3 ring-1 ring-red-600/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Estorno</p>
              <p className="mt-1 text-sm text-gray-800">
                {r.reversedAt ? formatDateTime(r.reversedAt) : '—'}
                {r.reversedBy ? ` · por #${r.reversedBy.userNumber} ${r.reversedBy.name}` : ''}
              </p>
              <p className="mt-1 text-sm text-gray-800">Motivo: {r.reverseReason ?? '—'}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
