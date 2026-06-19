import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { EyeIcon } from '@heroicons/react/24/outline';
import {
  DataTable,
  FilterBar,
  ExportButtons,
  StatusBadge,
  Select,
  DateInput,
  type Column,
} from '@/components';
import { formatDateTime } from '@/utils/format';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listAuditLogs, type AuditLog, type AuditQuery } from './auditApi';
import { exportAudit } from '@/features/reports/reportsApi';
import {
  getActionLabel,
  actionVariant,
  actionFilterOptions,
  entityFilterOptions,
} from './auditMeta';
import { AuditDetailModal } from './AuditDetailModal';

const PAGE_SIZE = 20;

export function AuditPage() {
  const user = useCurrentUser();
  const canExport = user.role === 'ADMIN' || user.role === 'DIRETORIA';

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [userNumber, setUserNumber] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  // Volta para a primeira página sempre que um filtro muda.
  useEffect(() => {
    setPage(1);
  }, [search, action, entityType, userNumber, dateFrom, dateTo]);

  const query: AuditQuery = useMemo(
    () => ({
      search: search || undefined,
      action: action || undefined,
      entityType: entityType || undefined,
      userNumber: userNumber ? Number(userNumber) : undefined,
      // Inclui o dia inteiro no filtro final.
      dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
      dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, action, entityType, userNumber, dateFrom, dateTo, page],
  );

  const exportFilters = useMemo(
    () => ({
      search: query.search,
      action: query.action,
      entityType: query.entityType,
      userNumber: query.userNumber,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    }),
    [query],
  );

  const auditQuery = useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () => listAuditLogs(query),
    placeholderData: keepPreviousData,
  });

  const rows = auditQuery.data?.data ?? [];
  const total = auditQuery.data?.total ?? 0;

  const columns: Column<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'Data/Hora',
      render: (r) => <span className="text-gray-900">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: 'user',
      header: 'Usuário',
      render: (r) =>
        r.user ? (
          <span>
            <span className="font-medium text-gray-900">#{r.user.userNumber}</span> · {r.user.name}
          </span>
        ) : (
          <span className="text-gray-400">Sistema/—</span>
        ),
    },
    {
      key: 'action',
      header: 'Ação',
      render: (r) => (
        <StatusBadge label={getActionLabel(r.action)} variant={actionVariant[r.action] ?? 'gray'} />
      ),
    },
    { key: 'entityType', header: 'Entidade', render: (r) => r.entityType },
    {
      key: 'entityId',
      header: 'ID da entidade',
      render: (r) =>
        r.entityId ? (
          <span className="font-mono text-xs text-gray-500">{r.entityId.slice(0, 8)}…</span>
        ) : (
          '—'
        ),
    },
    {
      key: 'reason',
      header: 'Motivo',
      render: (r) =>
        r.reason ? (
          <span className="block max-w-[220px] truncate" title={r.reason}>
            {r.reason}
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'ipAddress', header: 'IP', render: (r) => r.ipAddress ?? '—' },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelected(r)}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
          title="Ver detalhes"
        >
          <EyeIcon className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Auditoria</h2>
        <p className="mt-1 text-sm text-gray-500">
          Registro append-only das ações críticas do sistema
        </p>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por ação, entidade, motivo ou IP..."
      >
        <div className="w-52">
          <Select
            options={actionFilterOptions}
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            options={entityFilterOptions}
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          />
        </div>
        <div className="w-36">
          <input
            type="number"
            min={1}
            value={userNumber}
            onChange={(e) => setUserNumber(e.target.value)}
            className="input-base"
            placeholder="Nº usuário"
          />
        </div>
        <div className="w-40">
          <DateInput value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="w-40">
          <DateInput value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        actions={
          canExport ? (
            <ExportButtons
              onExportXlsx={() => exportAudit('xlsx', exportFilters)}
              onExportCsv={() => exportAudit('csv', exportFilters)}
            />
          ) : undefined
        }
      </FilterBar>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        loading={auditQuery.isLoading}
        onRowClick={(r) => setSelected(r)}
        emptyTitle="Nenhum registro de auditoria"
        emptyDescription="Ajuste os filtros ou execute uma ação auditável no sistema."
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
      />

      <AuditDetailModal open={!!selected} log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
