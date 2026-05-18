import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

export interface QuoteTotals {
  subtotal: number;
  tax: number;
  total: number;
  optionalSubtotal: number;
}

type DecimalLike = number | string | Decimal;

@Injectable()
export class QuoteCalculator {
  /**
   * Compute line amount = ROUND(unitPrice × quantity).
   * JPY no decimals at amount level.
   * Negative unitPrice supported for discount lines.
   */
  lineAmount(unitPrice: DecimalLike, quantity: DecimalLike): number {
    const up = Number(unitPrice);
    const q = Number(quantity);
    return Math.round(up * q);
  }

  /**
   * Compute quote totals from lines.
   * - subtotal: sum of amount where !isOptional
   * - tax: round(sum(amount × tax_rate where !isOptional)) — round once at end
   * - total: subtotal + tax
   * - optionalSubtotal: sum where isOptional (separate, not in total)
   */
  computeQuoteTotals(
    lines: Array<{
      amount: DecimalLike;
      taxRate: DecimalLike;
      isOptional: boolean;
    }>,
  ): QuoteTotals {
    let subtotal = 0;
    let taxAccumulator = 0;
    let optionalSubtotal = 0;

    for (const line of lines) {
      const amt = Number(line.amount);
      const rate = Number(line.taxRate);
      if (line.isOptional) {
        optionalSubtotal += amt;
      } else {
        subtotal += amt;
        taxAccumulator += amt * rate;
      }
    }

    const tax = Math.round(taxAccumulator);
    const total = subtotal + tax;
    return { subtotal, tax, total, optionalSubtotal };
  }
}
