import clsx, { type ClassValue } from 'clsx';

/** Helper para compor classes condicionais do Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
