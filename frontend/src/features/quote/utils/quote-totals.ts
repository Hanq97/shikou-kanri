import type { QuoteLineFormValues } from '../schemas/quote.schema';

export interface QuoteTotals {
  subtotal: number;
  tax: number;
  total: number;
  optionalSubtotal: number;
}

function lineAmount(line: Pick<QuoteLineFormValues, 'quantity' | 'unitPrice'>): number {
  return Math.round(Number(line.quantity) * Number(line.unitPrice));
}

function lineTax(line: Pick<QuoteLineFormValues, 'quantity' | 'unitPrice' | 'taxRate'>): number {
  return Math.round(lineAmount(line) * Number(line.taxRate));
}

export function computeQuoteTotals(lines: QuoteLineFormValues[]): QuoteTotals {
  const required = lines.filter((l) => !l.isOptional);
  const optional = lines.filter((l) => l.isOptional);
  const subtotal = required.reduce((s, l) => s + lineAmount(l), 0);
  const tax = required.reduce((s, l) => s + lineTax(l), 0);
  const optionalSubtotal = optional.reduce((s, l) => s + lineAmount(l), 0);
  return { subtotal, tax, total: subtotal + tax, optionalSubtotal };
}
