/**
 * StalenessChecker - Utility for checking pattern staleness and deprecation
 * @module core/feedback/staleness-checker
 *
 * Pattern: Utility (static methods)
 * Reference: Detail Design Section 3.5
 */

class StalenessChecker {
  /** Days without use before pattern is marked stale */
  static STALE_THRESHOLD_DAYS = 30;

  /** Success rate below which pattern is deprecated */
  static DEPRECATION_THRESHOLD = 0.6;

  /** Minimum validations needed for deprecation decision */
  static MIN_VALIDATIONS_FOR_DEPRECATION = 3;

  /**
   * Calculate days since last use
   * @param {string} lastUsedAt - ISO 8601 timestamp
   * @returns {number} Days since last use
   * @private
   */
  static _calculateDaysSinceLastUse(lastUsedAt) {
    if (!lastUsedAt) {
      return Infinity;
    }

    const lastUsed = new Date(lastUsedAt);
    const now = new Date();
    const diffMs = now.getTime() - lastUsed.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return Math.floor(diffDays);
  }

  /**
   * Check if a single pattern is stale
   * @param {object} pattern - Pattern metrics
   * @returns {boolean}
   */
  static isStale(pattern) {
    if (!pattern || !pattern.lastUsedAt) {
      return false;
    }

    const daysSince = this._calculateDaysSinceLastUse(pattern.lastUsedAt);
    return daysSince > this.STALE_THRESHOLD_DAYS;
  }

  /**
   * Check if a single pattern is deprecated
   * @param {object} pattern - Pattern metrics
   * @returns {boolean}
   */
  static isDeprecated(pattern) {
    if (!pattern) {
      return false;
    }

    const totalValidations = (pattern.successCount || 0) + (pattern.failureCount || 0);

    // Need enough data points to make deprecation decision
    if (totalValidations < this.MIN_VALIDATIONS_FOR_DEPRECATION) {
      return false;
    }

    // Calculate success rate
    const successRate = pattern.successRate !== undefined
      ? pattern.successRate
      : (pattern.successCount / totalValidations);

    return successRate < this.DEPRECATION_THRESHOLD;
  }

  /**
   * Check and update staleness status for patterns
   * @param {Array<object>} patterns - Array of pattern metrics
   * @returns {Array<object>} Updated patterns with staleness status
   */
  static checkStaleness(patterns) {
    if (!Array.isArray(patterns)) {
      return [];
    }

    return patterns.map(pattern => {
      const updated = { ...pattern };

      if (this.isStale(pattern)) {
        // Only mark stale if currently active
        if (updated.status === 'active') {
          updated.status = 'stale';
        }
      } else if (updated.status === 'stale') {
        // If used again within threshold, reactivate
        updated.status = 'active';
      }

      // Update daysSinceLastUse
      updated.daysSinceLastUse = this._calculateDaysSinceLastUse(pattern.lastUsedAt);

      return updated;
    });
  }

  /**
   * Check and update deprecation status for patterns
   * @param {Array<object>} patterns - Array of pattern metrics
   * @returns {Array<object>} Updated patterns with deprecation status
   */
  static checkDeprecation(patterns) {
    if (!Array.isArray(patterns)) {
      return [];
    }

    return patterns.map(pattern => {
      const updated = { ...pattern };

      if (this.isDeprecated(pattern)) {
        updated.status = 'deprecated';
      }

      return updated;
    });
  }

  /**
   * Run all checks (staleness + deprecation)
   * @param {Array<object>} patterns - Array of pattern metrics
   * @returns {Array<object>} Updated patterns with all statuses
   */
  static check(patterns) {
    if (!Array.isArray(patterns)) {
      return [];
    }

    // First check staleness
    let updated = this.checkStaleness(patterns);

    // Then check deprecation (deprecation takes priority over staleness)
    updated = this.checkDeprecation(updated);

    return updated;
  }

  /**
   * Get summary of pattern statuses
   * @param {Array<object>} patterns - Array of pattern metrics
   * @returns {{ active: number, stale: number, deprecated: number, total: number }}
   */
  static getSummary(patterns) {
    if (!Array.isArray(patterns)) {
      return { active: 0, stale: 0, deprecated: 0, total: 0 };
    }

    const summary = {
      active: 0,
      stale: 0,
      deprecated: 0,
      total: patterns.length
    };

    for (const pattern of patterns) {
      const status = pattern.status || 'active';
      if (summary[status] !== undefined) {
        summary[status]++;
      } else {
        summary.active++;
      }
    }

    return summary;
  }

  /**
   * Filter patterns by status
   * @param {Array<object>} patterns - Array of pattern metrics
   * @param {string} status - Status to filter ('active' | 'stale' | 'deprecated')
   * @returns {Array<object>} Filtered patterns
   */
  static filterByStatus(patterns, status) {
    if (!Array.isArray(patterns)) {
      return [];
    }

    return patterns.filter(p => (p.status || 'active') === status);
  }
}

module.exports = StalenessChecker;
