import { FinancialStatus, Prisma } from '@prisma/client';

export type DueStatus = 'EM_DIA' | 'VENCE_HOJE' | 'VENCIDO' | 'SEM_VENCIMENTO';

/** Representa uma data de calendário como inteiro AAAAMMDD para comparação segura. */
function ymdInt(year: number, month: number, day: number): number {
  return year * 10000 + month * 100 + day;
}

/** Data de hoje (calendário local do servidor) em AAAAMMDD. */
function todayYmd(now = new Date()): number {
  return ymdInt(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Data armazenada (@db.Date volta como meia-noite UTC) em AAAAMMDD. */
function dateYmd(date: Date): number {
  return ymdInt(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Diferença em dias entre duas datas de calendário (b - a). */
function diffDays(aYmd: number, bYmd: number): number {
  const toDate = (v: number) =>
    Date.UTC(Math.floor(v / 10000), (Math.floor(v / 100) % 100) - 1, v % 100);
  return Math.round((toDate(bYmd) - toDate(aYmd)) / 86_400_000);
}

/**
 * Calcula o status de vencimento em tempo de leitura.
 * Cancelado/Quitado não são destacados como vencidos (SEM_VENCIMENTO).
 */
export function computeDueStatus(
  expectedReceiptDate: Date,
  financialStatus: FinancialStatus,
  now = new Date(),
): DueStatus {
  if (financialStatus === FinancialStatus.CANCELADO || financialStatus === FinancialStatus.QUITADO) {
    return 'SEM_VENCIMENTO';
  }
  const today = todayYmd(now);
  const expected = dateYmd(expectedReceiptDate);
  if (expected < today) return 'VENCIDO';
  if (expected === today) return 'VENCE_HOJE';
  return 'EM_DIA';
}

/** Dias em atraso (>0 se vencido) ou null. */
export function computeDaysOverdue(expectedReceiptDate: Date, due: DueStatus, now = new Date()): number | null {
  if (due !== 'VENCIDO') return null;
  return diffDays(dateYmd(expectedReceiptDate), todayYmd(now));
}

/** Dias até o vencimento (>=0) quando em dia / vence hoje, ou null. */
export function computeDaysToDue(expectedReceiptDate: Date, due: DueStatus, now = new Date()): number | null {
  if (due !== 'EM_DIA' && due !== 'VENCE_HOJE') return null;
  return diffDays(todayYmd(now), dateYmd(expectedReceiptDate));
}

const ZERO = '0.00';

/**
 * Total recebido nesta fase é sempre 0 (não há módulo de recebimentos ainda).
 * Será substituído na Fase 6 pela soma dos recebimentos confirmados.
 */
export function computeTotalReceived(): string {
  return ZERO;
}

/**
 * Saldo em aberto. Nesta fase = valor do lançamento (sem recebimentos).
 * Cancelado/Quitado não têm saldo em aberto.
 */
export function computeOpenBalance(amount: Prisma.Decimal, financialStatus: FinancialStatus): string {
  if (financialStatus === FinancialStatus.CANCELADO || financialStatus === FinancialStatus.QUITADO) {
    return ZERO;
  }
  return amount.toFixed(2);
}

/** Converte @db.Date para string AAAA-MM-DD (sem deslocamento de fuso). */
export function dateToIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
