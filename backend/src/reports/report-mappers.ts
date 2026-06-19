import {
  buildCsv,
  buildXlsx,
  formatCompetenceBr,
  formatDateBr,
  formatDateTimeBr,
  formatMoneyBr,
  sanitizeJsonForExport,
  todayFilenameSuffix,
  type ExportSheet,
} from './export-format.helpers';

const DESTINATION_LABEL: Record<string, string> = {
  BAIXA_SIMPLES: 'Baixa simples',
  CREDITO_CONTA_CORRENTE: 'Crédito em conta corrente',
};

export function mapReceivables(rows: Array<Record<string, unknown>>) {
  const headers = [
    'ID',
    'Data negociação',
    'Competência',
    'Previsão recebimento',
    'Fornecedor',
    'Tipo fornecedor',
    'Descrição da ação',
    'Valor original',
    'Total recebido',
    'Saldo aberto',
    'Status financeiro',
    'Status vencimento',
    'Dias vencido',
    'Dias para vencer',
    'Comprador',
    'Observações',
    'Criado em',
    'Atualizado em',
    'Cancelado em',
    'Motivo cancelamento',
  ];
  const data = rows.map((r) => [
    r.id,
    formatDateBr(r.negotiationDate as string),
    formatCompetenceBr(r.competenceMonth as string),
    formatDateBr(r.expectedReceiptDate as string),
    (r.supplier as { tradeName: string }).tradeName,
    r.supplierType ?? '',
    (r.actionType as { name: string }).name,
    formatMoneyBr(r.amount as string),
    formatMoneyBr(r.totalReceived as string),
    formatMoneyBr(r.openBalance as string),
    r.financialStatus,
    r.dueStatus,
    r.daysOverdue ?? '',
    r.daysToDue ?? '',
    `#${(r.buyer as { userNumber: number }).userNumber} ${(r.buyer as { name: string }).name}`,
    r.notes ?? '',
    formatDateTimeBr(r.createdAt as string),
    formatDateTimeBr(r.updatedAt as string),
    r.canceledAt ? formatDateTimeBr(r.canceledAt as string) : '',
    r.cancelReason ?? '',
  ]);
  return { headers, rows: data, moneyColumnIndexes: [7, 8, 9] };
}

export function mapReceipts(rows: Array<Record<string, unknown>>) {
  const headers = [
    'ID recebimento',
    'Data recebimento',
    'Fornecedor',
    'Descrição da ação',
    'Competência',
    'Valor original do lançamento',
    'Valor recebido',
    'Total já recebido',
    'Saldo restante',
    'Tipo',
    'Forma de recebimento',
    'Destino',
    'Conta corrente vinculada',
    'Status confirmação',
    'Data confirmação',
    'Confirmado por',
    'Estornado',
    'Data estorno',
    'Motivo estorno',
    'Comprador',
    'Status atual do lançamento',
    'Data prevista original',
    'Observações',
    'Criado em',
  ];
  const data = rows.map((r) => {
    const recv = r.receivable as Record<string, unknown>;
    const buyer = recv.buyer as { userNumber: number; name: string };
    const confirmer = r.confirmedBy as { userNumber: number; name: string } | null;
    const ca = r.currentAccount as { name: string } | null;
    return [
      r.id,
      formatDateBr(r.receiptDate as string),
      (recv.supplier as { tradeName: string }).tradeName,
      (recv.actionType as { name: string }).name,
      formatCompetenceBr(recv.competenceMonth as string),
      formatMoneyBr(recv.amount as string),
      formatMoneyBr(r.amount as string),
      formatMoneyBr(recv.totalReceived as string),
      formatMoneyBr(recv.openBalance as string),
      r.receiptType,
      (r.receiptMethod as { name: string }).name,
      DESTINATION_LABEL[r.destinationType as string] ?? r.destinationType,
      ca?.name ?? '',
      r.confirmationStatus,
      r.confirmedAt ? formatDateTimeBr(r.confirmedAt as string) : '',
      confirmer ? `#${confirmer.userNumber} ${confirmer.name}` : '',
      r.isReversed ? 'Sim' : 'Não',
      r.reversedAt ? formatDateTimeBr(r.reversedAt as string) : '',
      r.reverseReason ?? '',
      `#${buyer.userNumber} ${buyer.name}`,
      recv.financialStatus,
      formatDateBr(recv.expectedReceiptDate as string),
      r.notes ?? '',
      formatDateTimeBr(r.createdAt as string),
    ];
  });
  return { headers, rows: data, moneyColumnIndexes: [5, 6, 7, 8] };
}

export function mapCurrentAccounts(rows: Array<Record<string, unknown>>) {
  const headers = [
    'ID',
    'Nome da conta',
    'Fornecedor',
    'Comprador responsável',
    'Saldo atual',
    'Total entradas',
    'Total saídas',
    'Ajustes positivos',
    'Ajustes negativos',
    'Status saldo',
    'Status conta',
    'Última movimentação',
    'Usuários compartilhados',
    'Observações',
    'Criado em',
    'Atualizado em',
  ];
  const data = rows.map((r) => {
    const owner = r.owner as { userNumber: number; name: string };
    const shares = (r.shares as Array<{ user: { userNumber: number; name: string } }>) ?? [];
    return [
      r.id,
      r.name,
      (r.supplier as { tradeName: string }).tradeName,
      `#${owner.userNumber} ${owner.name}`,
      formatMoneyBr(r.balance as string),
      formatMoneyBr(r.totalEntries as string),
      formatMoneyBr(r.totalExits as string),
      formatMoneyBr(r.totalPositiveAdjustments as string),
      formatMoneyBr(r.totalNegativeAdjustments as string),
      r.balanceStatus,
      r.isActive ? 'Ativa' : 'Inativa',
      r.lastMovementAt ? formatDateTimeBr(r.lastMovementAt as string) : '',
      shares.map((s) => `#${s.user.userNumber} ${s.user.name}`).join(', '),
      r.notes ?? '',
      formatDateTimeBr(r.createdAt as string),
      formatDateTimeBr(r.updatedAt as string),
    ];
  });
  return { headers, rows: data, moneyColumnIndexes: [4, 5, 6, 7, 8] };
}

export function mapMovements(rows: Array<Record<string, unknown>>) {
  const headers = [
    'ID movimento',
    'Data',
    'Tipo',
    'Descrição',
    'Forma de recebimento',
    'Descrição da ação',
    'Valor',
    'Sinal',
    'Saldo após movimentação',
    'Usuário',
    'Estornado',
    'Data estorno',
    'Motivo estorno',
    'Origem',
    'Lançamento vinculado',
    'Recebimento vinculado',
    'Observação',
    'Criado em',
  ];
  const data = rows.map((r) => {
    const creator = r.createdBy as { userNumber: number; name: string };
    return [
      r.id,
      formatDateBr(r.movementDate as string),
      r.type,
      r.description ?? '',
      (r.receiptMethod as { name: string } | null)?.name ?? '',
      (r.actionType as { name: string } | null)?.name ?? '',
      formatMoneyBr(r.amount as string),
      r.sign,
      formatMoneyBr(r.balanceAfter as string),
      `#${creator.userNumber} ${creator.name}`,
      r.isReversed ? 'Sim' : 'Não',
      r.reversedAt ? formatDateTimeBr(r.reversedAt as string) : '',
      r.reverseReason ?? '',
      r.origin === 'RECEIPT' ? 'Recebimento' : '',
      r.receivableId ?? '',
      r.receivableReceiptId ?? '',
      r.notes ?? '',
      formatDateTimeBr(r.createdAt as string),
    ];
  });
  return { headers, rows: data, moneyColumnIndexes: [6, 8] };
}

export function mapAudit(rows: Array<Record<string, unknown>>) {
  const headers = [
    'ID',
    'Data/hora',
    'Usuário',
    'Número usuário',
    'Ação',
    'Entidade',
    'ID entidade',
    'Motivo',
    'IP',
    'User agent',
    'Valores anteriores',
    'Valores novos',
  ];
  const data = rows.map((r) => {
    const user = r.user as { name: string; userNumber: number } | null;
    return [
      r.id,
      formatDateTimeBr(r.createdAt as string),
      user?.name ?? '',
      user?.userNumber ?? '',
      r.action,
      r.entityType,
      r.entityId ?? '',
      r.reason ?? '',
      r.ipAddress ?? '',
      r.userAgent ?? '',
      sanitizeJsonForExport(r.oldValues),
      sanitizeJsonForExport(r.newValues),
    ];
  });
  return { headers, rows: data };
}

export function mapDashboardSheets(dashboard: Record<string, unknown>): ExportSheet[] {
  const kpis = dashboard.kpis as Record<string, string | number>;
  const charts = dashboard.charts as Record<string, unknown[]>;
  const lists = dashboard.lists as Record<string, unknown[]>;

  const sheets: ExportSheet[] = [
    {
      name: 'KPIs',
      headers: ['Indicador', 'Valor'],
      rows: Object.entries(kpis).map(([k, v]) => [k, v]),
    },
    {
      name: 'Recebido x Pendente',
      headers: ['Mês', 'Recebido', 'Pendente'],
      rows: (charts.receivedVsPending as Array<Record<string, string>>).map((r) => [
        formatCompetenceBr(r.month),
        formatMoneyBr(r.received),
        formatMoneyBr(r.pending),
      ]),
      moneyColumnIndexes: [1, 2],
    },
    {
      name: 'Top fornecedores',
      headers: ['Fornecedor', 'Em aberto'],
      rows: (charts.topSuppliersOpen as Array<Record<string, string>>).map((r) => [
        r.supplierName,
        formatMoneyBr(r.openBalance),
      ]),
      moneyColumnIndexes: [1],
    },
    {
      name: 'Valores por ação',
      headers: ['Ação', 'Em aberto'],
      rows: (charts.openByActionType as Array<Record<string, string>>).map((r) => [
        r.actionTypeName,
        formatMoneyBr(r.openBalance),
      ]),
      moneyColumnIndexes: [1],
    },
    {
      name: 'Recebimentos por forma',
      headers: ['Forma', 'Total'],
      rows: (charts.receiptsByMethod as Array<Record<string, string>>).map((r) => [
        r.methodName,
        formatMoneyBr(r.total),
      ]),
      moneyColumnIndexes: [1],
    },
    {
      name: 'Evolução recebimentos',
      headers: ['Mês', 'Total'],
      rows: (charts.monthlyReceiptEvolution as Array<Record<string, string>>).map((r) => [
        formatCompetenceBr(r.month),
        formatMoneyBr(r.total),
      ]),
      moneyColumnIndexes: [1],
    },
    {
      name: 'Saldo CC fornecedor',
      headers: ['Fornecedor', 'Saldo'],
      rows: (charts.currentAccountBalanceBySupplier as Array<Record<string, string>>).map((r) => [
        r.supplierName,
        formatMoneyBr(r.balance),
      ]),
      moneyColumnIndexes: [1],
    },
    {
      name: 'Valores competência',
      headers: ['Competência', 'Lançado', 'Recebido'],
      rows: (charts.valuesByCompetence as Array<Record<string, string>>).map((r) => [
        formatCompetenceBr(r.month),
        formatMoneyBr(r.launched),
        formatMoneyBr(r.received),
      ]),
      moneyColumnIndexes: [1, 2],
    },
    {
      name: 'Lançamentos vencidos',
      headers: ['Fornecedor', 'Valor', 'Previsão'],
      rows: (lists.overdueReceivables as Array<Record<string, string>>).map((r) => [
        r.supplierName,
        formatMoneyBr(r.openBalance),
        formatDateBr(r.expectedReceiptDate),
      ]),
      moneyColumnIndexes: [1],
    },
    {
      name: 'Recebimentos pendentes',
      headers: ['Fornecedor', 'Valor', 'Data'],
      rows: (lists.pendingConfirmationReceipts as Array<Record<string, string>>).map((r) => [
        r.supplierName,
        formatMoneyBr(r.amount),
        formatDateBr(r.receiptDate),
      ]),
      moneyColumnIndexes: [1],
    },
  ];
  return sheets;
}

export function exportFilename(prefix: string, ext: 'xlsx' | 'csv', suffix?: string): string {
  const date = todayFilenameSuffix();
  const extra = suffix ? `_${suffix}` : '';
  return `${prefix}${extra}_${date}.${ext}`;
}

export async function toXlsxBuffer(sheet: { headers: string[]; rows: unknown[][]; moneyColumnIndexes?: number[]; name?: string }) {
  return buildXlsx([{ name: sheet.name ?? 'Dados', ...sheet }]);
}

export async function toXlsxMulti(sheets: ExportSheet[]) {
  return buildXlsx(sheets);
}

export function toCsvBuffer(headers: string[], rows: unknown[][]) {
  return buildCsv(headers, rows);
}
