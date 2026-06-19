import { useRef, useState, type DragEvent } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface FileUploadProps {
  label?: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  onFilesSelected?: (files: File[]) => void;
  disabled?: boolean;
}

const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'msi', 'com', 'scr', 'js', 'jar'];

export function FileUpload({
  label = 'Anexos',
  hint = 'Arraste arquivos ou clique para selecionar. Não são permitidos executáveis.',
  accept = '.pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.doc,.docx',
  multiple = true,
  maxSizeMb = 10,
  onFilesSelected,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndEmit = (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (BLOCKED_EXTENSIONS.includes(ext)) {
        setError(`Arquivo não permitido: ${file.name}`);
        return;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(`Arquivo excede ${maxSizeMb}MB: ${file.name}`);
        return;
      }
    }
    setError(null);
    onFilesSelected?.(files);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    validateAndEmit(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      {label ? (
        <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      ) : null}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragging ? 'border-primary-400 bg-primary-50' : 'border-gray-300 bg-gray-50',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary-400',
        )}
      >
        <ArrowUpTrayIcon className="h-7 w-7 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-primary-600">Clique para enviar</span> ou arraste aqui
        </p>
        <p className="mt-1 text-xs text-gray-400">Até {maxSizeMb}MB por arquivo</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          disabled={disabled}
          onChange={(e) => validateAndEmit(e.target.files)}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}
