import { Injectable } from '@nestjs/common';
import { ConfirmationStatus, FinancialStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { openBalanceOf } from '../receipts/balance.helpers';
import { computeAccountTotals } from '../current-accounts/balance.helpers';
import {
  computeDueStatus,
  dateToIso,
  type DueStatus,
} from '../receivables/receivable.helpers';
import type { QueryDashboardDto } from './dto/query-dashboard.dto';
import {
  OPEN_STATUSES,
  addDays,
  buildDashboardScope,
  lastMonths,
  startOfTodayUtc,
  validConfirmedReceiptWhere,
} from './dashboard-scope.helpers';

const receivableListSelect = {
  id: true,
  competenceMonth: true,
  expectedReceiptDate: true,
  amount: true,
  financialStatus: true,
  supplier: { select: { id: true, tradeName: true } },
  actionType: { select: { id: true, name: true } },
  buyer: { select: { id: true, userNumber: true, name: true } },
  receipts: {
    where: {
      confirmationStatus: ConfirmationStatus.CONFIRMADO,
      isReversed: false,
      reversalOfReceiptId: null,
    },
    select: { amount: true },
  },
} satisfies Prisma.ReceivableSelect;

type ReceivableRow = Prisma.ReceivableGetPayload<{ select: typeof receivableListSelect }>;

const accountCardInclude = {
  supplier: { select: { id: true, tradeName: true } },
  owner: { select: { id: true, userNumber: true, name: true } },
  movements: {
    select: {
      id: true,
      type: true,
      amount: true,
      isReversed: true,
      reversalOfMovementId: true,
      createdAt: true,
    },
  },
} satisfies Prisma.CurrentAccountInclude;

type AccountRow = Prisma.CurrentAccountGetPayload<{ include: typeof accountCardInclude }>;

interface OpenReceivableItem {
  id: string;
  competenceMonth: string;
  expectedReceiptDate: string;
  openBalance: string;
  financialStatus: FinancialStatus;
  dueStatus: DueStatus;
  supplier: { id: string; tradeName: string };
  actionType: { id: string; name: string };
  buyer: { id: string; userNumber: number; name: string };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(query: QueryDashboardDto, user: AuthenticatedUser) {
    const scope = buildDashboardScope(query, user);
    const { receivableWhere, accountWhere, showBuyer } = scope;

    const [kpis, charts, lists, currentAccounts] = await Promise.all([
      this.buildKpis(receivableWhere, accountWhere),
      this.buildCharts(receivableWhere, accountWhere),
      this.buildLists(receivableWhere, accountWhere, showBuyer),
      this.buildCurrentAccounts(accountWhere, showBuyer),
    ]);

    return { kpis, charts, lists, currentAccounts };
  }

  private openBalanceOfRow(r: ReceivableRow): Prisma.Decimal {
    const totalReceived = r.receipts.reduce(
      (acc, x) => acc.plus(x.amount),
      new Prisma.Decimal(0),
    );
    return openBalanceOf(r.amount, totalReceived);
  }

  private toOpenItem(r: ReceivableRow): OpenReceivableItem {
    const dueStatus = computeDueStatus(r.expectedReceiptDate, r.financialStatus);
    return {
      id: r.id,
      competenceMonth: r.competenceMonth,
      expectedReceiptDate: dateToIso(r.expectedReceiptDate),
      openBalance: this.openBalanceOfRow(r).toFixed(2),
      financialStatus: r.financialStatus,
      dueStatus,
      supplier: r.supplier,
      actionType: r.actionType,
      buyer: r.buyer,
    };
  }

  private async loadOpenReceivables(
    extraWhere: Prisma.ReceivableWhereInput = {},
  ): Promise<OpenReceivableItem[]> {
    const rows = await this.prisma.receivable.findMany({
      where: {
        AND: [{ financialStatus: { in: OPEN_STATUSES } }, extraWhere],
      },
      select: receivableListSelect,
    });
    return rows.map((r) => this.toOpenItem(r));
  }

  private async openBalanceSum(recvWhere: Prisma.ReceivableWhereInput): Promise<string> {
    const pending: Prisma.ReceivableWhereInput = {
      AND: [recvWhere, { financialStatus: { in: OPEN_STATUSES } }],
    };
    const [amt, rec] = await Promise.all([
      this.prisma.receivable.aggregate({ where: pending, _sum: { amount: true } }),
      this.prisma.receivableReceipt.aggregate({
        where: validConfirmedReceiptWhere(pending),
        _sum: { amount: true },
      }),
    ]);
    const open = (amt._sum.amount ?? new Prisma.Decimal(0)).minus(
      rec._sum.amount ?? new Prisma.Decimal(0),
    );
    return (open.isNegative() ? new Prisma.Decimal(0) : open).toFixed(2);
  }

  private async buildKpis(
    receivableWhere: Prisma.ReceivableWhereInput,
    accountWhere: Prisma.CurrentAccountWhereInput,
  ) {
    const today = startOfTodayUtc();
    const in30 = addDays(today, 30);
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const nextMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
    const yearStart = new Date(Date.UTC(now.getFullYear(), 0, 1));
    const nextYear = new Date(Date.UTC(now.getFullYear() + 1, 0, 1));

    const pending: Prisma.ReceivableWhereInput = {
      AND: [receivableWhere, { financialStatus: { in: OPEN_STATUSES } }],
    };
    const overdue: Prisma.ReceivableWhereInput = {
      AND: [receivableWhere, { financialStatus: { in: OPEN_STATUSES } }, { expectedReceiptDate: { lt: today } }],
    };
    const next30: Prisma.ReceivableWhereInput = {
      AND: [
        receivableWhere,
        { financialStatus: { in: OPEN_STATUSES } },
        { expectedReceiptDate: { gte: today, lte: in30 } },
      ],
    };

    const confirmedBase = validConfirmedReceiptWhere(receivableWhere);

    const accounts = await this.prisma.currentAccount.findMany({
      where: accountWhere,
      include: accountCardInclude,
    });

    let totalBalance = new Prisma.Decimal(0);
    let positive = 0;
    let zero = 0;
    let negative = 0;
    for (const acc of accounts) {
      const t = computeAccountTotals(acc.movements);
      totalBalance = totalBalance.plus(t.balance);
      if (t.balanceStatus === 'POSITIVO') positive++;
      else if (t.balanceStatus === 'NEGATIVO') negative++;
      else zero++;
    }

    const [
      totalReceivableOpen,
      totalOverdue,
      forecastNext30Days,
      pendingReceivablesCount,
      overdueReceivablesCount,
      monthAgg,
      yearAgg,
      pendingReceiptsConfirmationCount,
    ] = await Promise.all([
      this.openBalanceSum(receivableWhere),
      this.openBalanceSum(overdue),
      this.openBalanceSum(next30),
      this.prisma.receivable.count({ where: pending }),
      this.prisma.receivable.count({ where: overdue }),
      this.prisma.receivableReceipt.aggregate({
        where: { ...confirmedBase, receiptDate: { gte: monthStart, lt: nextMonth } },
        _sum: { amount: true },
      }),
      this.prisma.receivableReceipt.aggregate({
        where: { ...confirmedBase, receiptDate: { gte: yearStart, lt: nextYear } },
        _sum: { amount: true },
      }),
      this.prisma.receivableReceipt.count({
        where: {
          reversalOfReceiptId: null,
          isReversed: false,
          confirmationStatus: ConfirmationStatus.PENDENTE_CONFIRMACAO,
          receivable: receivableWhere,
        },
      }),
    ]);

    return {
      totalReceivableOpen,
      totalOverdue,
      receivedThisMonth: (monthAgg._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      receivedThisYear: (yearAgg._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      forecastNext30Days,
      pendingReceivablesCount,
      overdueReceivablesCount,
      pendingReceiptsConfirmationCount,
      currentAccountsBalance: totalBalance.toFixed(2),
      positiveCurrentAccountsCount: positive,
      zeroCurrentAccountsCount: zero,
      negativeCurrentAccountsCount: negative,
    };
  }

  private async buildCharts(
    receivableWhere: Prisma.ReceivableWhereInput,
    accountWhere: Prisma.CurrentAccountWhereInput,
  ) {
    const months12 = lastMonths(12);
    const months6 = months12.slice(-6);
    const confirmedBase = validConfirmedReceiptWhere(receivableWhere);

    const [openItems, confirmedReceipts, allReceivables, accounts, methods] = await Promise.all([
      this.loadOpenReceivables(receivableWhere),
      this.prisma.receivableReceipt.findMany({
        where: confirmedBase,
        select: {
          amount: true,
          receiptDate: true,
          receiptMethodId: true,
          receiptMethod: { select: { id: true, name: true } },
          receivable: { select: { competenceMonth: true } },
        },
      }),
      this.prisma.receivable.findMany({
        where: receivableWhere,
        select: { amount: true, competenceMonth: true },
      }),
      this.prisma.currentAccount.findMany({ where: accountWhere, include: accountCardInclude }),
      this.prisma.receiptMethod.findMany({ select: { id: true, name: true } }),
    ]);

    const receivedByMonth = new Map<string, Prisma.Decimal>();
    const pendingByCompetence = new Map<string, Prisma.Decimal>();
    const monthlyEvolution = new Map<string, Prisma.Decimal>();
    const launchedByCompetence = new Map<string, Prisma.Decimal>();
    const receivedByCompetence = new Map<string, Prisma.Decimal>();

    for (const m of months12) {
      receivedByMonth.set(m, new Prisma.Decimal(0));
      monthlyEvolution.set(m, new Prisma.Decimal(0));
    }

    for (const r of confirmedReceipts) {
      const monthKey = dateToIso(r.receiptDate).slice(0, 7);
      if (receivedByMonth.has(monthKey)) {
        receivedByMonth.set(monthKey, (receivedByMonth.get(monthKey) ?? new Prisma.Decimal(0)).plus(r.amount));
      }
      if (monthlyEvolution.has(monthKey)) {
        monthlyEvolution.set(monthKey, (monthlyEvolution.get(monthKey) ?? new Prisma.Decimal(0)).plus(r.amount));
      }
      const comp = r.receivable.competenceMonth;
      receivedByCompetence.set(comp, (receivedByCompetence.get(comp) ?? new Prisma.Decimal(0)).plus(r.amount));
    }

    for (const item of openItems) {
      pendingByCompetence.set(
        item.competenceMonth,
        (pendingByCompetence.get(item.competenceMonth) ?? new Prisma.Decimal(0)).plus(item.openBalance),
      );
    }

    for (const r of allReceivables) {
      launchedByCompetence.set(
        r.competenceMonth,
        (launchedByCompetence.get(r.competenceMonth) ?? new Prisma.Decimal(0)).plus(r.amount),
      );
    }

    const receivedVsPending = months6.map((month) => ({
      month,
      received: (receivedByMonth.get(month) ?? new Prisma.Decimal(0)).toFixed(2),
      pending: (pendingByCompetence.get(month) ?? new Prisma.Decimal(0)).toFixed(2),
    }));

    const supplierOpen = new Map<string, { name: string; open: Prisma.Decimal }>();
    for (const item of openItems) {
      const cur = supplierOpen.get(item.supplier.id) ?? {
        name: item.supplier.tradeName,
        open: new Prisma.Decimal(0),
      };
      cur.open = cur.open.plus(item.openBalance);
      supplierOpen.set(item.supplier.id, cur);
    }
    const topSuppliersOpen = [...supplierOpen.entries()]
      .map(([supplierId, v]) => ({ supplierId, supplierName: v.name, openBalance: v.open.toFixed(2) }))
      .sort((a, b) => Number(b.openBalance) - Number(a.openBalance))
      .slice(0, 10);

    const actionOpen = new Map<string, { name: string; open: Prisma.Decimal }>();
    for (const item of openItems) {
      const cur = actionOpen.get(item.actionType.id) ?? {
        name: item.actionType.name,
        open: new Prisma.Decimal(0),
      };
      cur.open = cur.open.plus(item.openBalance);
      actionOpen.set(item.actionType.id, cur);
    }
    const openByActionType = [...actionOpen.entries()]
      .map(([actionTypeId, v]) => ({
        actionTypeId,
        actionTypeName: v.name,
        openBalance: v.open.toFixed(2),
      }))
      .sort((a, b) => Number(b.openBalance) - Number(a.openBalance));

    const methodTotals = new Map<string, Prisma.Decimal>();
    for (const r of confirmedReceipts) {
      methodTotals.set(
        r.receiptMethodId,
        (methodTotals.get(r.receiptMethodId) ?? new Prisma.Decimal(0)).plus(r.amount),
      );
    }
    const receiptsByMethod = methods
      .map((m) => ({
        methodId: m.id,
        methodName: m.name,
        total: (methodTotals.get(m.id) ?? new Prisma.Decimal(0)).toFixed(2),
      }))
      .filter((m) => Number(m.total) > 0)
      .sort((a, b) => Number(b.total) - Number(a.total));

    const monthlyReceiptEvolution = months12.map((month) => ({
      month,
      total: (monthlyEvolution.get(month) ?? new Prisma.Decimal(0)).toFixed(2),
    }));

    const supplierBalance = new Map<string, { name: string; balance: Prisma.Decimal }>();
    for (const acc of accounts) {
      const totals = computeAccountTotals(acc.movements);
      const cur = supplierBalance.get(acc.supplierId) ?? {
        name: acc.supplier.tradeName,
        balance: new Prisma.Decimal(0),
      };
      cur.balance = cur.balance.plus(totals.balance);
      supplierBalance.set(acc.supplierId, cur);
    }
    const currentAccountBalanceBySupplier = [...supplierBalance.entries()]
      .map(([supplierId, v]) => ({
        supplierId,
        supplierName: v.name,
        balance: v.balance.toFixed(2),
      }))
      .sort((a, b) => Number(b.balance) - Number(a.balance));

    const competenceMonths = [...new Set([...launchedByCompetence.keys(), ...receivedByCompetence.keys()])]
      .sort()
      .slice(-12);
    const valuesByCompetence = competenceMonths.map((month) => ({
      month,
      launched: (launchedByCompetence.get(month) ?? new Prisma.Decimal(0)).toFixed(2),
      received: (receivedByCompetence.get(month) ?? new Prisma.Decimal(0)).toFixed(2),
    }));

    return {
      receivedVsPending,
      topSuppliersOpen,
      openByActionType,
      receiptsByMethod,
      monthlyReceiptEvolution,
      currentAccountBalanceBySupplier,
      valuesByCompetence,
    };
  }

  private serializeReceivableListItem(item: OpenReceivableItem, showBuyer: boolean) {
    return {
      id: item.id,
      supplierName: item.supplier.tradeName,
      actionTypeName: item.actionType.name,
      expectedReceiptDate: item.expectedReceiptDate,
      openBalance: item.openBalance,
      financialStatus: item.financialStatus,
      dueStatus: item.dueStatus,
      buyer: showBuyer
        ? { id: item.buyer.id, userNumber: item.buyer.userNumber, name: item.buyer.name }
        : undefined,
      link: `/lancamentos`,
    };
  }

  private async buildLists(
    receivableWhere: Prisma.ReceivableWhereInput,
    accountWhere: Prisma.CurrentAccountWhereInput,
    showBuyer: boolean,
  ) {
    const today = startOfTodayUtc();
    const tomorrow = addDays(today, 1);
    const in7 = addDays(today, 7);
    const in30 = addDays(today, 30);

    const openBase = { AND: [receivableWhere, { financialStatus: { in: OPEN_STATUSES } }] };

    const [overdueRows, todayRows, next7Rows, next30Rows, lastReceipts, pendingReceipts, lastMovements, negativeAccounts] =
      await Promise.all([
        this.prisma.receivable.findMany({
          where: { AND: [openBase, { expectedReceiptDate: { lt: today } }] },
          select: receivableListSelect,
          orderBy: { expectedReceiptDate: 'asc' },
          take: 10,
        }),
        this.prisma.receivable.findMany({
          where: { AND: [openBase, { expectedReceiptDate: { gte: today, lt: tomorrow } }] },
          select: receivableListSelect,
          orderBy: { expectedReceiptDate: 'asc' },
          take: 10,
        }),
        this.prisma.receivable.findMany({
          where: {
            AND: [openBase, { expectedReceiptDate: { gte: tomorrow, lte: in7 } }],
          },
          select: receivableListSelect,
          orderBy: { expectedReceiptDate: 'asc' },
          take: 10,
        }),
        this.prisma.receivable.findMany({
          where: {
            AND: [openBase, { expectedReceiptDate: { gte: tomorrow, lte: in30 } }],
          },
          select: receivableListSelect,
          orderBy: { expectedReceiptDate: 'asc' },
          take: 10,
        }),
        this.prisma.receivableReceipt.findMany({
          where: validConfirmedReceiptWhere(receivableWhere),
          include: {
            receiptMethod: { select: { id: true, name: true } },
            receivable: {
              select: {
                id: true,
                supplier: { select: { id: true, tradeName: true } },
                buyer: { select: { id: true, userNumber: true, name: true } },
              },
            },
          },
          orderBy: { confirmedAt: 'desc' },
          take: 10,
        }),
        this.prisma.receivableReceipt.findMany({
          where: {
            reversalOfReceiptId: null,
            isReversed: false,
            confirmationStatus: ConfirmationStatus.PENDENTE_CONFIRMACAO,
            receivable: receivableWhere,
          },
          include: {
            receiptMethod: { select: { id: true, name: true } },
            receivable: {
              select: {
                id: true,
                supplier: { select: { id: true, tradeName: true } },
                buyer: { select: { id: true, userNumber: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.currentAccountMovement.findMany({
          where: { currentAccount: accountWhere },
          include: {
            currentAccount: {
              select: {
                id: true,
                name: true,
                supplier: { select: { id: true, tradeName: true } },
                owner: { select: { id: true, userNumber: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.currentAccount.findMany({ where: accountWhere, include: accountCardInclude }),
      ]);

    const negativeAccountsList = negativeAccounts
      .map((acc) => {
        const totals = computeAccountTotals(acc.movements);
        return {
          id: acc.id,
          name: acc.name,
          supplierName: acc.supplier.tradeName,
          balance: totals.balance,
          balanceStatus: totals.balanceStatus,
          owner: showBuyer
            ? { id: acc.owner.id, userNumber: acc.owner.userNumber, name: acc.owner.name }
            : undefined,
        };
      })
      .filter((a) => a.balanceStatus === 'NEGATIVO')
      .sort((a, b) => Number(a.balance) - Number(b.balance))
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        name: a.name,
        supplierName: a.supplierName,
        balance: a.balance,
        balanceStatus: a.balanceStatus,
        owner: a.owner,
        link: `/conta-corrente/${a.id}`,
      }));

    return {
      overdueReceivables: overdueRows.map((r) =>
        this.serializeReceivableListItem(this.toOpenItem(r), showBuyer),
      ),
      dueTodayReceivables: todayRows.map((r) =>
        this.serializeReceivableListItem(this.toOpenItem(r), showBuyer),
      ),
      dueNext7DaysReceivables: next7Rows.map((r) =>
        this.serializeReceivableListItem(this.toOpenItem(r), showBuyer),
      ),
      dueNext30DaysReceivables: next30Rows.map((r) =>
        this.serializeReceivableListItem(this.toOpenItem(r), showBuyer),
      ),
      lastConfirmedReceipts: lastReceipts.map((r) => ({
        id: r.id,
        receiptDate: dateToIso(r.receiptDate),
        amount: r.amount.toFixed(2),
        methodName: r.receiptMethod.name,
        supplierName: r.receivable.supplier.tradeName,
        receivableId: r.receivable.id,
        buyer: showBuyer
          ? {
              id: r.receivable.buyer.id,
              userNumber: r.receivable.buyer.userNumber,
              name: r.receivable.buyer.name,
            }
          : undefined,
        link: '/recebimentos',
      })),
      pendingConfirmationReceipts: pendingReceipts.map((r) => ({
        id: r.id,
        receiptDate: dateToIso(r.receiptDate),
        amount: r.amount.toFixed(2),
        methodName: r.receiptMethod.name,
        supplierName: r.receivable.supplier.tradeName,
        receivableId: r.receivable.id,
        buyer: showBuyer
          ? {
              id: r.receivable.buyer.id,
              userNumber: r.receivable.buyer.userNumber,
              name: r.receivable.buyer.name,
            }
          : undefined,
        link: '/recebimentos',
      })),
      lastCurrentAccountMovements: lastMovements.map((m) => ({
        id: m.id,
        currentAccountId: m.currentAccountId,
        accountName: m.currentAccount.name,
        supplierName: m.currentAccount.supplier.tradeName,
        type: m.type,
        movementDate: dateToIso(m.movementDate),
        amount: m.amount.toFixed(2),
        isReversed: m.isReversed,
        receivableId: m.receivableId,
        receivableReceiptId: m.receivableReceiptId,
        owner: showBuyer
          ? {
              id: m.currentAccount.owner.id,
              userNumber: m.currentAccount.owner.userNumber,
              name: m.currentAccount.owner.name,
            }
          : undefined,
        link: `/conta-corrente/${m.currentAccountId}`,
      })),
      negativeCurrentAccounts: negativeAccountsList,
    };
  }

  private async buildCurrentAccounts(
    accountWhere: Prisma.CurrentAccountWhereInput,
    showBuyer: boolean,
  ) {
    const accounts = await this.prisma.currentAccount.findMany({
      where: { ...accountWhere, isActive: true },
      include: accountCardInclude,
    });

    const serialized = accounts.map((acc) => {
      const totals = computeAccountTotals(acc.movements);
      return {
        id: acc.id,
        name: acc.name,
        supplierName: acc.supplier.tradeName,
        balance: totals.balance,
        balanceStatus: totals.balanceStatus,
        owner: showBuyer
          ? { id: acc.owner.id, userNumber: acc.owner.userNumber, name: acc.owner.name }
          : undefined,
        link: `/conta-corrente/${acc.id}`,
      };
    });

    serialized.sort((a, b) => {
      if (a.balanceStatus === 'NEGATIVO' && b.balanceStatus !== 'NEGATIVO') return -1;
      if (b.balanceStatus === 'NEGATIVO' && a.balanceStatus !== 'NEGATIVO') return 1;
      return Number(b.balance) - Number(a.balance);
    });

    return { featured: serialized.slice(0, 8) };
  }
}
