'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Enrichment Cache - Cache LLM enrichment results to reduce costs
 *
 * WHY: LLM API calls are expensive, caching avoids redundant calls
 * HOW: File-based cache with content hashing for invalidation
 *
 * Features:
 * - Content-based cache keys (hash of AST structure)
 * - TTL (time-to-live) support
 * - Automatic cleanup of expired entries
 * - Statistics tracking
 *
 * @module enrichment-cache
 */

// Default configuration
const DEFAULT_CONFIG = {
  cacheDir: 'cache/enrichments',
  ttlMs: 7 * 24 * 60 * 60 * 1000,  // 7 days
  maxEntries: 10000,
  cleanupIntervalMs: 60 * 60 * 1000,  // 1 hour
};

/**
 * EnrichmentCache class
 */
class EnrichmentCache {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Resolve cache directory relative to project root
    this.cacheDir = path.isAbsolute(this.config.cacheDir)
      ? this.config.cacheDir
      : path.join(process.cwd(), this.config.cacheDir);

    // Statistics
    this._hits = 0;
    this._misses = 0;
    this._writes = 0;

    // In-memory index for faster lookups
    this._index = new Map();

    // Initialize
    this._ensureCacheDir();
    this._loadIndex();
  }

  /**
   * Get cached enrichment
   *
   * @param {string} key - Cache key (typically from AST hash)
   * @returns {object|null} Cached enrichment or null
   */
  async get(key) {
    const entry = this._index.get(key);

    if (!entry) {
      this._misses++;
      return null;
    }

    // Check TTL
    if (Date.now() > entry.expiresAt) {
      this._misses++;
      this._deleteEntry(key);
      return null;
    }

    // Read from file
    try {
      const filePath = this._getFilePath(key);
      if (!fs.existsSync(filePath)) {
        this._misses++;
        this._index.delete(key);
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      this._hits++;
      return data.enrichment;
    } catch (error) {
      console.warn(`[EnrichmentCache] Error reading cache for ${key}:`, error.message);
      this._misses++;
      return null;
    }
  }

  /**
   * Set cached enrichment
   *
   * @param {string} key - Cache key
   * @param {object} enrichment - Enrichment data
   * @param {number} [ttlMs] - Optional TTL override
   */
  async set(key, enrichment, ttlMs = null) {
    const ttl = ttlMs || this.config.ttlMs;
    const expiresAt = Date.now() + ttl;

    const data = {
      key,
      enrichment,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    // Write to file
    try {
      const filePath = this._getFilePath(key);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

      // Update index
      this._index.set(key, {
        expiresAt,
        filePath,
      });

      this._writes++;
      this._saveIndex();
    } catch (error) {
      console.warn(`[EnrichmentCache] Error writing cache for ${key}:`, error.message);
    }
  }

  /**
   * Check if key exists in cache (without loading)
   *
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this._index.get(key);
    if (!entry) return false;

    // Check TTL
    if (Date.now() > entry.expiresAt) {
      return false;
    }

    return fs.existsSync(this._getFilePath(key));
  }

  /**
   * Delete a cache entry
   *
   * @param {string} key - Cache key
   */
  delete(key) {
    this._deleteEntry(key);
    this._saveIndex();
  }

  /**
   * Clear all cache entries
   */
  clear() {
    // Delete all cache files
    for (const key of this._index.keys()) {
      this._deleteEntry(key, false);
    }

    this._index.clear();
    this._saveIndex();

    // Reset stats
    this._hits = 0;
    this._misses = 0;
    this._writes = 0;
  }

  /**
   * Cleanup expired entries
   *
   * @returns {number} Number of entries cleaned
   */
  cleanup() {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this._index) {
      if (now > entry.expiresAt) {
        this._deleteEntry(key, false);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this._saveIndex();
    }

    return cleaned;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this._hits + this._misses;
    const hitRate = total > 0 ? (this._hits / total * 100).toFixed(1) : 0;

    return {
      hits: this._hits,
      misses: this._misses,
      writes: this._writes,
      hitRate: `${hitRate}%`,
      entries: this._index.size,
      cacheDir: this.cacheDir,
    };
  }

  /**
   * Generate cache key from AST
   *
   * @param {UnifiedAST} ast - AST to generate key for
   * @returns {string} Cache key (MD5 hash)
   */
  static generateKey(ast) {
    const content = JSON.stringify({
      filePath: ast.filePath,
      language: ast.language,
      packageName: ast.packageName,
      classes: ast.classes.map(c => ({
        name: c.name,
        kind: c.kind,
        methods: c.methods.map(m => m.name),
        fields: c.fields.map(f => f.name),
      })),
      functions: ast.functions.map(f => ({
        name: f.name,
        returnType: f.returnType,
      })),
      framework: ast.framework?.name,
      linesOfCode: ast.meta.linesOfCode,
    });

    return crypto.createHash('md5').update(content).digest('hex');
  }

  // --- Private Methods ---

  _ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  _getFilePath(key) {
    // Use first 2 chars as subdirectory for better filesystem performance
    const subDir = key.substring(0, 2);
    const dir = path.join(this.cacheDir, subDir);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return path.join(dir, `${key}.json`);
  }

  _getIndexPath() {
    return path.join(this.cacheDir, '_index.json');
  }

  _loadIndex() {
    const indexPath = this._getIndexPath();

    if (fs.existsSync(indexPath)) {
      try {
        const content = fs.readFileSync(indexPath, 'utf8');
        const data = JSON.parse(content);

        for (const [key, entry] of Object.entries(data)) {
          this._index.set(key, entry);
        }
      } catch (error) {
        console.warn('[EnrichmentCache] Error loading index:', error.message);
      }
    }
  }

  _saveIndex() {
    const indexPath = this._getIndexPath();
    const data = Object.fromEntries(this._index);

    try {
      fs.writeFileSync(indexPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('[EnrichmentCache] Error saving index:', error.message);
    }
  }

  _deleteEntry(key, updateIndex = true) {
    const filePath = this._getFilePath(key);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.warn(`[EnrichmentCache] Error deleting ${key}:`, error.message);
      }
    }

    if (updateIndex) {
      this._index.delete(key);
    } else {
      // Just mark for deletion in index
      this._index.delete(key);
    }
  }
}

/**
 * Create a cache instance with default configuration
 */
function createCache(config = {}) {
  return new EnrichmentCache(config);
}

module.exports = {
  EnrichmentCache,
  createCache,
  DEFAULT_CONFIG,
};
