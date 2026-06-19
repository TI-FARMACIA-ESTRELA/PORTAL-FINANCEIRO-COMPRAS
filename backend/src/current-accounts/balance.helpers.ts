import { MovementType, Prisma } from '@prisma/client';

export type BalanceStatus = 'POSITIVO' | 'ZERADO' | 'NEGATIVO';

export interface MovementLike {
  id: string;
  type: MovementType;
  amount: Prisma.Decimal;
  reversalOfMovementId: string | null;
}

const ZERO = new Prisma.Decimal(0);

/** Sinal contábil por tipo (sem considerar estorno). */
function signedByType(type: MovementType, amount: Prisma.Decimal): Prisma.Decimal {
  switch (type) {
    case MovementType.ENTRADA:
    case MovementType.AJUSTE_POSITIVO:
      return amount;
    case MovementType.SAIDA:
    case MovementType.AJUSTE_NEGATIVO:
      return amount.negated();
    default:
      return ZERO;
  }
}

/**
 * Valor com sinal de uma movimentação para o cálculo de saldo (regra ÚNICA).
 * - Movimentos normais usam o sinal do seu tipo.
 * - O movimento original estornado CONTINUA contando normalmente.
 * - O movimento de ESTORNO entra com o sinal INVERSO do original, neutralizando-o.
 *   Assim, original + estorno = 0, sem dupla reversão.
 */
export function signedValue(m: MovementLike, byId: Map<string, MovementLike>): Prisma.Decimal {
  if (m.type !== MovementType.ESTORNO) return signedByType(m.type, m.amount);
  if (!m.reversalOfMovementId) return ZERO;
  const original = byId.get(m.reversalOfMovementId);
  if (!original) return ZERO;
  return signedByType(original.type, original.amount).negated();
}

export function balanceStatusOf(balance: Prisma.Decimal): BalanceStatus {
  if (balance.greaterThan(0)) return 'POSITIVO';
  if (balance.lessThan(0)) return 'NEGATIVO';
  return 'ZERADO';
}

export interface MovementForTotals {
  id: string;
  type: MovementType;
  amount: Prisma.Decimal;
  isReversed: boolean;
  reversalOfMovementId: string | null;
}

export interface AccountTotals {
  balance: string;
  totalEntries: string;
  totalExits: string;
  totalPositiveAdjustments: string;
  totalNegativeAdjustments: string;
  balanceStatus: BalanceStatus;
}

/**
 * Totais e saldo de uma conta a partir de TODAS as suas movimentações.
 * Os totais por tipo ignoram movimentos estornados (is_reversed) e os próprios
 * registros de ESTORNO; o saldo usa a regra única de signedValue.
 */
export function computeAccountTotals(movements: MovementForTotals[]): AccountTotals {
  const byId = new Map<string, MovementLike>(movements.map((m) => [m.id, m]));
  let balance = ZERO;
  let entries = ZERO;
  let exits = ZERO;
  let posAdj = ZERO;
  let negAdj = ZERO;

  for (const m of movements) {
    balance = balance.plus(signedValue(m, byId));
    if (m.isReversed || m.type === MovementType.ESTORNO) continue;
    switch (m.type) {
      case MovementType.ENTRADA:
        entries = entries.plus(m.amount);
        break;
      case MovementType.SAIDA:
        exits = exits.plus(m.amount);
        break;
      case MovementType.AJUSTE_POSITIVO:
        posAdj = posAdj.plus(m.amount);
        break;
      case MovementType.AJUSTE_NEGATIVO:
        negAdj = negAdj.plus(m.amount);
        break;
    }
  }

  return {
    balance: balance.toFixed(2),
    totalEntries: entries.toFixed(2),
    totalExits: exits.toFixed(2),
    totalPositiveAdjustments: posAdj.toFixed(2),
    totalNegativeAdjustments: negAdj.toFixed(2),
    balanceStatus: balanceStatusOf(balance),
  };
}
