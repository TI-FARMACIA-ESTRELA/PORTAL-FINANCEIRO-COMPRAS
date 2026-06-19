import type { ReactNode } from 'react';
import { Modal, StatusBadge } from '@/components';
import { formatCurrency, formatDate, formatDateTime, formatCompetence } from '@/utils/format';
import type { CurrentAccountMovement } from './currentAccountsApi';
import { movementTypeBadge } from './currentAccountsUi';

interface Props {
  open: boolean;
  movement: CurrentAccountMovement | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function MovementDetailModal({ open, movement, onClose }: Props) {
  if (!movement) return <Modal open={open} onClose={onClose} title="Movimentação" size="md">{null}</Modal>;
  const badge = movementTypeBadge[movement.type];

  return (
    <Modal open={open} onClose={onClose} title="Detalhe da movimentação" size="md">
      <div className="divide-y divide-gray-100">
        <Row label="Tipo" value={<StatusBadge label={badge.label} variant={badge.variant} />} />
        <Row label="Data" value={formatDate(movement.movementDate)} />
        <Row
          label="Valor"
          value={`${movement.sign} ${formatCurrency(Number(movement.amount))}`}
        />
        {movement.balanceAfter != null ? (
          <Row label="Saldo após" value={formatCurrency(Number(movement.balanceAfter))} />
        ) : null}
        {movement.receiptMethod ? <Row label="Forma de recebimento" value={movement.receiptMethod.name} /> : null}
        {movement.actionType ? <Row label="Descrição de ação" value={movement.actionType.name} /> : null}
        {movement.description ? <Row label="Descrição" value={movement.description} /> : null}
        {movement.origin === 'RECEIPT' ? (
          <>
            <Row label="Origem" value="Recebimento" />
            {movement.receivableLink ? (
              <>
                <Row label="Fornecedor" value={movement.receivableLink.supplier.tradeName} />
                <Row
                  label="Lançamento"
                  value={`Comp. ${formatCompetence(movement.receivableLink.competenceMonth)} · ${movement.receivableLink.actionType.name}`}
                />
              </>
            ) : null}
            {movement.receiptLink ? (
              <Row
                label="Recebimento"
                value={`${formatDate(movement.receiptLink.receiptDate)} · ${formatCurrency(Number(movement.receiptLink.amount))}`}
              />
            ) : null}
          </>
        ) : null}
        {movement.notes ? <Row label="Observação" value={movement.notes} /> : null}
        <Row label="Criado por" value={`#${movement.createdBy.userNumber} ${movement.createdBy.name}`} />
        <Row label="Criado em" value={formatDateTime(movement.createdAt)} />
        {movement.isReversed ? (
          <>
            <Row label="Estornado" value={<StatusBadge label="Sim" variant="amber" />} />
            {movement.reversedAt ? <Row label="Estornado em" value={formatDateTime(movement.reversedAt)} /> : null}
            {movement.reversedBy ? (
              <Row label="Estornado por" value={`#${movement.reversedBy.userNumber} ${movement.reversedBy.name}`} />
            ) : null}
            {movement.reverseReason ? <Row label="Motivo do estorno" value={movement.reverseReason} /> : null}
          </>
        ) : null}
        {movement.reversalOfMovementId ? (
          <Row label="Estorno de" value={<StatusBadge label="Movimento estornado" variant="amber" />} />
        ) : null}
      </div>
    </Modal>
  );
}
