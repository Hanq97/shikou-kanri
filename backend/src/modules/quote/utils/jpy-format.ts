/**
 * Format number as JPY currency: 1234567 → "¥1,234,567"
 * Negative values: -50000 → "-¥50,000"
 */
export function formatJpy(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  const formatted = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
  return n < 0 ? `-${formatted}` : formatted;
}
