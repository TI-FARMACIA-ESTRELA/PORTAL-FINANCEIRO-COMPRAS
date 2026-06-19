import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Formata um número como moeda brasileira (R$). */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/** Formata data ISO/Date para dd/MM/yyyy. */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

/** Formata data/hora ISO/Date para dd/MM/yyyy HH:mm:ss. */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
}

/** Converte competência AAAA-MM para exibição MM/AAAA. */
export function formatCompetence(competence: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(competence);
  if (!match) return competence;
  return `${match[2]}/${match[1]}`;
}

/** Formata um CNPJ (com dígitos) como XX.XXX.XXX/XXXX-XX. Retorna o original se inválido. */
export function formatCnpj(value: string | null | undefined): string {
  if (!value) return '—';
  const d = value.replace(/\D/g, '');
  if (d.length !== 14) return value;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

/** Formata número inteiro/decimal no padrão brasileiro. */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
