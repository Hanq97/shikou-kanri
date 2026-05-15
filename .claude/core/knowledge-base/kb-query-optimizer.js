/**
 * KBQueryOptimizer - Knowledge Base Query Optimizer
 *
 * Optimizes KB queries with:
 * - Lazy loading for KB JSON files
 * - Inverted index for fast keyword lookup
 * - Query result memoization
 * - Query plan optimization
 *
 * @version 3.9.0
 * @date 2025-12-25
 */

const fs = require('fs');
const path = require('path');
const QueryCache = require('../infrastructure/query-cache');

class KBQueryOptimizer {
  constructor(options = {}) {
    // Configuration
    this.config = {
      kbDir: options.kbDir || __dirname,
      enableCache: options.enableCache !== false,
      enableLazyLoad: options.enableLazyLoad !== false,
      cacheOptions: options.cacheOptions || {},
      ...options
    };

    // KB storage: filename → KB object
    this.loadedKBs = new Map();

    // Inverted index: keyword → Set([patternIds])
    this.indexes = new Map(); // filename → inverted index

    // Pattern storage: filename → Map(patternId → pattern)
    this.patterns = new Map();

    // Query cache
    this.queryCache = this.config.enableCache
      ? new QueryCache(this.config.cacheOptions)
      : null;

    // Statistics
    this.stats = {
      kbLoads: 0,
      indexBuilds: 0,
      cacheHits: 0,
      cacheMisses: 0,
      queryTime: []
    };
  }

  /**
   * Load KB file (with lazy loading)
   * @param {string} filename - KB filename
   * @returns {object} KB object
   */
  loadKB(filename) {
    // Check if already loaded
    if (this.loadedKBs.has(filename)) {
      return this.loadedKBs.get(filename);
    }

    // Lazy load from disk
    const kbPath = path.join(this.config.kbDir, filename);

    if (!fs.existsSync(kbPath)) {
      throw new Error(`KB file not found: ${kbPath}`);
    }

    const startTime = Date.now();
    const content = fs.readFileSync(kbPath, 'utf8');
    const kb = JSON.parse(content);
    const loadTime = Date.now() - startTime;

    // Store in memory
    this.loadedKBs.set(filename, kb);
    this.stats.kbLoads++;

    // Build inverted index
    this.buildIndex(filename, kb);

    console.log(`[KBQueryOptimizer] Loaded ${filename} in ${loadTime}ms`);

    return kb;
  }

  /**
   * Build inverted index for KB
   * @param {string} filename - KB filename
   * @param {object} kb - KB object
   */
  buildIndex(filename, kb) {
    const index = new Map(); // keyword → Set([patternIds])
    const patternMap = new Map(); // patternId → pattern

    for (let [patternId, pattern] of Object.entries(kb)) {
      // Skip metadata
      if (patternId === 'metadata') {
        continue;
      }

      // Store pattern
      patternMap.set(patternId, pattern);

      // Index each keyword
      const keywords = pattern.keywords || [];
      for (let keyword of keywords) {
        const keyLower = keyword.toLowerCase();

        if (!index.has(keyLower)) {
          index.set(keyLower, new Set());
        }

        index.get(keyLower).add(patternId);
      }
    }

    this.indexes.set(filename, index);
    this.patterns.set(filename, patternMap);
    this.stats.indexBuilds++;

    console.log(`[KBQueryOptimizer] Built index for ${filename}: ${index.size} keywords, ${patternMap.size} patterns`);
  }

  /**
   * Query KB using inverted index
   * @param {string} stepDescription - Step description to query
   * @param {string} filename - KB filename
   * @returns {object|null} Best matching pattern or null
   */
  query(stepDescription, filename) {
    const startTime = Date.now();

    // Check cache first
    if (this.queryCache) {
      const cached = this.queryCache.get(stepDescription, filename);
      if (cached !== null) {
        this.stats.cacheHits++;
        const queryTime = Date.now() - startTime;
        this.stats.queryTime.push(queryTime);
        return cached;
      }
      this.stats.cacheMisses++;
    }

    // Ensure KB is loaded
    if (!this.loadedKBs.has(filename)) {
      this.loadKB(filename);
    }

    // Get index and patterns
    const index = this.indexes.get(filename);
    const patternMap = this.patterns.get(filename);

    if (!index || !patternMap) {
      return null;
    }

    // Tokenize query
    const tokens = stepDescription.toLowerCase().split(/\s+/);

    // Find matching patterns using inverted index
    const matchCounts = new Map(); // patternId → match count

    for (let token of tokens) {
      if (index.has(token)) {
        for (let patternId of index.get(token)) {
          matchCounts.set(patternId, (matchCounts.get(patternId) || 0) + 1);
        }
      }
    }

    // No matches found
    if (matchCounts.size === 0) {
      const result = { confidence: 0 };

      // Cache negative result
      if (this.queryCache) {
        this.queryCache.set(stepDescription, filename, result);
      }

      const queryTime = Date.now() - startTime;
      this.stats.queryTime.push(queryTime);
      return result;
    }

    // Find best match by confidence and match count
    let bestMatch = null;
    let bestScore = 0;

    for (let [patternId, matchCount] of matchCounts.entries()) {
      const pattern = patternMap.get(patternId);

      // Score = confidence × (matchCount / totalKeywords)
      const totalKeywords = pattern.keywords?.length || 1;
      const score = pattern.confidence * (matchCount / totalKeywords);

      if (score > bestScore) {
        bestMatch = pattern;
        bestScore = score;
      }
    }

    // Cache result
    if (this.queryCache && bestMatch) {
      this.queryCache.set(stepDescription, filename, bestMatch);
    }

    const queryTime = Date.now() - startTime;
    this.stats.queryTime.push(queryTime);

    return bestMatch || { confidence: 0 };
  }

  /**
   * Preload all KBs
   * @param {Array<string>} filenames - KB filenames to preload
   */
  preloadKBs(filenames = ['backend-kb.json', 'frontend-kb.json', 'database-kb.json']) {
    console.log(`[KBQueryOptimizer] Preloading ${filenames.length} KBs...`);
    const startTime = Date.now();

    for (let filename of filenames) {
      this.loadKB(filename);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[KBQueryOptimizer] Preloaded ${filenames.length} KBs in ${totalTime}ms`);
  }

  /**
   * Clear KB cache (free memory)
   */
  clearCache() {
    this.loadedKBs.clear();
    this.indexes.clear();
    this.patterns.clear();

    if (this.queryCache) {
      this.queryCache.clear();
    }

    console.log('[KBQueryOptimizer] Cache cleared');
  }

  /**
   * Get optimizer statistics
   * @returns {object} Statistics
   */
  getStats() {
    const avgQueryTime = this.stats.queryTime.length > 0
      ? this.stats.queryTime.reduce((a, b) => a + b, 0) / this.stats.queryTime.length
      : 0;

    const cacheStats = this.queryCache
      ? this.queryCache.getStats()
      : null;

    return {
      kbLoads: this.stats.kbLoads,
      indexBuilds: this.stats.indexBuilds,
      loadedKBs: this.loadedKBs.size,
      totalPatterns: Array.from(this.patterns.values())
        .reduce((sum, map) => sum + map.size, 0),
      totalKeywords: Array.from(this.indexes.values())
        .reduce((sum, map) => sum + map.size, 0),
      queryStats: {
        totalQueries: this.stats.queryTime.length,
        avgQueryTimeMs: avgQueryTime.toFixed(2),
        cacheHits: this.stats.cacheHits,
        cacheMisses: this.stats.cacheMisses,
        cacheHitRate: this.stats.cacheHits + this.stats.cacheMisses > 0
          ? ((this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100).toFixed(2) + '%'
          : '0%'
      },
      cache: cacheStats
    };
  }

  /**
   * Export metrics for monitoring
   * @returns {object} Monitoring data
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      optimizer: {
        loadedKBs: this.loadedKBs.size,
        totalPatterns: Array.from(this.patterns.values())
          .reduce((sum, map) => sum + map.size, 0),
        totalKeywords: Array.from(this.indexes.values())
          .reduce((sum, map) => sum + map.size, 0)
      },
      performance: this.getStats().queryStats,
      cache: this.queryCache ? this.queryCache.exportMetrics() : null
    };
  }
}

module.exports = KBQueryOptimizer;
