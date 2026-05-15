/**
 * CacheInvalidator - Cache Invalidation Strategies
 *
 * Implements multiple cache invalidation strategies:
 * - Time-based invalidation (TTL support)
 * - Event-based invalidation (file change detection)
 * - Manual invalidation API (clear, clearPattern)
 * - Cache warming on startup (pre-load common queries)
 *
 * @version 3.9.0
 * @date 2025-12-25
 */

const fs = require('fs').promises;
const path = require('path');

class CacheInvalidator {
  constructor(cache, options = {}) {
    this.cache = cache;

    this.config = {
      enableAutoInvalidation: options.enableAutoInvalidation !== false,
      watchFiles: options.watchFiles || [],
      warmupQueries: options.warmupQueries || [],
      ...options
    };

    // File watchers
    this.watchers = new Map();

    // Statistics
    this.stats = {
      ttlInvalidations: 0,
      eventInvalidations: 0,
      manualInvalidations: 0,
      patternInvalidations: 0,
      warmupLoads: 0
    };
  }

  /**
   * Initialize invalidator
   */
  async init() {
    // Setup file watchers if enabled
    if (this.config.enableAutoInvalidation) {
      await this.setupFileWatchers();
    }

    // Perform cache warming
    await this.warmupCache();

    console.log('[CacheInvalidator] Initialized');
  }

  /**
   * Setup file watchers for event-based invalidation
   */
  async setupFileWatchers() {
    for (let filePath of this.config.watchFiles) {
      try {
        const watcher = fs.watch(filePath, async (eventType, filename) => {
          console.log(`[CacheInvalidator] File changed: ${filePath} (${eventType})`);
          await this.handleFileChange(filePath);
        });

        this.watchers.set(filePath, watcher);
      } catch (e) {
        console.warn(`[CacheInvalidator] Failed to watch file: ${filePath}`, e.message);
      }
    }

    if (this.watchers.size > 0) {
      console.log(`[CacheInvalidator] Watching ${this.watchers.size} files`);
    }
  }

  /**
   * Handle file change event
   * @param {string} filePath - Changed file path
   */
  async handleFileChange(filePath) {
    // Invalidate related cache entries
    const pattern = this.getPatternForFile(filePath);
    await this.invalidateByPattern(pattern);

    this.stats.eventInvalidations++;
  }

  /**
   * Get cache key pattern for file
   * @param {string} filePath - File path
   * @returns {string} Cache key pattern
   */
  getPatternForFile(filePath) {
    // Extract relevant pattern from file path
    const basename = path.basename(filePath, path.extname(filePath));

    // Example: backend-kb.json → kb:backend:*
    if (basename.includes('-kb')) {
      const kbType = basename.replace('-kb', '');
      return `kb:${kbType}:*`;
    }

    // Example: agent-srs-00.md → agent:srs-00:*
    if (basename.includes('agent-')) {
      const agentId = basename.replace('agent-', '');
      return `agent:${agentId}:*`;
    }

    // Default: invalidate all entries related to file
    return `${basename}:*`;
  }

  /**
   * Invalidate by pattern (wildcard support)
   * @param {string} pattern - Pattern with wildcard (e.g., "kb:backend:*")
   * @returns {Promise<number>} Number of entries invalidated
   */
  async invalidateByPattern(pattern) {
    let count = 0;

    // Convert pattern to regex
    const regex = this.patternToRegex(pattern);

    // Check L1 cache
    if (this.cache.l1) {
      const keysToDelete = [];
      for (let key of this.cache.l1.cache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }

      for (let key of keysToDelete) {
        this.cache.l1.delete(key);
        count++;
      }
    }

    // Check L2 cache
    if (this.cache.l2) {
      const keysToDelete = [];
      for (let key of this.cache.l2.index.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }

      for (let key of keysToDelete) {
        await this.cache.l2.delete(key);
        count++;
      }
    }

    this.stats.patternInvalidations++;
    console.log(`[CacheInvalidator] Invalidated ${count} entries matching pattern: ${pattern}`);

    return count;
  }

  /**
   * Convert wildcard pattern to regex
   * @param {string} pattern - Pattern with * wildcard
   * @returns {RegExp} Regular expression
   */
  patternToRegex(pattern) {
    // Escape special regex characters except *
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Replace * with .*
    const regexStr = escaped.replace(/\*/g, '.*');
    return new RegExp(`^${regexStr}$`);
  }

  /**
   * Invalidate by version change
   * @param {string} category - Cache category (e.g., 'kb', 'agent')
   * @param {string} oldVersion - Old version
   * @param {string} newVersion - New version
   * @returns {Promise<number>} Number of entries invalidated
   */
  async invalidateByVersion(category, oldVersion, newVersion) {
    const pattern = `${category}:*:v${oldVersion}`;
    const count = await this.invalidateByPattern(pattern);

    console.log(`[CacheInvalidator] Version update: ${category} ${oldVersion} → ${newVersion}`);
    return count;
  }

  /**
   * Manual invalidation - delete specific key
   * @param {string} key - Cache key
   */
  async invalidate(key) {
    await this.cache.delete(key);
    this.stats.manualInvalidations++;
  }

  /**
   * Clear all caches
   */
  async clearAll() {
    await this.cache.clear();
    this.stats.manualInvalidations++;
    console.log('[CacheInvalidator] Cleared all caches');
  }

  /**
   * Cache warming - pre-load common queries
   */
  async warmupCache() {
    if (this.config.warmupQueries.length === 0) {
      return;
    }

    console.log(`[CacheInvalidator] Warming up cache with ${this.config.warmupQueries.length} queries...`);

    for (let query of this.config.warmupQueries) {
      try {
        // Execute query and cache result
        if (typeof query.executor === 'function') {
          const result = await query.executor();
          await this.cache.set(query.key, result);
          this.stats.warmupLoads++;
        }
      } catch (e) {
        console.warn(`[CacheInvalidator] Failed to warmup query: ${query.key}`, e.message);
      }
    }

    console.log(`[CacheInvalidator] Cache warmup complete: ${this.stats.warmupLoads} entries loaded`);
  }

  /**
   * Cleanup expired entries (manual trigger)
   */
  async cleanupExpired() {
    // L2 cache cleanup
    if (this.cache.l2) {
      await this.cache.l2.cleanupExpired();
    }

    this.stats.ttlInvalidations++;
  }

  /**
   * Stop all file watchers
   */
  async stopWatchers() {
    for (let [filePath, watcher] of this.watchers.entries()) {
      try {
        watcher.close();
      } catch (e) {
        console.warn(`[CacheInvalidator] Failed to close watcher: ${filePath}`, e.message);
      }
    }

    this.watchers.clear();
    console.log('[CacheInvalidator] Stopped all file watchers');
  }

  /**
   * Get statistics
   * @returns {object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      watchers: this.watchers.size,
      warmupQueries: this.config.warmupQueries.length
    };
  }

  /**
   * Export metrics
   * @returns {object} Monitoring data
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      invalidations: {
        ttl: this.stats.ttlInvalidations,
        events: this.stats.eventInvalidations,
        manual: this.stats.manualInvalidations,
        patterns: this.stats.patternInvalidations
      },
      warmup: {
        loads: this.stats.warmupLoads,
        configured: this.config.warmupQueries.length
      },
      watchers: {
        active: this.watchers.size,
        files: Array.from(this.watchers.keys())
      }
    };
  }

  /**
   * Display dashboard
   */
  displayDashboard() {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 CACHE INVALIDATOR DASHBOARD');
    console.log('='.repeat(60));

    console.log('\n📊 Invalidation Statistics:');
    console.log(`   TTL Invalidations: ${this.stats.ttlInvalidations}`);
    console.log(`   Event Invalidations: ${this.stats.eventInvalidations}`);
    console.log(`   Manual Invalidations: ${this.stats.manualInvalidations}`);
    console.log(`   Pattern Invalidations: ${this.stats.patternInvalidations}`);

    console.log('\n🔥 Cache Warming:');
    console.log(`   Warmup Loads: ${this.stats.warmupLoads}`);
    console.log(`   Configured Queries: ${this.config.warmupQueries.length}`);

    console.log('\n👁️  File Watchers:');
    console.log(`   Active Watchers: ${this.watchers.size}`);
    if (this.watchers.size > 0) {
      for (let filePath of this.watchers.keys()) {
        console.log(`     - ${filePath}`);
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

module.exports = CacheInvalidator;
