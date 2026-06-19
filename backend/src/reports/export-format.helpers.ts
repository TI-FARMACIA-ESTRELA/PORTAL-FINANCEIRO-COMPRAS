import ExcelJS from 'exceljs';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'refreshToken',
  'accessToken',
  'authorization',
]);

export function formatDateBr(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTimeBr(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  const date = formatDateBr(d);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${date} ${h}:${m}:${s}`;
}

export function formatCompetenceBr(competence: string | null | undefined): string {
  if (!competence) return '';
  const match = /^(\d{4})-(\d{2})$/.exec(competence);
  if (!match) return competence;
  return `${match[2]}/${match[1]}`;
}

export function formatMoneyBr(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(n) ? null : n;
}

export function sanitizeJsonForExport(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  const clean = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(clean);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k)) continue;
      out[k] = clean(v);
    }
    return out;
  };
  try {
    return JSON.stringify(clean(value));
  } catch {
    return '';
  }
}

function escapeCsvField(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[;\r\n"]/u.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsv(headers: string[], rows: unknown[][]): Buffer {
  const lines = [
    headers.map(escapeCsvField).join(';'),
    ...rows.map((row) => row.map(escapeCsvField).join(';')),
  ];
  const content = lines.join('\r\n');
  return Buffer.from(`\uFEFF${content}`, 'utf8');
}

export interface ExportSheet {
  name: string;
  headers: string[];
  rows: unknown[][];
  moneyColumnIndexes?: number[];
}

export async function buildXlsx(sheets: ExportSheet[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Portal Financeiro Comercial';
  workbook.created = new Date();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name.slice(0, 31));
    ws.addRow(sheet.headers);
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle' };

    for (const row of sheet.rows) {
      const excelRow = ws.addRow(row);
      if (sheet.moneyColumnIndexes) {
        for (const idx of sheet.moneyColumnIndexes) {
          const cell = excelRow.getCell(idx + 1);
          const num = toNumber(cell.value as string | number);
          if (num !== null) {
            cell.value = num;
            cell.numFmt = '"R$"#,##0.00';
          }
        }
      }
    }

    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.headers.length },
    };

    sheet.headers.forEach((_, i) => {
      const col = ws.getColumn(i + 1);
      col.width = Math.min(40, Math.max(12, String(sheet.headers[i]).length + 4));
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function todayFilenameSuffix(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
