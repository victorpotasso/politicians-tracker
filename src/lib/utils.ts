import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NZD = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  maximumFractionDigits: 0,
});

/** Format a number as whole New Zealand dollars, e.g. `$12,345`. */
export function formatNZD(amount: number): string {
  return NZD.format(amount);
}

/** Compact currency for tight spaces, e.g. `$1.2M`, `$34k`. */
export function formatNZDCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `$${Math.round(amount / 1_000)}k`;
  return `$${Math.round(amount)}`;
}
