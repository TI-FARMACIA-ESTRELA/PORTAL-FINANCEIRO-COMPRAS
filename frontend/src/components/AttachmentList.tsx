import {
  PaperClipIcon,
  ArrowDownTrayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { EmptyState } from './EmptyState';

export interface AttachmentItem {
  id: string;
  fileName: string;
  sizeBytes?: number;
  url?: string;
}

interface AttachmentListProps {
  items: AttachmentItem[];
  onDownload?: (item: AttachmentItem) => void;
  onRemove?: (item: AttachmentItem) => void;
  emptyText?: string;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({
  items,
  onDownload,
  onRemove,
  emptyText = 'Nenhum anexo adicionado.',
}: AttachmentListProps) {
  if (items.length === 0) {
    return (
      <EmptyState title="Sem anexos" description={emptyText} icon={PaperClipIcon} />
    );
  }

  return (
    <ul className="divide-y divide-gray-100 rounded-lg ring-1 ring-gray-900/5">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <PaperClipIcon className="h-5 w-5 flex-none text-gray-400" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-700">{item.fileName}</p>
              {item.sizeBytes ? (
                <p className="text-xs text-gray-400">{formatSize(item.sizeBytes)}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onDownload ? (
              <button
                type="button"
                onClick={() => onDownload(item)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
                aria-label="Baixar anexo"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
              </button>
            ) : null}
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Remover anexo"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
