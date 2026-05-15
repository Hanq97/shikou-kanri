/**
 * PerformanceDashboard - Real-Time Performance Monitoring
 *
 * Features:
 * - Real-time metrics display (query time, memory, cache hit rate)
 * - Historical trend charts (last 24h, 7d, 30d)
 * - Bottleneck visualization
 * - Performance alert system
 *
 * @version 3.9.0
 * @date 2025-12-25
 */

const fs = require('fs').promises;
const path = require('path');

class PerformanceDashboard {
  constructor(options = {}) {
    this.config = {
      sampleInterval: options.sampleInterval || 5000, // 5 seconds
      maxSamples: options.maxSamples || 1000,
      historyFile: options.historyFile || path.join(process.cwd(), '.cache', 'performance-history.json'),
      alertThresholds: options.alertThresholds || {
        queryTimeMs: 100,
        memoryUsageMB: 500,
        cacheHitRate: 70,
        cpuUsagePercent: 80
      },
      enableAlerts: options.enableAlerts !== false,
      enableAutoSave: options.enableAutoSave !== false,
      ...options
    };

    // Performance samples
    this.samples = [];
    this.alerts = [];

    // Monitoring state
    this.isMonitoring = false;
    this.monitoringTimer = null;
    this.startTime = Date.now();

    // External integrations
    this.queryCache = null;
    this.memoryPool = null;
    this.multiLevelCache = null;
  }

  /**
   * Integrate with performance components
   * @param {object} components - Performance components
   */
  integrate(components) {
    if (components.queryCache) {
      this.queryCache = components.queryCache;
    }
    if (components.memoryPool) {
      this.memoryPool = components.memoryPool;
    }
    if (components.multiLevelCache) {
      this.multiLevelCache = components.multiLevelCache;
    }
  }

  /**
   * Start monitoring
   */
  async start() {
    if (this.isMonitoring) {
      console.warn('[PerformanceDashboard] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    this.startTime = Date.now();

    // Load historical data
    await this.loadHistory();

    // Take initial sample
    await this.takeSample();

    // Setup interval
    this.monitoringTimer = setInterval(async () => {
      await this.takeSample();
    }, this.config.sampleInterval);

    // Don't keep process alive
    if (this.monitoringTimer.unref) {
      this.monitoringTimer.unref();
    }

    console.log(`[PerformanceDashboard] Monitoring started (interval: ${this.config.sampleInterval}ms)`);
  }

  /**
   * Stop monitoring
   */
  async stop() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    // Save history
    if (this.config.enableAutoSave) {
      await this.saveHistory();
    }

    console.log('[PerformanceDashboard] Monitoring stopped');
  }

  /**
   * Take performance sample
   * @returns {object} Performance sample
   */
  async takeSample() {
    const timestamp = Date.now();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const sample = {
      timestamp,
      timestampISO: new Date().toISOString(),

      // System metrics
      system: {
        memoryUsedMB: parseFloat((memoryUsage.heapUsed / 1024 / 1024).toFixed(2)),
        memoryTotalMB: parseFloat((memoryUsage.heapTotal / 1024 / 1024).toFixed(2)),
        memoryUtilization: parseFloat(((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2)),
        cpuUserMs: Math.round(cpuUsage.user / 1000),
        cpuSystemMs: Math.round(cpuUsage.system / 1000)
      },

      // Query cache metrics
      queryCache: this.queryCache ? this.getQueryCacheMetrics() : null,

      // Memory pool metrics
      memoryPool: this.memoryPool ? this.getMemoryPoolMetrics() : null,

      // Multi-level cache metrics
      multiLevelCache: this.multiLevelCache ? this.getMultiLevelCacheMetrics() : null
    };

    this.samples.push(sample);

    // Keep only recent samples
    if (this.samples.length > this.config.maxSamples) {
      this.samples.shift();
    }

    // Check for alerts
    if (this.config.enableAlerts) {
      this.checkAlerts(sample);
    }

    return sample;
  }

  /**
   * Get query cache metrics
   * @returns {object} Query cache metrics
   */
  getQueryCacheMetrics() {
    try {
      const stats = this.queryCache.getStats();
      return {
        hitRate: stats.hitRate,
        entries: stats.entries,
        sizeMB: stats.sizeMB,
        avgQueryTimeMs: stats.avgQueryTime || 0
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Get memory pool metrics
   * @returns {object} Memory pool metrics
   */
  getMemoryPoolMetrics() {
    try {
      const stats = this.memoryPool.getStats();
      return {
        poolSizeMB: stats.poolSizeMB,
        allocatedMB: stats.allocatedMB,
        utilization: stats.utilization,
        fragmentationRate: stats.fragmentationRate
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Get multi-level cache metrics
   * @returns {object} Multi-level cache metrics
   */
  getMultiLevelCacheMetrics() {
    try {
      const stats = this.multiLevelCache.getStats();
      return {
        l1HitRate: stats.l1.hitRate,
        l2HitRate: stats.l2.hitRate,
        overallHitRate: stats.overall.hitRate,
        totalEntries: stats.overall.totalEntries,
        totalSizeMB: stats.overall.totalSizeMB
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Check for performance alerts
   * @param {object} sample - Performance sample
   */
  checkAlerts(sample) {
    const alerts = [];

    // Alert 1: High memory usage
    if (sample.system.memoryUsedMB > this.config.alertThresholds.memoryUsageMB) {
      alerts.push({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'WARNING',
        message: `Memory usage ${sample.system.memoryUsedMB}MB exceeds threshold ${this.config.alertThresholds.memoryUsageMB}MB`,
        timestamp: sample.timestampISO
      });
    }

    // Alert 2: Low cache hit rate
    if (sample.multiLevelCache && sample.multiLevelCache.overallHitRate < this.config.alertThresholds.cacheHitRate) {
      alerts.push({
        type: 'LOW_CACHE_HIT_RATE',
        severity: 'WARNING',
        message: `Cache hit rate ${sample.multiLevelCache.overallHitRate}% below threshold ${this.config.alertThresholds.cacheHitRate}%`,
        timestamp: sample.timestampISO
      });
    }

    // Alert 3: High query time
    if (sample.queryCache && sample.queryCache.avgQueryTimeMs > this.config.alertThresholds.queryTimeMs) {
      alerts.push({
        type: 'HIGH_QUERY_TIME',
        severity: 'WARNING',
        message: `Average query time ${sample.queryCache.avgQueryTimeMs}ms exceeds threshold ${this.config.alertThresholds.queryTimeMs}ms`,
        timestamp: sample.timestampISO
      });
    }

    // Alert 4: High memory utilization
    if (sample.system.memoryUtilization > 90) {
      alerts.push({
        type: 'HIGH_MEMORY_UTILIZATION',
        severity: 'CRITICAL',
        message: `Memory utilization ${sample.system.memoryUtilization}% is critically high`,
        timestamp: sample.timestampISO
      });
    }

    // Store alerts
    if (alerts.length > 0) {
      this.alerts.push(...alerts);
      alerts.forEach(alert => {
        console.warn(`[PerformanceDashboard] [${alert.severity}] ${alert.type}: ${alert.message}`);
      });
    }
  }

  /**
   * Get current snapshot
   * @returns {object} Current snapshot
   */
  getCurrentSnapshot() {
    if (this.samples.length === 0) {
      return null;
    }
    return this.samples[this.samples.length - 1];
  }

  /**
   * Get performance statistics
   * @param {string} period - Time period ('1h', '24h', '7d', '30d')
   * @returns {object} Statistics object
   */
  getStats(period = '1h') {
    if (this.samples.length === 0) {
      return null;
    }

    const periodMs = this.parsePeriod(period);
    const cutoff = Date.now() - periodMs;
    const periodSamples = this.samples.filter(s => s.timestamp >= cutoff);

    if (periodSamples.length === 0) {
      return null;
    }

    // Calculate averages
    const avgMemory = this.calculateAverage(periodSamples.map(s => s.system.memoryUsedMB));
    const avgMemoryUtil = this.calculateAverage(periodSamples.map(s => s.system.memoryUtilization));

    const stats = {
      period,
      samples: periodSamples.length,
      system: {
        avgMemoryMB: parseFloat(avgMemory.toFixed(2)),
        avgMemoryUtilization: parseFloat(avgMemoryUtil.toFixed(2)),
        currentMemoryMB: periodSamples[periodSamples.length - 1].system.memoryUsedMB
      }
    };

    // Add query cache stats if available
    if (periodSamples[0].queryCache) {
      const avgHitRate = this.calculateAverage(periodSamples.map(s => s.queryCache?.hitRate || 0));
      const avgQueryTime = this.calculateAverage(periodSamples.map(s => s.queryCache?.avgQueryTimeMs || 0));
      stats.queryCache = {
        avgHitRate: parseFloat(avgHitRate.toFixed(2)),
        avgQueryTimeMs: parseFloat(avgQueryTime.toFixed(2))
      };
    }

    // Add multi-level cache stats if available
    if (periodSamples[0].multiLevelCache) {
      const avgHitRate = this.calculateAverage(periodSamples.map(s => s.multiLevelCache?.overallHitRate || 0));
      stats.multiLevelCache = {
        avgHitRate: parseFloat(avgHitRate.toFixed(2))
      };
    }

    return stats;
  }

  /**
   * Parse time period
   * @param {string} period - Time period string
   * @returns {number} Milliseconds
   */
  parsePeriod(period) {
    const map = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000
    };
    return map[period] || 3600000;
  }

  /**
   * Calculate average
   * @param {Array<number>} values - Values array
   * @returns {number} Average value
   */
  calculateAverage(values) {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Get historical trend
   * @param {string} metric - Metric path (e.g., 'system.memoryUsedMB')
   * @param {string} period - Time period
   * @returns {Array} Trend data
   */
  getTrend(metric, period = '24h') {
    const periodMs = this.parsePeriod(period);
    const cutoff = Date.now() - periodMs;
    const periodSamples = this.samples.filter(s => s.timestamp >= cutoff);

    return periodSamples.map(sample => ({
      timestamp: sample.timestamp,
      timestampISO: sample.timestampISO,
      value: this.getNestedValue(sample, metric)
    }));
  }

  /**
   * Get nested object value by path
   * @param {object} obj - Object
   * @param {string} path - Path (e.g., 'system.memoryUsedMB')
   * @returns {*} Value
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  /**
   * Load historical data
   */
  async loadHistory() {
    try {
      const content = await fs.readFile(this.config.historyFile, 'utf8');
      const data = JSON.parse(content);
      this.samples = data.samples || [];
      this.alerts = data.alerts || [];
      console.log(`[PerformanceDashboard] Loaded ${this.samples.length} historical samples`);
    } catch (e) {
      // File doesn't exist or invalid - start fresh
      this.samples = [];
      this.alerts = [];
    }
  }

  /**
   * Save historical data
   */
  async saveHistory() {
    try {
      const dir = path.dirname(this.config.historyFile);
      await fs.mkdir(dir, { recursive: true });

      const data = {
        samples: this.samples,
        alerts: this.alerts,
        lastUpdated: new Date().toISOString()
      };

      await fs.writeFile(this.config.historyFile, JSON.stringify(data, null, 2), 'utf8');
      console.log(`[PerformanceDashboard] Saved ${this.samples.length} samples to history`);
    } catch (e) {
      console.error('[PerformanceDashboard] Failed to save history:', e.message);
    }
  }

  /**
   * Display dashboard
   * @param {string} period - Time period to display
   */
  displayDashboard(period = '1h') {
    console.log('\n' + '='.repeat(70));
    console.log('📊 PERFORMANCE DASHBOARD');
    console.log('='.repeat(70));

    const current = this.getCurrentSnapshot();
    if (!current) {
      console.log('\nNo data available. Start monitoring first.');
      console.log('\n' + '='.repeat(70) + '\n');
      return;
    }

    const stats = this.getStats(period);
    const uptime = Math.round((Date.now() - this.startTime) / 1000);

    console.log(`\n⏱️  Monitoring: ${stats.samples} samples, ${uptime}s uptime, period: ${period}`);

    // System metrics
    console.log('\n💻 System Metrics:');
    console.log(`   Memory: ${current.system.memoryUsedMB}MB / ${current.system.memoryTotalMB}MB (${current.system.memoryUtilization}%)`);
    console.log(`   Average Memory (${period}): ${stats.system.avgMemoryMB}MB (${stats.system.avgMemoryUtilization}%)`);

    // Query cache metrics
    if (current.queryCache && stats.queryCache) {
      console.log('\n🔍 Query Cache:');
      console.log(`   Hit Rate: ${current.queryCache.hitRate}% (avg: ${stats.queryCache.avgHitRate}%)`);
      console.log(`   Entries: ${current.queryCache.entries}`);
      console.log(`   Size: ${current.queryCache.sizeMB}MB`);
      console.log(`   Avg Query Time: ${stats.queryCache.avgQueryTimeMs}ms`);
    }

    // Memory pool metrics
    if (current.memoryPool) {
      console.log('\n💾 Memory Pool:');
      console.log(`   Pool Size: ${current.memoryPool.poolSizeMB}MB`);
      console.log(`   Allocated: ${current.memoryPool.allocatedMB}MB (${current.memoryPool.utilization}%)`);
      console.log(`   Fragmentation: ${current.memoryPool.fragmentationRate}%`);
    }

    // Multi-level cache metrics
    if (current.multiLevelCache && stats.multiLevelCache) {
      console.log('\n📦 Multi-Level Cache:');
      console.log(`   L1 Hit Rate: ${current.multiLevelCache.l1HitRate}%`);
      console.log(`   L2 Hit Rate: ${current.multiLevelCache.l2HitRate}%`);
      console.log(`   Overall Hit Rate: ${current.multiLevelCache.overallHitRate}% (avg: ${stats.multiLevelCache.avgHitRate}%)`);
      console.log(`   Total Entries: ${current.multiLevelCache.totalEntries}`);
      console.log(`   Total Size: ${current.multiLevelCache.totalSizeMB}MB`);
    }

    // Recent alerts
    const recentAlerts = this.alerts.slice(-5);
    if (recentAlerts.length > 0) {
      console.log('\n⚠️  Recent Alerts:');
      recentAlerts.forEach((alert, i) => {
        console.log(`   ${i + 1}. [${alert.severity}] ${alert.type} - ${alert.timestamp}`);
        console.log(`      ${alert.message}`);
      });
    } else {
      console.log('\n✅ No recent alerts');
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }

  /**
   * Export metrics for monitoring
   * @param {string} format - Export format ('json', 'csv')
   * @returns {string} Exported data
   */
  exportMetrics(format = 'json') {
    if (format === 'json') {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        current: this.getCurrentSnapshot(),
        stats: {
          '1h': this.getStats('1h'),
          '24h': this.getStats('24h'),
          '7d': this.getStats('7d')
        },
        alerts: this.alerts.slice(-10)
      }, null, 2);
    } else if (format === 'csv') {
      // CSV export
      const lines = ['timestamp,memoryMB,memoryUtil,cacheHitRate,queryTimeMs'];
      this.samples.forEach(sample => {
        const line = [
          sample.timestampISO,
          sample.system.memoryUsedMB,
          sample.system.memoryUtilization,
          sample.multiLevelCache?.overallHitRate || 0,
          sample.queryCache?.avgQueryTimeMs || 0
        ].join(',');
        lines.push(line);
      });
      return lines.join('\n');
    }
    return '';
  }
}

module.exports = PerformanceDashboard;

// CLI usage (if run directly)
if (require.main === module) {
  const dashboard = new PerformanceDashboard({
    sampleInterval: 5000,  // 5 seconds
    enableAlerts: true,
    enableAutoSave: true
  });

  (async () => {
    console.log('Starting performance monitoring...');
    console.log('Press Ctrl+C to stop\n');

    await dashboard.start();

    // Display dashboard every 10 seconds
    setInterval(() => {
      dashboard.displayDashboard('1h');
    }, 10000);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nStopping monitoring...');
      await dashboard.stop();
      dashboard.displayDashboard('1h');
      process.exit(0);
    });
  })();
}
