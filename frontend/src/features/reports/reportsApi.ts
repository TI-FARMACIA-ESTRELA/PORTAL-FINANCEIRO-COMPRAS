import axios from 'axios';
import { api, extractApiError } from '@/services/api/client';
import {
  buildQueryStringFromFilters,
  downloadBlob,
  formatExportFilename,
  parseContentDispositionFilename,
} from '@/utils/export';
import type { ReceivableQuery } from '@/features/receivables/receivablesApi';
import type { ReceiptQuery } from '@/features/receipts/receiptsApi';
import type { CurrentAccountQuery, MovementQuery } from '@/features/current-accounts/currentAccountsApi';
import type { AuditQuery } from '@/features/admin/auditApi';
import type { DashboardQuery } from '@/features/dashboard/dashboardApi';

type ExportFilters = Record<string, string | number | boolean | undefined | null>;

async function fetchReportBlob(path: string, fallbackFilename: string): Promise<{ blob: Blob; filename: string }> {
  try {
    const response = await api.get<Blob>(path, { responseType: 'blob' });
    const contentType = String(response.headers['content-type'] ?? '');
    if (contentType.includes('application/json')) {
      const text = await response.data.text();
      const json = JSON.parse(text) as { message?: string | string[] };
      const message = Array.isArray(json.message) ? json.message.join(', ') : json.message;
      throw new Error(message ?? 'Falha ao exportar.');
    }
    const filename = parseContentDispositionFilename(
      response.headers['content-disposition'] as string | undefined,
      fallbackFilename,
    );
    return { blob: response.data, filename };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const text = await error.response.data.text();
      try {
        const json = JSON.parse(text) as { message?: string | string[] };
        const message = Array.isArray(json.message) ? json.message.join(', ') : json.message;
        throw new Error(message ?? extractApiError(error));
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== extractApiError(error)) {
          throw parseError;
        }
      }
    }
    throw error;
  }
}

export async function exportReceivables(
  format: 'xlsx' | 'csv',
  filters: Omit<ReceivableQuery, 'page' | 'pageSize'>,
): Promise<void> {
  const qs = buildQueryStringFromFilters(filters as ExportFilters);
  const fallback = formatExportFilename('lancamentos', format);
  const { blob, filename } = await fetchReportBlob(`/reports/receivables.${format}${qs}`, fallback);
  downloadBlob(blob, filename);
}

export async function exportReceipts(
  format: 'xlsx' | 'csv',
  filters: Omit<ReceiptQuery, 'page' | 'pageSize'>,
): Promise<void> {
  const qs = buildQueryStringFromFilters(filters as ExportFilters);
  const fallback = formatExportFilename('recebimentos', format);
  const { blob, filename } = await fetchReportBlob(`/reports/receipts.${format}${qs}`, fallback);
  downloadBlob(blob, filename);
}

export async function exportCurrentAccounts(
  format: 'xlsx' | 'csv',
  filters: Omit<CurrentAccountQuery, 'page' | 'pageSize'>,
): Promise<void> {
  const qs = buildQueryStringFromFilters(filters as ExportFilters);
  const fallback = formatExportFilename('conta_corrente', format);
  const { blob, filename } = await fetchReportBlob(`/reports/current-accounts.${format}${qs}`, fallback);
  downloadBlob(blob, filename);
}

export async function exportCurrentAccountMovements(
  accountId: string,
  format: 'xlsx' | 'csv',
  filters: Omit<MovementQuery, 'page' | 'pageSize'>,
): Promise<void> {
  const qs = buildQueryStringFromFilters(filters as ExportFilters);
  const fallback = formatExportFilename('extrato_conta_corrente', format, accountId.slice(0, 8));
  const { blob, filename } = await fetchReportBlob(
    `/reports/current-accounts/${accountId}/movements.${format}${qs}`,
    fallback,
  );
  downloadBlob(blob, filename);
}

export async function exportAudit(
  format: 'xlsx' | 'csv',
  filters: Omit<AuditQuery, 'page' | 'pageSize'>,
): Promise<void> {
  const qs = buildQueryStringFromFilters(filters as ExportFilters);
  const fallback = formatExportFilename('auditoria', format);
  const { blob, filename } = await fetchReportBlob(`/reports/audit.${format}${qs}`, fallback);
  downloadBlob(blob, filename);
}

export async function exportDashboard(filters: DashboardQuery): Promise<void> {
  const qs = buildQueryStringFromFilters(filters as ExportFilters);
  const fallback = formatExportFilename('dashboard', 'xlsx');
  const { blob, filename } = await fetchReportBlob(`/reports/dashboard.xlsx${qs}`, fallback);
  downloadBlob(blob, filename);
}
