/** Baixa um Blob com nome de arquivo sugerido. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const EXPORT_SKIP_KEYS = new Set(['page', 'pageSize', 'sortBy', 'sortDir']);

/** Monta query string a partir dos filtros ativos (ignora vazios e paginação). */
export function buildQueryStringFromFilters(
  filters: Record<string, string | number | boolean | undefined | null>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (EXPORT_SKIP_KEYS.has(key)) continue;
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Nome de arquivo de exportação com data atual (YYYY-MM-DD). */
export function formatExportFilename(prefix: string, ext: 'xlsx' | 'csv', suffix?: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const base = suffix ? `${prefix}_${suffix}_${date}` : `${prefix}_${date}`;
  return `${base}.${ext}`;
}

/** Extrai nome de arquivo do header Content-Disposition, se presente. */
export function parseContentDispositionFilename(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = /filename="([^"]+)"/i.exec(header);
  return match?.[1] ?? fallback;
}
