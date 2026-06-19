import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { extractApiError } from '@/services/api/client';

interface ExportButtonsProps {
  onExportXlsx?: () => Promise<void>;
  onExportCsv?: () => Promise<void>;
  showCsv?: boolean;
  showXlsx?: boolean;
  disabled?: boolean;
}

export function ExportButtons({
  onExportXlsx,
  onExportCsv,
  showCsv = true,
  showXlsx = true,
  disabled = false,
}: ExportButtonsProps) {
  const [loading, setLoading] = useState<'xlsx' | 'csv' | null>(null);

  const run = async (format: 'xlsx' | 'csv', fn?: () => Promise<void>) => {
    if (!fn || disabled) return;
    setLoading(format);
    try {
      await fn();
      toast.success(format === 'xlsx' ? 'Excel exportado' : 'CSV exportado');
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao exportar.'));
    } finally {
      setLoading(null);
    }
  };

  if (!showXlsx && !showCsv) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showXlsx && onExportXlsx ? (
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={disabled || loading !== null}
          onClick={() => run('xlsx', onExportXlsx)}
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {loading === 'xlsx' ? 'Exportando...' : 'Exportar Excel'}
        </button>
      ) : null}
      {showCsv && onExportCsv ? (
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={disabled || loading !== null}
          onClick={() => run('csv', onExportCsv)}
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {loading === 'csv' ? 'Exportando...' : 'Exportar CSV'}
        </button>
      ) : null}
    </div>
  );
}
