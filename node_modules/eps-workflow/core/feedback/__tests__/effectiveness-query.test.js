/**
 * Unit tests for EffectivenessQuery
 * @module core/feedback/__tests__/effectiveness-query.test.js
 */

const EffectivenessQuery = require('../effectiveness-query');

describe('EffectivenessQuery', () => {
  beforeEach(() => {
    // Reset singleton between tests
    EffectivenessQuery._resetInstance();
  });

  describe('Singleton Pattern', () => {
    test('getInstance returns same instance', () => {
      const instance1 = EffectivenessQuery.getInstance();
      const instance2 = EffectivenessQuery.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('constructor returns existing instance', () => {
      const instance1 = new EffectivenessQuery();
      const instance2 = new EffectivenessQuery();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Pattern ID Normalization', () => {
    test('normalizes pattern ID correctly', () => {
      const query = EffectivenessQuery.getInstance();
      // Access private method through prototype
      const normalize = query._normalizePatternId.bind(query);

      expect(normalize('My Pattern')).toBe('my-pattern');
      expect(normalize('  SPACES  ')).toBe('spaces');
      expect(normalize('Test@#$123')).toBe('test123');
      expect(normalize('a-b-c')).toBe('a-b-c');
    });

    test('handles invalid input', () => {
      const query = EffectivenessQuery.getInstance();
      const normalize = query._normalizePatternId.bind(query);

      expect(normalize(null)).toBe('');
      expect(normalize(undefined)).toBe('');
      expect(normalize(123)).toBe('');
    });
  });

  describe('getPattern', () => {
    test('returns null for unknown pattern when no data', () => {
      const query = EffectivenessQuery.getInstance();
      const pattern = query.getPattern('unknown-pattern');
      expect(pattern).toBeNull();
    });

    test('returns null for invalid input', () => {
      const query = EffectivenessQuery.getInstance();
      expect(query.getPattern(null)).toBeNull();
      expect(query.getPattern('')).toBeNull();
    });
  });

  describe('getBoostFactor', () => {
    test('returns 1.0 for unknown pattern', () => {
      const query = EffectivenessQuery.getInstance();
      const boost = query.getBoostFactor('unknown-pattern');
      expect(boost).toBe(1.0);
    });
  });

  describe('getAllPatterns', () => {
    test('returns empty array when no data file', () => {
      const query = EffectivenessQuery.getInstance();
      query.invalidateCache();

      // When file doesn't exist or is empty, should return empty array
      const patterns = query.getAllPatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('getActivePatterns', () => {
    test('returns empty array when no active patterns', () => {
      const query = EffectivenessQuery.getInstance();
      query.invalidateCache();

      const patterns = query.getActivePatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });

    test('accepts filter options', () => {
      const query = EffectivenessQuery.getInstance();

      // Should not throw with any options
      expect(() => {
        query.getActivePatterns({ minConfidence: 80 });
        query.getActivePatterns({ category: 'backend' });
        query.getActivePatterns({ limit: 5 });
        query.getActivePatterns({ sortBy: 'usageCount', sortOrder: 'asc' });
      }).not.toThrow();
    });
  });

  describe('getDeprecatedPatterns', () => {
    test('returns array', () => {
      const query = EffectivenessQuery.getInstance();
      const patterns = query.getDeprecatedPatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('getStalePatterns', () => {
    test('returns array', () => {
      const query = EffectivenessQuery.getInstance();
      const patterns = query.getStalePatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('getSummary', () => {
    test('returns summary object', () => {
      const query = EffectivenessQuery.getInstance();
      const summary = query.getSummary();

      expect(typeof summary).toBe('object');
      expect(typeof summary.totalPatterns).toBe('number');
      expect(typeof summary.active).toBe('number');
      expect(typeof summary.stale).toBe('number');
      expect(typeof summary.deprecated).toBe('number');
    });
  });

  describe('hasData', () => {
    test('returns boolean', () => {
      const query = EffectivenessQuery.getInstance();
      const hasData = query.hasData();
      expect(typeof hasData).toBe('boolean');
    });
  });

  describe('getPatternsByCategory', () => {
    test('returns empty array for null category', () => {
      const query = EffectivenessQuery.getInstance();
      expect(query.getPatternsByCategory(null)).toEqual([]);
    });

    test('returns array for valid category', () => {
      const query = EffectivenessQuery.getInstance();
      const patterns = query.getPatternsByCategory('backend');
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('getTopPatterns', () => {
    test('returns array', () => {
      const query = EffectivenessQuery.getInstance();
      const patterns = query.getTopPatterns(5);
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('searchPatterns', () => {
    test('returns empty for null query', () => {
      const query = EffectivenessQuery.getInstance();
      expect(query.searchPatterns(null)).toEqual([]);
    });

    test('returns empty for empty string', () => {
      const query = EffectivenessQuery.getInstance();
      expect(query.searchPatterns('')).toEqual([]);
    });

    test('returns array for valid query', () => {
      const query = EffectivenessQuery.getInstance();
      const patterns = query.searchPatterns('test');
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('invalidateCache', () => {
    test('does not throw', () => {
      const query = EffectivenessQuery.getInstance();
      expect(() => query.invalidateCache()).not.toThrow();
    });
  });

  describe('getLastAggregatedAt', () => {
    test('returns string or null', () => {
      const query = EffectivenessQuery.getInstance();
      const timestamp = query.getLastAggregatedAt();
      expect(timestamp === null || typeof timestamp === 'string').toBe(true);
    });
  });
});
