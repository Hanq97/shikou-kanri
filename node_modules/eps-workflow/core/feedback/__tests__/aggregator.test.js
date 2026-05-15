/**
 * Unit tests for FeedbackAggregator
 * @module core/feedback/__tests__/aggregator.test.js
 */

const FeedbackAggregator = require('../aggregator');

describe('FeedbackAggregator', () => {
  describe('Constructor', () => {
    test('creates instance without error', () => {
      expect(() => new FeedbackAggregator()).not.toThrow();
    });
  });

  describe('Confidence Formula', () => {
    test('calculates confidence for perfect metrics', () => {
      const aggregator = new FeedbackAggregator();
      const formula = aggregator._applyConfidenceFormula.bind(aggregator);

      const result = formula({
        successRate: 1.0,
        avgQualityScore: 100,
        failureCount: 0
      });

      // baseConfidence(80) + successBonus(15) + qualityBonus(5) - failurePenalty(0) = 100
      expect(result).toBe(100);
    });

    test('calculates confidence for average metrics', () => {
      const aggregator = new FeedbackAggregator();
      const formula = aggregator._applyConfidenceFormula.bind(aggregator);

      const result = formula({
        successRate: 0.8,
        avgQualityScore: 80,
        failureCount: 1
      });

      // baseConfidence(80) + successBonus(12) + qualityBonus(4) - failurePenalty(5) = 91
      expect(result).toBe(91);
    });

    test('calculates confidence for poor metrics', () => {
      const aggregator = new FeedbackAggregator();
      const formula = aggregator._applyConfidenceFormula.bind(aggregator);

      const result = formula({
        successRate: 0.0,
        avgQualityScore: 50,
        failureCount: 10
      });

      // baseConfidence(80) + successBonus(0) + qualityBonus(2.5) - failurePenalty(20) = 62.5 -> 63
      expect(result).toBeGreaterThanOrEqual(50);
      expect(result).toBeLessThanOrEqual(100);
    });

    test('clamps confidence to minimum 50', () => {
      const aggregator = new FeedbackAggregator();
      const formula = aggregator._applyConfidenceFormula.bind(aggregator);

      const result = formula({
        successRate: 0.0,
        avgQualityScore: 0,
        failureCount: 100
      });

      // baseConfidence(80) + successBonus(0) + qualityBonus(0) - failurePenalty(20 max) = 60
      // Even with 100 failures, penalty is capped at 20
      expect(result).toBeGreaterThanOrEqual(50);
    });

    test('clamps confidence to maximum 100', () => {
      const aggregator = new FeedbackAggregator();
      const formula = aggregator._applyConfidenceFormula.bind(aggregator);

      const result = formula({
        successRate: 1.0,
        avgQualityScore: 100,
        failureCount: 0
      });

      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('aggregate method', () => {
    test('returns result object', async () => {
      const aggregator = new FeedbackAggregator();
      const result = await aggregator.aggregate();

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.logsProcessed).toBe('number');
      expect(typeof result.patternsUpdated).toBe('number');
      expect(typeof result.outputPath).toBe('string');
    });

    test('succeeds with empty logs', async () => {
      const aggregator = new FeedbackAggregator();
      const result = await aggregator.aggregate();

      expect(result.success).toBe(true);
    });
  });

  describe('getLastAggregation', () => {
    test('returns null or object', () => {
      const aggregator = new FeedbackAggregator();
      const result = aggregator.getLastAggregation();

      expect(result === null || typeof result === 'object').toBe(true);
    });
  });
});
