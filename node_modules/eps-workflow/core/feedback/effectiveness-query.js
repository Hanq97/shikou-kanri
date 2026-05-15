/**
 * EffectivenessQuery - Read-only query interface for pattern effectiveness
 * @module core/feedback/effectiveness-query
 *
 * Pattern: Singleton + Cache
 * Reference: Detail Design Section 3.4
 */

const fs = require('fs');
const path = require('path');

// File paths
const EFFECTIVENESS_FILE = path.resolve(__dirname, '../../feedback-aggregated/pattern-effectiveness.json');

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

class EffectivenessQuery {
  /** @type {EffectivenessQuery | null} */
  static _instance = null;

  /** @type {object | null} */
  _cache;

  /** @type {number} */
  _cacheTimestamp;

  constructor() {
    if (EffectivenessQuery._instance) {
      return EffectivenessQuery._instance;
    }
    this._cache = null;
    this._cacheTimestamp = 0;
    EffectivenessQuery._instance = this;
  }

  /**
   * Get singleton instance
   * @returns {EffectivenessQuery}
   */
  static getInstance() {
    if (!EffectivenessQuery._instance) {
      EffectivenessQuery._instance = new EffectivenessQuery();
    }
    return EffectivenessQuery._instance;
  }

  /**
   * Reset singleton (for testing only)
   * @private
   */
  static _resetInstance() {
    EffectivenessQuery._instance = null;
  }

  /**
   * Check if cache is valid
   * @returns {boolean}
   * @private
   */
  _isCacheValid() {
    if (!this._cache) {
      return false;
    }
    const now = Date.now();
    return (now - this._cacheTimestamp) < CACHE_TTL_MS;
  }

  /**
   * Load data from file (with caching)
   * @returns {object} Aggregated effectiveness data
   * @private
   */
  _loadData() {
    // Return cached data if valid
    if (this._isCacheValid()) {
      return this._cache;
    }

    // Load from file
    try {
      if (!fs.existsSync(EFFECTIVENESS_FILE)) {
        // Return empty structure if file doesn't exist
        this._cache = {
          version: '1.0',
          aggregatedAt: null,
          patterns: {},
          summary: { totalPatterns: 0, active: 0, stale: 0, deprecated: 0 }
        };
        this._cacheTimestamp = Date.now();
        return this._cache;
      }

      const content = fs.readFileSync(EFFECTIVENESS_FILE, 'utf8');
      this._cache = JSON.parse(content);
      this._cacheTimestamp = Date.now();
      return this._cache;
    } catch (error) {
      console.error(`[EffectivenessQuery] Failed to load data: ${error.message}`);
      // Return empty structure on error
      this._cache = {
        version: '1.0',
        aggregatedAt: null,
        patterns: {},
        summary: { totalPatterns: 0, active: 0, stale: 0, deprecated: 0 }
      };
      this._cacheTimestamp = Date.now();
      return this._cache;
    }
  }

  /**
   * Normalize pattern ID for lookup
   * @param {string} patternId - Raw pattern ID
   * @returns {string} Normalized ID
   * @private
   */
  _normalizePatternId(patternId) {
    if (!patternId || typeof patternId !== 'string') {
      return '';
    }
    return patternId
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Invalidate cache (force reload on next query)
   */
  invalidateCache() {
    this._cache = null;
    this._cacheTimestamp = 0;
  }

  /**
   * Get pattern effectiveness by ID
   * @param {string} patternId - Pattern ID (will be normalized)
   * @returns {object | null} Pattern metrics or null if not found
   */
  getPattern(patternId) {
    const normalizedId = this._normalizePatternId(patternId);
    if (!normalizedId) {
      return null;
    }

    const data = this._loadData();
    return data.patterns[normalizedId] || null;
  }

  /**
   * Get all patterns as array
   * @returns {Array<object>} All pattern metrics
   */
  getAllPatterns() {
    const data = this._loadData();
    return Object.values(data.patterns || {});
  }

  /**
   * Get active patterns (with optional filtering)
   * @param {object} [options] - Filter options
   * @param {number} [options.minConfidence] - Minimum confidence (default: 0)
   * @param {string} [options.category] - Filter by category
   * @param {number} [options.limit] - Maximum results (default: unlimited)
   * @param {string} [options.sortBy] - Sort field ('confidence' | 'usageCount' | 'successRate')
   * @param {string} [options.sortOrder] - Sort order ('asc' | 'desc', default: 'desc')
   * @returns {Array<object>} Filtered active patterns
   */
  getActivePatterns(options = {}) {
    const {
      minConfidence = 0,
      category,
      limit,
      sortBy = 'currentConfidence',
      sortOrder = 'desc'
    } = options;

    let patterns = this.getAllPatterns()
      .filter(p => p.status === 'active');

    // Apply confidence filter
    if (minConfidence > 0) {
      patterns = patterns.filter(p => (p.currentConfidence || 0) >= minConfidence);
    }

    // Apply category filter
    if (category) {
      patterns = patterns.filter(p => p.category === category);
    }

    // Sort
    const sortMultiplier = sortOrder === 'asc' ? 1 : -1;
    patterns.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return (aVal - bVal) * sortMultiplier;
    });

    // Apply limit
    if (limit && limit > 0) {
      patterns = patterns.slice(0, limit);
    }

    return patterns;
  }

  /**
   * Get deprecated patterns
   * @returns {Array<object>} Deprecated patterns
   */
  getDeprecatedPatterns() {
    return this.getAllPatterns()
      .filter(p => p.status === 'deprecated');
  }

  /**
   * Get stale patterns
   * @returns {Array<object>} Stale patterns
   */
  getStalePatterns() {
    return this.getAllPatterns()
      .filter(p => p.status === 'stale');
  }

  /**
   * Get boost factor for RAG integration
   * Formula: 0.5 + (confidence / 100) = range [0.5, 1.5]
   *
   * @param {string} patternId - Pattern ID
   * @returns {number} Boost factor (0.5 to 1.5, default 1.0 if not found)
   */
  getBoostFactor(patternId) {
    const pattern = this.getPattern(patternId);

    if (!pattern) {
      return 1.0; // Neutral boost for unknown patterns
    }

    // Deprecated patterns get minimum boost
    if (pattern.status === 'deprecated') {
      return 0.5;
    }

    // Stale patterns get reduced boost
    if (pattern.status === 'stale') {
      return 0.75;
    }

    // Active patterns: map confidence [50-100] to boost [0.5-1.5]
    const confidence = pattern.currentConfidence || 80;
    const normalizedConfidence = Math.max(50, Math.min(100, confidence));

    // Linear mapping: 50 -> 0.5, 100 -> 1.5
    return 0.5 + (normalizedConfidence / 100);
  }

  /**
   * Get summary statistics
   * @returns {object} Summary with counts by status
   */
  getSummary() {
    const data = this._loadData();
    return data.summary || { totalPatterns: 0, active: 0, stale: 0, deprecated: 0 };
  }

  /**
   * Get last aggregation timestamp
   * @returns {string | null} ISO timestamp or null
   */
  getLastAggregatedAt() {
    const data = this._loadData();
    return data.aggregatedAt || null;
  }

  /**
   * Check if data is available
   * @returns {boolean}
   */
  hasData() {
    const data = this._loadData();
    return Object.keys(data.patterns || {}).length > 0;
  }

  /**
   * Get patterns by category
   * @param {string} category - Category name
   * @returns {Array<object>} Patterns in category
   */
  getPatternsByCategory(category) {
    if (!category) {
      return [];
    }

    return this.getAllPatterns()
      .filter(p => p.category === category);
  }

  /**
   * Get top N patterns by confidence
   * @param {number} n - Number of patterns to return
   * @returns {Array<object>} Top N patterns
   */
  getTopPatterns(n = 10) {
    return this.getActivePatterns({
      sortBy: 'currentConfidence',
      sortOrder: 'desc',
      limit: n
    });
  }

  /**
   * Search patterns by name (partial match)
   * @param {string} query - Search query
   * @returns {Array<object>} Matching patterns
   */
  searchPatterns(query) {
    if (!query || typeof query !== 'string') {
      return [];
    }

    const normalizedQuery = query.toLowerCase();
    return this.getAllPatterns()
      .filter(p => {
        const name = (p.name || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        return name.includes(normalizedQuery) || id.includes(normalizedQuery);
      });
  }
}

module.exports = EffectivenessQuery;
