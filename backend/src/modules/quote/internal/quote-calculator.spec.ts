import { QuoteCalculator } from './quote-calculator';

describe('QuoteCalculator', () => {
  let calc: QuoteCalculator;

  beforeEach(() => {
    calc = new QuoteCalculator();
  });

  describe('lineAmount', () => {
    it('rounds unitPrice × quantity to integer (JPY)', () => {
      expect(calc.lineAmount(3000, 10.5)).toBe(31500);
      expect(calc.lineAmount(1234, 2.5)).toBe(3085);
    });

    it('supports negative unitPrice (discount lines)', () => {
      expect(calc.lineAmount(-50000, 1)).toBe(-50000);
    });

    it('handles string/Decimal inputs', () => {
      expect(calc.lineAmount('3000', '10')).toBe(30000);
    });
  });

  describe('computeQuoteTotals', () => {
    it('sums non-optional lines for subtotal + tax', () => {
      const result = calc.computeQuoteTotals([
        { amount: 100_000, taxRate: 0.1, isOptional: false },
        { amount: 200_000, taxRate: 0.1, isOptional: false },
      ]);
      expect(result.subtotal).toBe(300_000);
      expect(result.tax).toBe(30_000);
      expect(result.total).toBe(330_000);
      expect(result.optionalSubtotal).toBe(0);
    });

    it('excludes optional lines from subtotal/tax/total', () => {
      const result = calc.computeQuoteTotals([
        { amount: 100_000, taxRate: 0.1, isOptional: false },
        { amount: 50_000, taxRate: 0.1, isOptional: true },
      ]);
      expect(result.subtotal).toBe(100_000);
      expect(result.tax).toBe(10_000);
      expect(result.total).toBe(110_000);
      expect(result.optionalSubtotal).toBe(50_000);
    });

    it('handles mixed tax rates (10% + 8%)', () => {
      const result = calc.computeQuoteTotals([
        { amount: 100_000, taxRate: 0.1, isOptional: false },
        { amount: 50_000, taxRate: 0.08, isOptional: false },
      ]);
      expect(result.subtotal).toBe(150_000);
      // tax = round(100_000 × 0.1 + 50_000 × 0.08) = round(10_000 + 4_000) = 14_000
      expect(result.tax).toBe(14_000);
      expect(result.total).toBe(164_000);
    });

    it('rounds tax after sum (avoid cumulative rounding errors)', () => {
      const result = calc.computeQuoteTotals([
        { amount: 333, taxRate: 0.1, isOptional: false },
        { amount: 667, taxRate: 0.1, isOptional: false },
      ]);
      // amount × taxRate per line = 33.3 + 66.7 = 100 exact
      // (vs round each = 33 + 67 = 100 same here, but pattern matters for general cases)
      expect(result.subtotal).toBe(1_000);
      expect(result.tax).toBe(100);
    });

    it('handles empty lines (zero totals)', () => {
      const result = calc.computeQuoteTotals([]);
      expect(result.subtotal).toBe(0);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(0);
      expect(result.optionalSubtotal).toBe(0);
    });

    it('handles negative line amounts (discount)', () => {
      const result = calc.computeQuoteTotals([
        { amount: 100_000, taxRate: 0.1, isOptional: false },
        { amount: -10_000, taxRate: 0.1, isOptional: false },
      ]);
      expect(result.subtotal).toBe(90_000);
      expect(result.tax).toBe(9_000);
      expect(result.total).toBe(99_000);
    });
  });
});
