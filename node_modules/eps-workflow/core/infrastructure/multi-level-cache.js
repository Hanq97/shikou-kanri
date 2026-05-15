/**
 * MultiLevelCache - Two-Tier Caching System
 *
 * Implements L1 (in-memory) + L2 (disk-based) caching:
 * - L1 cache: Fast in-memory LRU cache (<1ms access)
 * - L2 cache: Persistent disk-based cache (<10ms access)
 * - Automatic promotion: L2 → L1 based on access frequency
 * - Cache coherence: Sync between L1 and L2
 *
 * @version 3.9.0
 * @date 2025-12-25
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * L1 Cache - In-Memory LRU Cache
 */
class L1Cache {
  constructor(options = {}) {
    this.cache = new Map(); // cacheKey → { value, timestamp, size }
    this.accessOrder = []; // LRU tracking (oldest first)

    this.config = {
      maxSize: options.maxSize || 50 * 1024 * 1024, // 50MB
      maxEntries: options.maxEntries || 1000,
      ttl: options.ttl || 3600000, // 1 hour
      ...options
    };

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sizeBytes: 0
    };
  }

  get(key) {
    if (!this.cache.has(key)) {
      this.stats.misses++;
      return null;
    }

    const entry = this.cache.get(key);

    // Check TTL expiration
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update LRU
    this.updateLRU(key);
    this.stats.hits++;
    return entry.value;
  }

  set(key, value) {
    const size = this.estimateSize(value);
    const entry = {
      value,
      timestamp: Date.now(),
      size
    };

    // Evict if necessary
    while (this.shouldEvict(size)) {
      this.evictLRU();
    }

    // Update or add entry
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key);
      this.stats.sizeBytes -= oldEntry.size;
      this.removeFromLRU(key);
    }

    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.stats.sizeBytes += size;
  }

  delete(key) {
    if (!this.cache.has(key)) return;

    const entry = this.cache.get(key);
    this.cache.delete(key);
    this.stats.sizeBytes -= entry.size;
    this.removeFromLRU(key);
  }

  shouldEvict(newEntrySize) {
    return (
      this.cache.size >= this.config.maxEntries ||
      this.stats.sizeBytes + newEntrySize > this.config.maxSize
    );
  }

  evictLRU() {
    if (this.accessOrder.length === 0) return;

    const keyToEvict = this.accessOrder.shift();
    const entry = this.cache.get(keyToEvict);

    this.cache.delete(keyToEvict);
    this.stats.sizeBytes -= entry.size;
    this.stats.evictions++;
  }

  updateLRU(key) {
    this.removeFromLRU(key);
    this.accessOrder.push(key);
  }

  removeFromLRU(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  estimateSize(value) {
    try {
      return JSON.stringify(value).length;
    } catch (e) {
      return 1024; // 1KB default
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      entries: this.cache.size,
      sizeMB: parseFloat((this.stats.sizeBytes / 1024 / 1024).toFixed(2)),
      hitRate: parseFloat(hitRate.toFixed(2))
    };
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sizeBytes: 0
    };
  }
}

/**
 * L2 Cache - Disk-Based Persistent Cache
 */
class L2Cache {
  constructor(options = {}) {
    this.config = {
      cacheDir: options.cacheDir || path.join(process.cwd(), '.cache'),
      maxSize: options.maxSize || 500 * 1024 * 1024, // 500MB
      maxEntries: options.maxEntries || 10000,
      ttl: options.ttl || 86400000, // 24 hours
      ...options
    };

    this.index = new Map(); // key → { filename, timestamp, size, accessCount, lastAccess }
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sizeBytes: 0
    };

    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    // Create cache directory
    try {
      await fs.mkdir(this.config.cacheDir, { recursive: true });
    } catch (e) {
      console.error('[L2Cache] Failed to create cache directory:', e.message);
    }

    // Load index
    await this.loadIndex();

    // Cleanup expired entries
    await this.cleanupExpired();

    this.initialized = true;
  }

  async get(key) {
    await this.ensureInitialized();

    if (!this.index.has(key)) {
      this.stats.misses++;
      return null;
    }

    const entry = this.index.get(key);

    // Check TTL expiration
    if (Date.now() - entry.timestamp > this.config.ttl) {
      await this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Read from disk
    try {
      const filePath = path.join(this.config.cacheDir, entry.filename);
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);

      // Update access tracking
      entry.accessCount = (entry.accessCount || 0) + 1;
      entry.lastAccess = Date.now();

      this.stats.hits++;
      return data.value;
    } catch (e) {
      await this.delete(key);
      this.stats.misses++;
      return null;
    }
  }

  async set(key, value) {
    await this.ensureInitialized();

    const filename = this.generateFilename(key);
    const filePath = path.join(this.config.cacheDir, filename);

    const data = {
      key,
      value,
      timestamp: Date.now()
    };

    const content = JSON.stringify(data, null, 2);
    const size = Buffer.byteLength(content, 'utf8');

    // Evict if necessary
    while (this.shouldEvict(size)) {
      await this.evictOldest();
    }

    // Write to disk
    try {
      await fs.writeFile(filePath, content, 'utf8');

      // Update index
      if (this.index.has(key)) {
        const oldEntry = this.index.get(key);
        this.stats.sizeBytes -= oldEntry.size;
      }

      this.index.set(key, {
        filename,
        timestamp: Date.now(),
        size,
        accessCount: 0,
        lastAccess: Date.now()
      });

      this.stats.sizeBytes += size;

      await this.saveIndex();
    } catch (e) {
      console.error('[L2Cache] Failed to write cache file:', e.message);
    }
  }

  async delete(key) {
    await this.ensureInitialized();

    if (!this.index.has(key)) return;

    const entry = this.index.get(key);
    const filePath = path.join(this.config.cacheDir, entry.filename);

    // Delete file
    try {
      await fs.unlink(filePath);
    } catch (e) {
      // File already deleted
    }

    this.index.delete(key);
    this.stats.sizeBytes -= entry.size;

    await this.saveIndex();
  }

  shouldEvict(newEntrySize) {
    return (
      this.index.size >= this.config.maxEntries ||
      this.stats.sizeBytes + newEntrySize > this.config.maxSize
    );
  }

  async evictOldest() {
    if (this.index.size === 0) return;

    let oldestKey = null;
    let oldestTimestamp = Infinity;

    for (let [key, entry] of this.index.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestKey = key;
        oldestTimestamp = entry.timestamp;
      }
    }

    if (oldestKey) {
      await this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  generateFilename(key) {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return `cache-${hash}.json`;
  }

  async loadIndex() {
    const indexPath = path.join(this.config.cacheDir, 'index.json');

    try {
      const content = await fs.readFile(indexPath, 'utf8');
      const indexData = JSON.parse(content);

      this.index = new Map(Object.entries(indexData.entries || {}));
      this.stats = indexData.stats || this.stats;
    } catch (e) {
      this.index = new Map();
    }
  }

  async saveIndex() {
    const indexPath = path.join(this.config.cacheDir, 'index.json');

    const indexData = {
      entries: Object.fromEntries(this.index),
      stats: this.stats,
      lastUpdated: new Date().toISOString()
    };

    try {
      await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
    } catch (e) {
      console.error('[L2Cache] Failed to save index:', e.message);
    }
  }

  async cleanupExpired() {
    const now = Date.now();
    const keysToDelete = [];

    for (let [key, entry] of this.index.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        keysToDelete.push(key);
      }
    }

    for (let key of keysToDelete) {
      await this.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`[L2Cache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      entries: this.index.size,
      sizeMB: parseFloat((this.stats.sizeBytes / 1024 / 1024).toFixed(2)),
      hitRate: parseFloat(hitRate.toFixed(2))
    };
  }

  async clear() {
    await this.ensureInitialized();

    for (let [key] of this.index.entries()) {
      await this.delete(key);
    }

    this.index.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sizeBytes: 0
    };

    await this.saveIndex();
  }
}

/**
 * MultiLevelCache - Unified Facade for L1 + L2
 */
class MultiLevelCache {
  constructor(options = {}) {
    this.l1 = new L1Cache(options.l1 || {});
    this.l2 = new L2Cache(options.l2 || {});

    this.config = {
      promotionThreshold: options.promotionThreshold || 3, // Promote after 3 L2 accesses
      enablePromotion: options.enablePromotion !== false,
      ...options
    };

    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    await this.l2.init();
    this.initialized = true;

    console.log('[MultiLevelCache] Initialized (L1 + L2)');
  }

  async get(key) {
    await this.ensureInitialized();

    // Try L1 first
    const l1Value = this.l1.get(key);
    if (l1Value !== null) {
      return l1Value; // L1 hit (<1ms)
    }

    // Try L2
    const l2Value = await this.l2.get(key);
    if (l2Value !== null) {
      // Consider promotion to L1
      if (this.config.enablePromotion) {
        await this.considerPromotion(key, l2Value);
      }
      return l2Value; // L2 hit (<10ms)
    }

    return null; // Cache miss
  }

  async set(key, value) {
    await this.ensureInitialized();

    // Set in both L1 and L2 for coherence
    this.l1.set(key, value);
    await this.l2.set(key, value);
  }

  async delete(key) {
    await this.ensureInitialized();

    this.l1.delete(key);
    await this.l2.delete(key);
  }

  async considerPromotion(key, value) {
    const l2Entry = this.l2.index.get(key);
    if (!l2Entry) return;

    // Promote if accessed >= threshold times
    if (l2Entry.accessCount >= this.config.promotionThreshold) {
      this.l1.set(key, value);
      console.log(`[MultiLevelCache] Promoted "${key}" to L1 (${l2Entry.accessCount} accesses)`);
    }
  }

  getL1Stats() {
    return this.l1.getStats();
  }

  getL2Stats() {
    return this.l2.getStats();
  }

  getStats() {
    const l1Stats = this.l1.getStats();
    const l2Stats = this.l2.getStats();

    const totalHits = l1Stats.hits + l2Stats.hits;
    const totalRequests = (l1Stats.hits + l1Stats.misses) + (l2Stats.hits + l2Stats.misses);
    const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    return {
      l1: l1Stats,
      l2: l2Stats,
      overall: {
        hits: totalHits,
        misses: l2Stats.misses, // Only L2 misses count as cache misses
        totalEntries: l1Stats.entries + l2Stats.entries,
        totalSizeMB: parseFloat((l1Stats.sizeMB + l2Stats.sizeMB).toFixed(2)),
        hitRate: parseFloat(overallHitRate.toFixed(2))
      }
    };
  }

  async clear() {
    this.l1.clear();
    await this.l2.clear();
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }

  displayDashboard() {
    const stats = this.getStats();

    console.log('\n' + '='.repeat(60));
    console.log('📦 MULTI-LEVEL CACHE DASHBOARD');
    console.log('='.repeat(60));

    console.log('\n💨 L1 Cache (In-Memory):');
    console.log(`   Entries: ${stats.l1.entries}`);
    console.log(`   Size: ${stats.l1.sizeMB}MB`);
    console.log(`   Hit Rate: ${stats.l1.hitRate}%`);
    console.log(`   Evictions: ${stats.l1.evictions}`);

    console.log('\n💾 L2 Cache (Disk):');
    console.log(`   Entries: ${stats.l2.entries}`);
    console.log(`   Size: ${stats.l2.sizeMB}MB`);
    console.log(`   Hit Rate: ${stats.l2.hitRate}%`);
    console.log(`   Evictions: ${stats.l2.evictions}`);

    console.log('\n📊 Overall:');
    console.log(`   Total Entries: ${stats.overall.totalEntries}`);
    console.log(`   Total Size: ${stats.overall.totalSizeMB}MB`);
    console.log(`   Overall Hit Rate: ${stats.overall.hitRate}%`);

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

module.exports = MultiLevelCache;
