import { Modal, StatusBadge } from '@/components';
import { formatDateTime } from '@/utils/format';
import { roleLabel } from '@/layouts/roleBadge';
import { getActionLabel, actionVariant } from './auditMeta';
import type { AuditLog } from './auditApi';

interface AuditDetailModalProps {
  open: boolean;
  log: AuditLog | null;
  onClose: () => void;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'string' && value in roleLabel) {
    return roleLabel[value as keyof typeof roleLabel];
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function ValuesBlock({
  title,
  values,
  tone,
}: {
  title: string;
  values: Record<string, unknown> | null;
  tone: 'old' | 'new';
}) {
  const entries = values ? Object.entries(values) : [];
  return (
    <div className="flex-1">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      {entries.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-400">Sem dados</p>
      ) : (
        <dl
          className={
            tone === 'old'
              ? 'space-y-1 rounded-lg bg-red-50/60 p-3 ring-1 ring-red-600/10'
              : 'space-y-1 rounded-lg bg-green-50/60 p-3 ring-1 ring-green-600/10'
          }
        >
          {entries.map(([key, value]) => (
            <div key={key} className="flex justify-between gap-3 text-sm">
              <dt className="font-medium text-gray-600">{key}</dt>
              <dd className="whitespace-pre-wrap text-right text-gray-900">{formatValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function AuditDetailModal({ open, log, onClose }: AuditDetailModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Detalhe do registro de auditoria" size="lg">
      {log ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Data/Hora" value={formatDateTime(log.createdAt)} />
            <Field
              label="Usuário"
              value={log.user ? `#${log.user.userNumber} · ${log.user.name}` : 'Sistema/—'}
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ação</p>
              <div className="mt-1">
                <StatusBadge
                  label={getActionLabel(log.action)}
                  variant={actionVariant[log.action] ?? 'gray'}
                />
              </div>
            </div>
            <Field label="Entidade" value={log.entityType} />
            <Field label="ID da entidade" value={log.entityId ?? '—'} />
            <Field label="IP" value={log.ipAddress ?? '—'} />
            <Field label="Motivo" value={log.reason ?? '—'} className="sm:col-span-2" />
            <Field label="User-Agent" value={log.userAgent ?? '—'} className="sm:col-span-2" />
          </div>

          {(log.oldValues || log.newValues) && (
            <div className="flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row">
              <ValuesBlock title="Valores anteriores" values={log.oldValues} tone="old" />
              <ValuesBlock title="Valores novos" values={log.newValues} tone="new" />
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm text-gray-900">{value}</p>
    </div>
  );
}
