import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ReceivablesService } from '../receivables/receivables.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { CurrentAccountsService } from '../current-accounts/current-accounts.service';
import { AuditService } from '../audit/audit.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { QueryReceivablesDto } from '../receivables/dto/query-receivables.dto';
import { QueryReceiptsDto } from '../receipts/dto/query-receipts.dto';
import { QueryCurrentAccountsDto } from '../current-accounts/dto/query-current-accounts.dto';
import { QueryCurrentAccountMovementsDto } from '../current-accounts/dto/query-movements.dto';
import { QueryAuditDto } from '../audit/dto/query-audit.dto';
import { QueryDashboardDto } from '../dashboard/dto/query-dashboard.dto';
import {
  exportFilename,
  mapAudit,
  mapCurrentAccounts,
  mapDashboardSheets,
  mapMovements,
  mapReceipts,
  mapReceivables,
  toCsvBuffer,
  toXlsxBuffer,
  toXlsxMulti,
} from './report-mappers';

export type ExportFormat = 'xlsx' | 'csv';

@Injectable()
export class ReportsService {
  constructor(
    private readonly receivables: ReceivablesService,
    private readonly receipts: ReceiptsService,
    private readonly currentAccounts: CurrentAccountsService,
    private readonly audit: AuditService,
    private readonly dashboard: DashboardService,
  ) {}

  private ensureAuditAccess(user: AuthenticatedUser) {
    if (user.role === Role.COMPRADOR) {
      throw new ForbiddenException('Você não tem permissão para exportar auditoria.');
    }
  }

  async exportReceivables(query: QueryReceivablesDto, user: AuthenticatedUser, format: ExportFormat) {
    const rows = await this.receivables.exportAll(query, user);
    const mapped = mapReceivables(rows as unknown as Array<Record<string, unknown>>);
    const filename = exportFilename('lancamentos', format);
    const buffer =
      format === 'xlsx'
        ? await toXlsxBuffer({ ...mapped, name: 'Lançamentos' })
        : toCsvBuffer(mapped.headers, mapped.rows);
    return { buffer, filename, contentType: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8' };
  }

  async exportReceipts(query: QueryReceiptsDto, user: AuthenticatedUser, format: ExportFormat) {
    const rows = await this.receipts.exportAll(query, user);
    const mapped = mapReceipts(rows as unknown as Array<Record<string, unknown>>);
    const filename = exportFilename('recebimentos', format);
    const buffer =
      format === 'xlsx'
        ? await toXlsxBuffer({ ...mapped, name: 'Recebimentos' })
        : toCsvBuffer(mapped.headers, mapped.rows);
    return { buffer, filename, contentType: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8' };
  }

  async exportCurrentAccounts(query: QueryCurrentAccountsDto, user: AuthenticatedUser, format: ExportFormat) {
    const rows = await this.currentAccounts.exportAll(query, user);
    const mapped = mapCurrentAccounts(rows as unknown as Array<Record<string, unknown>>);
    const filename = exportFilename('conta_corrente', format);
    const buffer =
      format === 'xlsx'
        ? await toXlsxBuffer({ ...mapped, name: 'Contas correntes' })
        : toCsvBuffer(mapped.headers, mapped.rows);
    return { buffer, filename, contentType: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8' };
  }

  async exportMovements(
    accountId: string,
    query: QueryCurrentAccountMovementsDto,
    user: AuthenticatedUser,
    format: ExportFormat,
  ) {
    const rows = await this.currentAccounts.exportAllMovements(accountId, query, user);
    const mapped = mapMovements(rows as unknown as Array<Record<string, unknown>>);
    const filename = exportFilename('extrato_conta_corrente', format, accountId.slice(0, 8));
    const buffer =
      format === 'xlsx'
        ? await toXlsxBuffer({ ...mapped, name: 'Extrato' })
        : toCsvBuffer(mapped.headers, mapped.rows);
    return { buffer, filename, contentType: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8' };
  }

  async exportAudit(query: QueryAuditDto, user: AuthenticatedUser, format: ExportFormat) {
    this.ensureAuditAccess(user);
    const rows = await this.audit.exportAll(query);
    const mapped = mapAudit(rows as unknown as Array<Record<string, unknown>>);
    const filename = exportFilename('auditoria', format);
    const buffer =
      format === 'xlsx'
        ? await toXlsxBuffer({ ...mapped, name: 'Auditoria' })
        : toCsvBuffer(mapped.headers, mapped.rows);
    return { buffer, filename, contentType: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8' };
  }

  async exportDashboard(query: QueryDashboardDto, user: AuthenticatedUser) {
    const data = await this.dashboard.getDashboard(query, user);
    const sheets = mapDashboardSheets(data as unknown as Record<string, unknown>);
    const filename = exportFilename('dashboard', 'xlsx');
    const buffer = await toXlsxMulti(sheets);
    return {
      buffer,
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}
