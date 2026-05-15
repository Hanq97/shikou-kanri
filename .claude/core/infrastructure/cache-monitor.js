/**
 * CacheMonitor - Cache Performance Monitoring
 *
 * Monitors cache performance with:
 * - Hit/miss rate per cache level (L1, L2)
 * - Cache size monitoring (entries, bytes)
 * - Eviction statistics
 * - Cache performance metrics dashboard
 *
 * @version 3.9.0
 * @date 2025-12-25
 */

class CacheMonitor {
  constructor(cache, options = {}) {
    this.cache = cache;

    this.config = {
      sampleInterval: options.sampleInterval || 10000, // 10 seconds
      maxSamples: options.maxSamples || 100,
      enableAutoSampling: options.enableAutoSampling !== false,
      ...options
    };

    // Performance samples
    this.samples = [];

    // Monitoring state
    this.isMonitoring = false;
    this.monitoringTimer = null;

    // Start time
    this.startTime = Date.now();
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isMonitoring) {
      console.warn('[CacheMonitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    this.startTime = Date.now();

    // Take initial sample
    this.takeSample();

    // Setup interval
    if (this.config.enableAutoSampling) {
      this.monitoringTimer = setInterval(() => {
        this.takeSample();
      }, this.config.sampleInterval);

      // Don't keep process alive
      if (this.monitoringTimer.unref) {
        this.monitoringTimer.unref();
      }
    }

    console.log(`[CacheMonitor] Monitoring started (interval: ${this.config.sampleInterval}ms)`);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    console.log('[CacheMonitor] Monitoring stopped');
  }

  /**
   * Take performance sample
   * @returns {object} Performance sample
   */
  takeSample() {
    const stats = this.cache.getStats();

    const sample = {
      timestamp: Date.now(),
      timestampISO: new Date().toISOString(),
      l1: {
        ...stats.l1,
        entries: stats.l1.entries,
        sizeMB: stats.l1.sizeMB,
        hitRate: stats.l1.hitRate,
        evictions: stats.l1.evictions
      },
      l2: {
        ...stats.l2,
        entries: stats.l2.entries,
        sizeMB: stats.l2.sizeMB,
        hitRate: stats.l2.hitRate,
        evictions: stats.l2.evictions
      },
      overall: {
        ...stats.overall,
        hitRate: stats.overall.hitRate,
        totalEntries: stats.overall.totalEntries,
        totalSizeMB: stats.overall.totalSizeMB
      }
    };

    this.samples.push(sample);

    // Keep only recent samples
    if (this.samples.length > this.config.maxSamples) {
      this.samples.shift();
    }

    return sample;
  }

  /**
   * Get current snapshot
   * @returns {object} Current snapshot
   */
  getCurrentSnapshot() {
    if (this.samples.length === 0) {
      return this.takeSample();
    }

    return this.samples[this.samples.length - 1];
  }

  /**
   * Get performance statistics
   * @returns {object} Statistics object
   */
  getStats() {
    if (this.samples.length === 0) {
      return null;
    }

    const current = this.getCurrentSnapshot();

    // Calculate trends
    const l1HitRates = this.samples.map(s => s.l1.hitRate);
    const l2HitRates = this.samples.map(s => s.l2.hitRate);
    const overallHitRates = this.samples.map(s => s.overall.hitRate);

    const avgL1HitRate = this.calculateAverage(l1HitRates);
    const avgL2HitRate = this.calculateAverage(l2HitRates);
    const avgOverallHitRate = this.calculateAverage(overallHitRates);

    const uptime = Date.now() - this.startTime;

    return {
      current,
      averages: {
        l1HitRate: parseFloat(avgL1HitRate.toFixed(2)),
        l2HitRate: parseFloat(avgL2HitRate.toFixed(2)),
        overallHitRate: parseFloat(avgOverallHitRate.toFixed(2))
      },
      samples: this.samples.length,
      uptime: Math.round(uptime / 1000) + 's'
    };
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
   * Get performance trend
   * @param {string} metric - Metric name (e.g., 'hitRate', 'entries')
   * @param {string} level - Cache level ('l1', 'l2', 'overall')
   * @returns {Array} Trend data
   */
  getTrend(metric, level = 'overall') {
    return this.samples.map(sample => ({
      timestamp: sample.timestamp,
      value: sample[level][metric]
    }));
  }

  /**
   * Detect performance issues
   * @returns {Array} Issues detected
   */
  detectIssues() {
    const issues = [];
    const current = this.getCurrentSnapshot();

    if (!current) {
      return issues;
    }

    // Issue 1: Low overall hit rate
    if (current.overall.hitRate < 70) {
      issues.push({
        type: 'LOW_HIT_RATE',
        severity: 'WARNING',
        message: `Overall cache hit rate ${current.overall.hitRate}% is below 70% target`,
        recommendation: 'Consider increasing cache sizes or adjusting TTL'
      });
    }

    // Issue 2: High L1 evictions
    if (current.l1.evictions > 100) {
      issues.push({
        type: 'HIGH_L1_EVICTIONS',
        severity: 'INFO',
        message: `L1 cache has ${current.l1.evictions} evictions`,
        recommendation: 'Consider increasing L1 cache size'
      });
    }

    // Issue 3: L1 cache near capacity
    const l1Utilization = (current.l1.entries / 1000) * 100; // Assuming max 1000 entries
    if (l1Utilization > 90) {
      issues.push({
        type: 'HIGH_L1_UTILIZATION',
        severity: 'WARNING',
        message: `L1 cache utilization ${l1Utilization.toFixed(2)}% is near capacity`,
        recommendation: 'L1 cache may need more capacity or aggressive eviction'
      });
    }

    // Issue 4: L2 cache near capacity
    const l2Utilization = (current.l2.sizeMB / 500) * 100; // Assuming max 500MB
    if (l2Utilization > 90) {
      issues.push({
        type: 'HIGH_L2_UTILIZATION',
        severity: 'WARNING',
        message: `L2 cache utilization ${l2Utilization.toFixed(2)}% is near capacity`,
        recommendation: 'L2 cache may need cleanup or size increase'
      });
    }

    return issues;
  }

  /**
   * Export metrics for monitoring
   * @returns {object} Monitoring data
   */
  exportMetrics() {
    const stats = this.getStats();

    if (!stats) {
      return {
        timestamp: new Date().toISOString(),
        error: 'No samples available'
      };
    }

    return {
      timestamp: new Date().toISOString(),
      current: stats.current,
      averages: stats.averages,
      issues: this.detectIssues(),
      uptime: stats.uptime,
      samples: stats.samples
    };
  }

  /**
   * Display dashboard
   */
  displayDashboard() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CACHE MONITOR DASHBOARD');
    console.log('='.repeat(60));

    const stats = this.getStats();

    if (!stats) {
      console.log('\nNo data available. Start monitoring first.');
      console.log('\n' + '='.repeat(60) + '\n');
      return;
    }

    console.log('\n💨 L1 Cache (In-Memory):');
    console.log(`   Entries: ${stats.current.l1.entries}`);
    console.log(`   Size: ${stats.current.l1.sizeMB}MB`);
    console.log(`   Hit Rate: ${stats.current.l1.hitRate}% (avg: ${stats.averages.l1HitRate}%)`);
    console.log(`   Evictions: ${stats.current.l1.evictions}`);

    console.log('\n💾 L2 Cache (Disk):');
    console.log(`   Entries: ${stats.current.l2.entries}`);
    console.log(`   Size: ${stats.current.l2.sizeMB}MB`);
    console.log(`   Hit Rate: ${stats.current.l2.hitRate}% (avg: ${stats.averages.l2HitRate}%)`);
    console.log(`   Evictions: ${stats.current.l2.evictions}`);

    console.log('\n📈 Overall Performance:');
    console.log(`   Total Entries: ${stats.current.overall.totalEntries}`);
    console.log(`   Total Size: ${stats.current.overall.totalSizeMB}MB`);
    console.log(`   Overall Hit Rate: ${stats.current.overall.hitRate}% (avg: ${stats.averages.overallHitRate}%)`);

    const issues = this.detectIssues();
    if (issues.length > 0) {
      console.log('\n⚠️  Performance Issues:');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. [${issue.severity}] ${issue.type}`);
        console.log(`      ${issue.message}`);
        console.log(`      → ${issue.recommendation}`);
      });
    } else {
      console.log('\n✅ No performance issues detected');
    }

    console.log(`\n⏱️  Monitoring: ${stats.samples} samples, ${stats.uptime} uptime`);
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

module.exports = CacheMonitor;

// CLI usage (if run directly)
if (require.main === module) {
  const MultiLevelCache = require('./multi-level-cache');
  const cache = new MultiLevelCache();

  (async () => {
    await cache.init();

    const monitor = new CacheMonitor(cache, {
      sampleInterval: 5000,  // 5 seconds
      enableAutoSampling: true
    });

    console.log('Starting cache monitoring...');
    console.log('Press Ctrl+C to stop\n');

    monitor.start();

    // Display dashboard every 10 seconds
    setInterval(() => {
      monitor.displayDashboard();
    }, 10000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nStopping monitoring...');
      monitor.stop();
      monitor.displayDashboard();
      process.exit(0);
    });
  })();
}
