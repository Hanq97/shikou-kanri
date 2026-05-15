/**
 * Unit tests for StalenessChecker
 * @module core/feedback/__tests__/staleness-checker.test.js
 */

const StalenessChecker = require('../staleness-checker');

describe('StalenessChecker', () => {
  describe('isStale', () => {
    test('returns false for null pattern', () => {
      expect(StalenessChecker.isStale(null)).toBe(false);
    });

    test('returns false for pattern without lastUsedAt', () => {
      expect(StalenessChecker.isStale({ id: 'test' })).toBe(false);
    });

    test('returns false for recently used pattern', () => {
      const now = new Date();
      const pattern = {
        id: 'test',
        lastUsedAt: now.toISOString()
      };
      expect(StalenessChecker.isStale(pattern)).toBe(false);
    });

    test('returns true for pattern not used in 31+ days', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      const pattern = {
        id: 'test',
        lastUsedAt: oldDate.toISOString()
      };
      expect(StalenessChecker.isStale(pattern)).toBe(true);
    });

    test('returns false for pattern used exactly 30 days ago', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);
      const pattern = {
        id: 'test',
        lastUsedAt: oldDate.toISOString()
      };
      expect(StalenessChecker.isStale(pattern)).toBe(false);
    });
  });

  describe('isDeprecated', () => {
    test('returns false for null pattern', () => {
      expect(StalenessChecker.isDeprecated(null)).toBe(false);
    });

    test('returns false for pattern with insufficient validations', () => {
      const pattern = {
        id: 'test',
        successCount: 1,
        failureCount: 1,
        successRate: 0.5
      };
      expect(StalenessChecker.isDeprecated(pattern)).toBe(false);
    });

    test('returns true for pattern with low success rate and enough validations', () => {
      const pattern = {
        id: 'test',
        successCount: 1,
        failureCount: 3,
        successRate: 0.25
      };
      expect(StalenessChecker.isDeprecated(pattern)).toBe(true);
    });

    test('returns false for pattern with high success rate', () => {
      const pattern = {
        id: 'test',
        successCount: 4,
        failureCount: 1,
        successRate: 0.8
      };
      expect(StalenessChecker.isDeprecated(pattern)).toBe(false);
    });

    test('calculates success rate from counts if not provided', () => {
      const pattern = {
        id: 'test',
        successCount: 1,
        failureCount: 4
        // successRate not provided
      };
      expect(StalenessChecker.isDeprecated(pattern)).toBe(true);
    });
  });

  describe('checkStaleness', () => {
    test('returns empty array for non-array input', () => {
      expect(StalenessChecker.checkStaleness(null)).toEqual([]);
      expect(StalenessChecker.checkStaleness('invalid')).toEqual([]);
    });

    test('marks stale patterns', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);

      const patterns = [
        { id: 'fresh', status: 'active', lastUsedAt: new Date().toISOString() },
        { id: 'stale', status: 'active', lastUsedAt: oldDate.toISOString() }
      ];

      const result = StalenessChecker.checkStaleness(patterns);

      expect(result[0].status).toBe('active');
      expect(result[1].status).toBe('stale');
    });

    test('reactivates patterns used again', () => {
      const patterns = [
        { id: 'reactivated', status: 'stale', lastUsedAt: new Date().toISOString() }
      ];

      const result = StalenessChecker.checkStaleness(patterns);

      expect(result[0].status).toBe('active');
    });

    test('updates daysSinceLastUse', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const patterns = [
        { id: 'test', status: 'active', lastUsedAt: oldDate.toISOString() }
      ];

      const result = StalenessChecker.checkStaleness(patterns);

      expect(result[0].daysSinceLastUse).toBe(10);
    });
  });

  describe('checkDeprecation', () => {
    test('returns empty array for non-array input', () => {
      expect(StalenessChecker.checkDeprecation(null)).toEqual([]);
    });

    test('marks deprecated patterns', () => {
      const patterns = [
        { id: 'good', successCount: 5, failureCount: 0, successRate: 1.0 },
        { id: 'bad', successCount: 1, failureCount: 5, successRate: 0.167 }
      ];

      const result = StalenessChecker.checkDeprecation(patterns);

      expect(result[0].status).toBeUndefined();
      expect(result[1].status).toBe('deprecated');
    });
  });

  describe('check (combined)', () => {
    test('returns empty array for non-array input', () => {
      expect(StalenessChecker.check(null)).toEqual([]);
    });

    test('deprecation takes priority over staleness', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);

      const patterns = [
        {
          id: 'both',
          status: 'active',
          lastUsedAt: oldDate.toISOString(),
          successCount: 1,
          failureCount: 5,
          successRate: 0.167
        }
      ];

      const result = StalenessChecker.check(patterns);

      // Should be deprecated (not stale) because deprecation is checked second
      expect(result[0].status).toBe('deprecated');
    });
  });

  describe('getSummary', () => {
    test('returns zeros for non-array input', () => {
      const result = StalenessChecker.getSummary(null);
      expect(result).toEqual({ active: 0, stale: 0, deprecated: 0, total: 0 });
    });

    test('counts patterns by status', () => {
      const patterns = [
        { id: 'a1', status: 'active' },
        { id: 'a2', status: 'active' },
        { id: 's1', status: 'stale' },
        { id: 'd1', status: 'deprecated' },
        { id: 'u1' } // no status defaults to active
      ];

      const result = StalenessChecker.getSummary(patterns);

      expect(result).toEqual({
        active: 3,
        stale: 1,
        deprecated: 1,
        total: 5
      });
    });
  });

  describe('filterByStatus', () => {
    test('returns empty array for non-array input', () => {
      expect(StalenessChecker.filterByStatus(null, 'active')).toEqual([]);
    });

    test('filters by active status', () => {
      const patterns = [
        { id: 'a1', status: 'active' },
        { id: 's1', status: 'stale' },
        { id: 'a2', status: 'active' }
      ];

      const result = StalenessChecker.filterByStatus(patterns, 'active');

      expect(result).toHaveLength(2);
      expect(result.map(p => p.id)).toEqual(['a1', 'a2']);
    });

    test('treats missing status as active', () => {
      const patterns = [
        { id: 'a1', status: 'active' },
        { id: 'u1' }, // no status
        { id: 's1', status: 'stale' }
      ];

      const result = StalenessChecker.filterByStatus(patterns, 'active');

      expect(result).toHaveLength(2);
    });
  });

  describe('Constants', () => {
    test('STALE_THRESHOLD_DAYS is 30', () => {
      expect(StalenessChecker.STALE_THRESHOLD_DAYS).toBe(30);
    });

    test('DEPRECATION_THRESHOLD is 0.6', () => {
      expect(StalenessChecker.DEPRECATION_THRESHOLD).toBe(0.6);
    });

    test('MIN_VALIDATIONS_FOR_DEPRECATION is 3', () => {
      expect(StalenessChecker.MIN_VALIDATIONS_FOR_DEPRECATION).toBe(3);
    });
  });
});
