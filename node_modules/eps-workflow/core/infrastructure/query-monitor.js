/**
 * QueryMonitor - Query Performance Monitoring
 *
 * Tracks and monitors query performance:
 * - Query execution time tracking
 * - Slow query detection (>50ms threshold)
 * - Cache hit rate monitoring
 * - Query statistics dashboard
 *
 * @version 3.9.0
 * @date 2025-12-25
 */

class QueryMonitor {
  constructor(options = {}) {
    // Configuration
    this.config = {
      slowQueryThreshold: options.slowQueryThreshold || 50, // 50ms
      maxHistorySize: options.maxHistorySize || 1000,
      enableDashboard: options.enableDashboard !== false,
      ...options
    };

    // Query history: array of query records
    this.queryHistory = [];

    // Slow queries: array of slow query records
    this.slowQueries = [];

    // Statistics
    this.stats = {
      totalQueries: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      avgTime: 0,
      slowQueryCount: 0
    };

    // Cache statistics (if cache provided)
    this.cacheStats = {
      hits: 0,
      misses: 0,
      hitRate: 0
    };
  }

  /**
   * Record query execution
   * @param {object} queryInfo - Query information
   * @param {string} queryInfo.query - Query string
   * @param {string} queryInfo.category - Query category
   * @param {number} queryInfo.duration - Execution time (ms)
   * @param {boolean} queryInfo.cached - Whether result was cached
   * @param {any} queryInfo.result - Query result (optional)
   */
  recordQuery(queryInfo) {
    const {
      query,
      category = 'default',
      duration,
      cached = false,
      result = null
    } = queryInfo;

    // Create query record
    const record = {
      query,
      category,
      duration,
      cached,
      timestamp: Date.now(),
      timestampISO: new Date().toISOString(),
      isSlow: duration > this.config.slowQueryThreshold
    };

    // Add to history
    this.queryHistory.push(record);

    // Keep history size under limit
    if (this.queryHistory.length > this.config.maxHistorySize) {
      this.queryHistory.shift(); // Remove oldest
    }

    // Track slow queries
    if (record.isSlow) {
      this.slowQueries.push(record);
      this.stats.slowQueryCount++;
    }

    // Update statistics
    this.stats.totalQueries++;
    this.stats.totalTime += duration;
    this.stats.minTime = Math.min(this.stats.minTime, duration);
    this.stats.maxTime = Math.max(this.stats.maxTime, duration);
    this.stats.avgTime = this.stats.totalTime / this.stats.totalQueries;

    // Update cache statistics
    if (cached) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }

    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.hitRate = total > 0
      ? (this.cacheStats.hits / total) * 100
      : 0;
  }

  /**
   * Get slow queries
   * @param {number} limit - Max number of slow queries to return
   * @returns {Array} Slow query records
   */
  getSlowQueries(limit = 10) {
    // Sort by duration (descending)
    const sorted = [...this.slowQueries].sort((a, b) => b.duration - a.duration);
    return sorted.slice(0, limit);
  }

  /**
   * Get recent queries
   * @param {number} limit - Max number of recent queries to return
   * @returns {Array} Recent query records
   */
  getRecentQueries(limit = 10) {
    return this.queryHistory.slice(-limit).reverse();
  }

  /**
   * Get queries by category
   * @param {string} category - Category name
   * @returns {Array} Query records for category
   */
  getQueriesByCategory(category) {
    return this.queryHistory.filter(q => q.category === category);
  }

  /**
   * Get statistics
   * @returns {object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      minTime: this.stats.minTime === Infinity ? 0 : this.stats.minTime,
      avgTime: parseFloat(this.stats.avgTime.toFixed(2)),
      cache: {
        ...this.cacheStats,
        hitRate: parseFloat(this.cacheStats.hitRate.toFixed(2))
      }
    };
  }

  /**
   * Get performance summary
   * @returns {object} Performance summary
   */
  getPerformanceSummary() {
    const total = this.stats.totalQueries;

    if (total === 0) {
      return {
        totalQueries: 0,
        avgTime: 0,
        slowQueryPercent: 0,
        cacheHitRate: 0
      };
    }

    return {
      totalQueries: total,
      avgTime: parseFloat(this.stats.avgTime.toFixed(2)),
      minTime: this.stats.minTime === Infinity ? 0 : this.stats.minTime,
      maxTime: this.stats.maxTime,
      slowQueryCount: this.stats.slowQueryCount,
      slowQueryPercent: parseFloat(((this.stats.slowQueryCount / total) * 100).toFixed(2)),
      cacheHitRate: parseFloat(this.cacheStats.hitRate.toFixed(2))
    };
  }

  /**
   * Display dashboard
   */
  displayDashboard() {
    if (!this.config.enableDashboard) {
      return;
    }

    const summary = this.getPerformanceSummary();
    const slowQueries = this.getSlowQueries(5);

    console.log('\n' + '='.repeat(60));
    console.log('📊 QUERY PERFORMANCE DASHBOARD');
    console.log('='.repeat(60));

    console.log('\n📈 Performance Summary:');
    console.log(`   Total Queries: ${summary.totalQueries}`);
    console.log(`   Avg Time: ${summary.avgTime}ms`);
    console.log(`   Min/Max: ${summary.minTime}ms / ${summary.maxTime}ms`);
    console.log(`   Slow Queries: ${summary.slowQueryCount} (${summary.slowQueryPercent}%)`);
    console.log(`   Cache Hit Rate: ${summary.cacheHitRate}%`);

    if (slowQueries.length > 0) {
      console.log('\n🐌 Top 5 Slow Queries:');
      slowQueries.forEach((q, i) => {
        console.log(`   ${i + 1}. ${q.duration}ms - ${q.category}:${q.query.substring(0, 40)}...`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Export metrics for monitoring
   * @returns {object} Monitoring data
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      performance: this.getPerformanceSummary(),
      slowQueries: this.getSlowQueries(10),
      recentQueries: this.getRecentQueries(10),
      stats: this.getStats()
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.queryHistory = [];
    this.slowQueries = [];
    this.stats = {
      totalQueries: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      avgTime: 0,
      slowQueryCount: 0
    };
    this.cacheStats = {
      hits: 0,
      misses: 0,
      hitRate: 0
    };
  }
}

module.exports = QueryMonitor;
