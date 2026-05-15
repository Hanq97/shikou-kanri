/**
 * MemoryPool - Object Pooling for Memory Optimization
 *
 * Implements object pooling to reduce allocation overhead:
 * - Pool management (acquire/release objects)
 * - Object recycling with reset logic
 * - Pool size management (min/max limits)
 * - Pool statistics tracking (allocation count, reuse rate)
 *
 * @version 3.9.0
 * @date 2025-12-25
 */

class MemoryPool {
  constructor(options = {}) {
    // Configuration
    this.config = {
      minSize: options.minSize || 5,          // Min pool size (pre-allocated)
      maxSize: options.maxSize || 20,         // Max pool size
      enableStats: options.enableStats !== false,
      enableAutoCleanup: options.enableAutoCleanup !== false,
      cleanupInterval: options.cleanupInterval || 60000, // 1 minute
      ...options
    };

    // Pool storage: Map<poolName, { available, inUse, factory, stats }>
    this.pools = new Map();

    // Global statistics
    this.globalStats = {
      totalAcquires: 0,
      totalReleases: 0,
      totalAllocations: 0,
      totalReuses: 0,
      startTime: Date.now()
    };

    // Auto-cleanup timer
    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Get or create pool for given name
   * @param {string} poolName - Pool identifier
   * @param {function} factory - Factory function to create new objects
   * @returns {object} Pool object
   */
  getPool(poolName, factory) {
    if (!this.pools.has(poolName)) {
      const pool = {
        available: [],                    // Available objects
        inUse: new Set(),                 // Objects currently in use
        factory,                          // Factory function
        stats: {
          acquires: 0,
          releases: 0,
          allocations: 0,
          reuses: 0,
          peakInUse: 0
        }
      };

      // Pre-allocate min size
      for (let i = 0; i < this.config.minSize; i++) {
        const obj = factory();
        pool.available.push(obj);
        pool.stats.allocations++;
        this.globalStats.totalAllocations++;
      }

      this.pools.set(poolName, pool);
    }

    return this.pools.get(poolName);
  }

  /**
   * Acquire object from pool
   * @param {string} poolName - Pool identifier
   * @param {function} factory - Factory function
   * @returns {object} Pooled object
   */
  acquire(poolName, factory) {
    const pool = this.getPool(poolName, factory);

    let obj;

    // Try to reuse from available pool
    if (pool.available.length > 0) {
      obj = pool.available.pop();
      pool.stats.reuses++;
      this.globalStats.totalReuses++;
    } else if (pool.inUse.size < this.config.maxSize) {
      // Create new if under max size
      obj = factory();
      pool.stats.allocations++;
      this.globalStats.totalAllocations++;
    } else {
      // Pool exhausted
      throw new Error(
        `Pool "${poolName}" exhausted (max: ${this.config.maxSize}). ` +
        `Consider increasing maxSize or releasing objects sooner.`
      );
    }

    // Track in-use
    pool.inUse.add(obj);
    pool.stats.acquires++;
    this.globalStats.totalAcquires++;

    // Update peak usage
    if (pool.inUse.size > pool.stats.peakInUse) {
      pool.stats.peakInUse = pool.inUse.size;
    }

    return obj;
  }

  /**
   * Release object back to pool
   * @param {string} poolName - Pool identifier
   * @param {object} obj - Object to release
   */
  release(poolName, obj) {
    const pool = this.pools.get(poolName);

    if (!pool) {
      console.warn(`[MemoryPool] Cannot release: pool "${poolName}" not found`);
      return;
    }

    if (!pool.inUse.has(obj)) {
      console.warn(`[MemoryPool] Object not in use for pool "${poolName}"`);
      return;
    }

    // Remove from in-use
    pool.inUse.delete(obj);
    pool.stats.releases++;
    this.globalStats.totalReleases++;

    // Reset object state if reset method exists
    if (typeof obj.reset === 'function') {
      try {
        obj.reset();
      } catch (error) {
        console.error(`[MemoryPool] Error resetting object in pool "${poolName}":`, error.message);
        // Don't return object to pool if reset failed
        return;
      }
    }

    // Return to available pool if under max size
    if (pool.available.length < this.config.maxSize) {
      pool.available.push(obj);
    }
    // Otherwise, let GC collect it (pool is full)
  }

  /**
   * Release all objects in pool
   * @param {string} poolName - Pool identifier
   */
  releaseAll(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    const objectsToRelease = Array.from(pool.inUse);
    for (let obj of objectsToRelease) {
      this.release(poolName, obj);
    }
  }

  /**
   * Clear pool (remove all objects)
   * @param {string} poolName - Pool identifier
   */
  clearPool(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    // Release all in-use objects
    this.releaseAll(poolName);

    // Clear available objects
    pool.available = [];

    console.log(`[MemoryPool] Cleared pool "${poolName}"`);
  }

  /**
   * Clear all pools
   */
  clearAll() {
    for (let poolName of this.pools.keys()) {
      this.clearPool(poolName);
    }
  }

  /**
   * Get pool statistics
   * @param {string} poolName - Pool identifier
   * @returns {object} Statistics object
   */
  getStats(poolName) {
    const pool = this.pools.get(poolName);

    if (!pool) {
      return null;
    }

    const total = pool.stats.acquires;
    const reuseRate = total > 0
      ? (pool.stats.reuses / total) * 100
      : 0;

    return {
      available: pool.available.length,
      inUse: pool.inUse.size,
      total: pool.available.length + pool.inUse.size,
      acquires: pool.stats.acquires,
      releases: pool.stats.releases,
      allocations: pool.stats.allocations,
      reuses: pool.stats.reuses,
      peakInUse: pool.stats.peakInUse,
      reuseRate: parseFloat(reuseRate.toFixed(2)),
      config: {
        minSize: this.config.minSize,
        maxSize: this.config.maxSize
      }
    };
  }

  /**
   * Get global statistics across all pools
   * @returns {object} Global statistics
   */
  getGlobalStats() {
    const totalPools = this.pools.size;
    const totalAvailable = Array.from(this.pools.values())
      .reduce((sum, pool) => sum + pool.available.length, 0);
    const totalInUse = Array.from(this.pools.values())
      .reduce((sum, pool) => sum + pool.inUse.size, 0);

    const reuseRate = this.globalStats.totalAcquires > 0
      ? (this.globalStats.totalReuses / this.globalStats.totalAcquires) * 100
      : 0;

    const uptime = Date.now() - this.globalStats.startTime;

    return {
      pools: totalPools,
      totalAvailable,
      totalInUse,
      totalObjects: totalAvailable + totalInUse,
      acquires: this.globalStats.totalAcquires,
      releases: this.globalStats.totalReleases,
      allocations: this.globalStats.totalAllocations,
      reuses: this.globalStats.totalReuses,
      reuseRate: parseFloat(reuseRate.toFixed(2)),
      uptime: Math.round(uptime / 1000) + 's'
    };
  }

  /**
   * Get list of all pool names
   * @returns {Array<string>} Pool names
   */
  getPoolNames() {
    return Array.from(this.pools.keys());
  }

  /**
   * Check if pool exists
   * @param {string} poolName - Pool identifier
   * @returns {boolean} True if pool exists
   */
  hasPool(poolName) {
    return this.pools.has(poolName);
  }

  /**
   * Auto-cleanup: Remove excess objects from pools
   */
  cleanup() {
    for (let [poolName, pool] of this.pools.entries()) {
      const excess = pool.available.length - this.config.minSize;

      if (excess > 0) {
        // Remove excess objects
        pool.available.splice(0, excess);
        console.log(`[MemoryPool] Cleaned up ${excess} objects from pool "${poolName}"`);
      }
    }
  }

  /**
   * Start auto-cleanup timer
   */
  startAutoCleanup() {
    if (this.cleanupTimer) {
      return; // Already started
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    // Don't keep process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop auto-cleanup timer
   */
  stopAutoCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Export metrics for monitoring
   * @returns {object} Monitoring data
   */
  exportMetrics() {
    const poolStats = {};
    for (let poolName of this.pools.keys()) {
      poolStats[poolName] = this.getStats(poolName);
    }

    return {
      timestamp: new Date().toISOString(),
      global: this.getGlobalStats(),
      pools: poolStats
    };
  }

  /**
   * Display dashboard
   */
  displayDashboard() {
    console.log('\n' + '='.repeat(60));
    console.log('🧩 MEMORY POOL DASHBOARD');
    console.log('='.repeat(60));

    const global = this.getGlobalStats();

    console.log('\n📊 Global Statistics:');
    console.log(`   Total Pools: ${global.pools}`);
    console.log(`   Total Objects: ${global.totalObjects} (${global.totalAvailable} available, ${global.totalInUse} in use)`);
    console.log(`   Acquires: ${global.acquires}`);
    console.log(`   Reuses: ${global.reuses}`);
    console.log(`   Allocations: ${global.allocations}`);
    console.log(`   Reuse Rate: ${global.reuseRate}%`);
    console.log(`   Uptime: ${global.uptime}`);

    if (this.pools.size > 0) {
      console.log('\n🔍 Pool Details:');
      for (let poolName of this.pools.keys()) {
        const stats = this.getStats(poolName);
        console.log(`\n   Pool: "${poolName}"`);
        console.log(`      Available: ${stats.available}, In Use: ${stats.inUse}, Peak: ${stats.peakInUse}`);
        console.log(`      Reuse Rate: ${stats.reuseRate}%`);
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

module.exports = MemoryPool;
