/**
 * QueryCache - LRU Cache with TTL Support
 *
 * Implements query result caching with:
 * - LRU (Least Recently Used) eviction policy
 * - TTL (Time To Live) expiration
 * - Cache hit/miss statistics
 * - Memory budget enforcement
 *
 * @version 3.9.0
 * @date 2025-12-25
 */

const crypto = require('crypto');

class QueryCache {
  constructor(options = {}) {
    // Cache storage: queryHash → { result, timestamp, accessCount }
    this.cache = new Map();

    // LRU tracking: array of keys in access order (oldest first)
    this.accessOrder = [];

    // Configuration
    this.config = {
      maxSize: options.maxSize || 1000,               // Max entries
      maxMemoryMB: options.maxMemoryMB || 50,         // 50MB max memory
      ttl: options.ttl || 3600000,                    // 1 hour (ms)
      enableCompression: options.enableCompression || false,
      ...options
    };

    // Statistics tracking
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expires: 0,
      totalSizeBytes: 0,
      totalQueries: 0
    };
  }

  /**
   * Generate cache key from query parameters
   * @param {string} query - Query string
   * @param {string} category - Query category (optional)
   * @returns {string} Cache key
   */
  generateKey(query, category = 'default') {
    // Simple concatenation for performance (no crypto hash needed)
    return `${category}:${query}`;
  }

  /**
   * Generate hash for content-based key
   * @param {string} content - Content to hash
   * @returns {string} MD5 hash
   */
  hash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Get cached result by query
   * @param {string} query - Query string
   * @param {string} category - Query category
   * @returns {any|null} Cached result or null
   */
  get(query, category = 'default') {
    const key = this.generateKey(query, category);
    this.stats.totalQueries++;

    if (!this.cache.has(key)) {
      this.stats.misses++;
      return null;
    }

    const entry = this.cache.get(key);

    // Check TTL expiration
    const age = Date.now() - entry.timestamp;
    if (age > this.config.ttl) {
      // Expired - remove from cache
      this.delete(key);
      this.stats.expires++;
      this.stats.misses++;
      return null;
    }

    // Cache hit - update LRU
    this.updateAccessOrder(key);
    entry.accessCount++;

    this.stats.hits++;
    return entry.result;
  }

  /**
   * Set cache entry
   * @param {string} query - Query string
   * @param {string} category - Query category
   * @param {any} result - Result to cache
   */
  set(query, category = 'default', result) {
    const key = this.generateKey(query, category);

    // Estimate entry size
    const entrySize = this.estimateSize(result);

    // Evict if necessary (size-based)
    while (this.shouldEvict(entrySize)) {
      this.evictLRU();
    }

    // Remove old entry if exists
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key);
      this.stats.totalSizeBytes -= oldEntry.size;

      // Remove from access order
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }

    // Add new entry
    const entry = {
      result,
      timestamp: Date.now(),
      accessCount: 1,
      size: entrySize
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key); // Add to end (most recently used)
    this.stats.totalSizeBytes += entrySize;
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      this.stats.totalSizeBytes -= entry.size;
      this.cache.delete(key);

      // Remove from access order
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
  }

  /**
   * Check if eviction needed
   * @param {number} newEntrySize - Size of new entry to add
   * @returns {boolean} True if eviction needed
   */
  shouldEvict(newEntrySize) {
    // Check max entries
    if (this.cache.size >= this.config.maxSize) {
      return true;
    }

    // Check memory budget
    const maxMemoryBytes = this.config.maxMemoryMB * 1024 * 1024;
    if (this.stats.totalSizeBytes + newEntrySize > maxMemoryBytes) {
      return true;
    }

    return false;
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    if (this.accessOrder.length === 0) {
      return;
    }

    // Remove oldest (first in access order)
    const keyToEvict = this.accessOrder.shift();
    const entry = this.cache.get(keyToEvict);

    if (entry) {
      this.stats.totalSizeBytes -= entry.size;
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
    }
  }

  /**
   * Update LRU access order
   * @param {string} key - Cache key
   */
  updateAccessOrder(key) {
    // Move to end (most recently used)
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }
  }

  /**
   * Estimate size of cached object
   * @param {any} obj - Object to estimate
   * @returns {number} Size in bytes
   */
  estimateSize(obj) {
    try {
      // Rough estimate: JSON string length
      const jsonStr = JSON.stringify(obj);
      return Buffer.byteLength(jsonStr, 'utf8');
    } catch (e) {
      // Fallback: 1KB for non-serializable objects
      return 1024;
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.totalSizeBytes = 0;
  }

  /**
   * Get cache hit rate
   * @returns {number} Hit rate percentage (0-100)
   */
  getHitRate() {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Get cache statistics
   * @returns {object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      entries: this.cache.size,
      hitRate: this.getHitRate().toFixed(2) + '%',
      avgEntrySize: this.cache.size > 0
        ? Math.round(this.stats.totalSizeBytes / this.cache.size)
        : 0,
      memoryUsageMB: (this.stats.totalSizeBytes / 1024 / 1024).toFixed(2),
      memoryLimitMB: this.config.maxMemoryMB
    };
  }

  /**
   * Get cache entry info (for debugging)
   * @param {string} query - Query string
   * @param {string} category - Query category
   * @returns {object|null} Entry info or null
   */
  getEntryInfo(query, category = 'default') {
    const key = this.generateKey(query, category);

    if (!this.cache.has(key)) {
      return null;
    }

    const entry = this.cache.get(key);
    const age = Date.now() - entry.timestamp;

    return {
      key,
      age: Math.round(age / 1000) + 's',
      accessCount: entry.accessCount,
      size: entry.size,
      ttlRemaining: Math.max(0, Math.round((this.config.ttl - age) / 1000)) + 's',
      expired: age > this.config.ttl
    };
  }

  /**
   * Clean up expired entries
   * @returns {number} Number of entries removed
   */
  cleanupExpired() {
    let removed = 0;
    const now = Date.now();

    for (let [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.config.ttl) {
        this.delete(key);
        this.stats.expires++;
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get top N most accessed entries
   * @param {number} n - Number of top entries
   * @returns {Array} Top entries
   */
  getTopEntries(n = 10) {
    const entries = Array.from(this.cache.entries());

    // Sort by access count (descending)
    entries.sort((a, b) => b[1].accessCount - a[1].accessCount);

    return entries.slice(0, n).map(([key, entry]) => ({
      key,
      accessCount: entry.accessCount,
      age: Math.round((Date.now() - entry.timestamp) / 1000) + 's',
      size: entry.size
    }));
  }

  /**
   * Export cache statistics for monitoring
   * @returns {object} Monitoring data
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      cache: {
        entries: this.cache.size,
        maxEntries: this.config.maxSize,
        memoryUsageMB: parseFloat((this.stats.totalSizeBytes / 1024 / 1024).toFixed(2)),
        memoryLimitMB: this.config.maxMemoryMB,
        utilizationPercent: ((this.cache.size / this.config.maxSize) * 100).toFixed(2)
      },
      performance: {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: parseFloat(this.getHitRate().toFixed(2)),
        totalQueries: this.stats.totalQueries
      },
      maintenance: {
        evictions: this.stats.evictions,
        expires: this.stats.expires,
        avgEntrySize: this.cache.size > 0
          ? Math.round(this.stats.totalSizeBytes / this.cache.size)
          : 0
      }
    };
  }
}

module.exports = QueryCache;
