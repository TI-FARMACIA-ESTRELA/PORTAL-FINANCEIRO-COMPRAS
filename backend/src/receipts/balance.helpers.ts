import { ConfirmationStatus, FinancialStatus, Prisma } from '@prisma/client';

/**
 * Soma o valor dos recebimentos que contam para o saldo do lançamento.
 * Apenas CONFIRMADO entra no saldo (PENDENTE/ESTORNADO/CANCELADO ficam de fora).
 */
export function sumConfirmedReceipts(
  receipts: { amount: Prisma.Decimal; confirmationStatus: ConfirmationStatus }[],
): Prisma.Decimal {
  return receipts.reduce(
    (acc, r) =>
      r.confirmationStatus === ConfirmationStatus.CONFIRMADO ? acc.plus(r.amount) : acc,
    new Prisma.Decimal(0),
  );
}

/** Saldo em aberto = valor - recebido. Nunca negativo. */
export function openBalanceOf(amount: Prisma.Decimal, totalReceived: Prisma.Decimal): Prisma.Decimal {
  const open = amount.minus(totalReceived);
  return open.isNegative() ? new Prisma.Decimal(0) : open;
}

/**
 * Determina o status financeiro do lançamento a partir do total recebido.
 * Lançamento cancelado mantém CANCELADO (não é recalculado).
 */
export function determineFinancialStatus(
  amount: Prisma.Decimal,
  totalReceived: Prisma.Decimal,
  isCanceled: boolean,
): FinancialStatus {
  if (isCanceled) return FinancialStatus.CANCELADO;
  if (totalReceived.greaterThanOrEqualTo(amount)) return FinancialStatus.QUITADO;
  if (totalReceived.greaterThan(0)) return FinancialStatus.PARCIAL;
  return FinancialStatus.ABERTO;
}
