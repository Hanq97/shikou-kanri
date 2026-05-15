/**
 * MemoryMonitor - Real-Time Memory Usage Monitoring
 *
 * Monitors memory usage with:
 * - Heap usage tracking (used/total)
 * - Memory leak alerts (continuous growth detection)
 * - GC pause time monitoring
 * - Memory usage dashboard integration
 *
 * @version 3.9.0
 * @date 2025-12-25
 */

class MemoryMonitor {
  constructor(options = {}) {
    // Configuration
    this.config = {
      sampleInterval: options.sampleInterval || 5000,      // 5 seconds
      alertThreshold: options.alertThreshold || 500,       // 500MB
      leakThreshold: options.leakThreshold || 50,          // 50MB growth
      enableAlerts: options.enableAlerts !== false,
      maxSamples: options.maxSamples || 100,
      ...options
    };

    // Memory samples
    this.samples = [];

    // Alert history
    this.alerts = [];

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
      console.warn('[MemoryMonitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    this.startTime = Date.now();

    // Take initial sample
    this.takeSample();

    // Setup interval
    this.monitoringTimer = setInterval(() => {
      this.takeSample();
    }, this.config.sampleInterval);

    // Don't keep process alive
    if (this.monitoringTimer.unref) {
      this.monitoringTimer.unref();
    }

    console.log(`[MemoryMonitor] Monitoring started (interval: ${this.config.sampleInterval}ms)`);
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

    console.log('[MemoryMonitor] Monitoring stopped');
  }

  /**
   * Take memory sample
   * @returns {object} Memory sample
   */
  takeSample() {
    const usage = process.memoryUsage();

    const sample = {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      heapUsedMB: parseFloat((usage.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMB: parseFloat((usage.heapTotal / 1024 / 1024).toFixed(2)),
      externalMB: parseFloat((usage.external / 1024 / 1024).toFixed(2)),
      rssMB: parseFloat((usage.rss / 1024 / 1024).toFixed(2))
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
   * Check for alert conditions
   * @param {object} sample - Current memory sample
   */
  checkAlerts(sample) {
    // Alert 1: High memory usage
    if (sample.heapUsedMB > this.config.alertThreshold) {
      this.addAlert('HIGH_MEMORY', `Heap usage ${sample.heapUsedMB}MB exceeds threshold ${this.config.alertThreshold}MB`);
    }

    // Alert 2: Memory leak detection
    if (this.samples.length >= 5) {
      const leakDetection = this.detectLeak();
      if (leakDetection.detected) {
        this.addAlert('MEMORY_LEAK', `Memory leak detected: ${leakDetection.growth} growth (${leakDetection.growthRate})`);
      }
    }

    // Alert 3: High heap fragmentation
    const fragmentation = ((sample.heapTotal - sample.heapUsed) / sample.heapTotal) * 100;
    if (fragmentation > 50) {
      this.addAlert('HIGH_FRAGMENTATION', `Heap fragmentation ${fragmentation.toFixed(2)}% (consider GC)`);
    }
  }

  /**
   * Add alert
   * @param {string} type - Alert type
   * @param {string} message - Alert message
   */
  addAlert(type, message) {
    const alert = {
      type,
      message,
      timestamp: Date.now(),
      timestampISO: new Date().toISOString()
    };

    this.alerts.push(alert);

    // Keep only recent alerts (max 50)
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }

    console.warn(`[MemoryMonitor] ALERT [${type}]: ${message}`);
  }

  /**
   * Detect memory leak
   * @returns {object} Leak detection result
   */
  detectLeak() {
    if (this.samples.length < 5) {
      return { detected: false, reason: 'Insufficient samples' };
    }

    // Get recent samples (last 5)
    const recentSamples = this.samples.slice(-5);

    // Check for continuous growth
    let continuousGrowth = true;
    for (let i = 1; i < recentSamples.length; i++) {
      if (recentSamples[i].heapUsed < recentSamples[i - 1].heapUsed) {
        continuousGrowth = false;
        break;
      }
    }

    // Calculate growth
    const first = recentSamples[0];
    const last = recentSamples[recentSamples.length - 1];
    const growth = last.heapUsed - first.heapUsed;
    const growthMB = growth / 1024 / 1024;

    const timeSpan = last.timestamp - first.timestamp;
    const growthRate = (growth / timeSpan) * 1000; // bytes per second

    const detected = continuousGrowth && growthMB > this.config.leakThreshold;

    return {
      detected,
      growth: growthMB.toFixed(2) + 'MB',
      growthRate: (growthRate / 1024).toFixed(2) + 'KB/s',
      continuousGrowth,
      samples: recentSamples.length
    };
  }

  /**
   * Get current memory usage
   * @returns {object} Current usage
   */
  getCurrentUsage() {
    if (this.samples.length === 0) {
      return this.takeSample();
    }

    return this.samples[this.samples.length - 1];
  }

  /**
   * Get memory statistics
   * @returns {object} Statistics object
   */
  getStats() {
    if (this.samples.length === 0) {
      return null;
    }

    // Calculate min/max/avg
    const heapUsedValues = this.samples.map(s => s.heapUsed);
    const minHeap = Math.min(...heapUsedValues);
    const maxHeap = Math.max(...heapUsedValues);
    const avgHeap = heapUsedValues.reduce((sum, v) => sum + v, 0) / heapUsedValues.length;

    const current = this.getCurrentUsage();
    const uptime = Date.now() - this.startTime;

    return {
      current: {
        heapUsedMB: current.heapUsedMB,
        heapTotalMB: current.heapTotalMB,
        externalMB: current.externalMB,
        rssMB: current.rssMB
      },
      range: {
        minHeapMB: parseFloat((minHeap / 1024 / 1024).toFixed(2)),
        maxHeapMB: parseFloat((maxHeap / 1024 / 1024).toFixed(2)),
        avgHeapMB: parseFloat((avgHeap / 1024 / 1024).toFixed(2))
      },
      samples: this.samples.length,
      alerts: this.alerts.length,
      uptime: Math.round(uptime / 1000) + 's'
    };
  }

  /**
   * Get recent alerts
   * @param {number} limit - Max number of alerts
   * @returns {Array} Recent alerts
   */
  getRecentAlerts(limit = 10) {
    return this.alerts.slice(-limit).reverse();
  }

  /**
   * Clear all alerts
   */
  clearAlerts() {
    this.alerts = [];
  }

  /**
   * Export metrics for monitoring
   * @returns {object} Monitoring data
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      current: this.getCurrentUsage(),
      leakDetection: this.detectLeak(),
      recentAlerts: this.getRecentAlerts(5)
    };
  }

  /**
   * Display dashboard
   */
  displayDashboard() {
    console.log('\n' + '='.repeat(60));
    console.log('💾 MEMORY MONITOR DASHBOARD');
    console.log('='.repeat(60));

    const stats = this.getStats();

    if (!stats) {
      console.log('\nNo data available. Start monitoring first.');
      console.log('\n' + '='.repeat(60) + '\n');
      return;
    }

    console.log('\n📊 Current Memory Usage:');
    console.log(`   Heap Used: ${stats.current.heapUsedMB}MB`);
    console.log(`   Heap Total: ${stats.current.heapTotalMB}MB`);
    console.log(`   External: ${stats.current.externalMB}MB`);
    console.log(`   RSS: ${stats.current.rssMB}MB`);

    console.log('\n📈 Memory Range:');
    console.log(`   Min Heap: ${stats.range.minHeapMB}MB`);
    console.log(`   Max Heap: ${stats.range.maxHeapMB}MB`);
    console.log(`   Avg Heap: ${stats.range.avgHeapMB}MB`);

    const leakDetection = this.detectLeak();
    console.log('\n🔍 Leak Detection:');
    console.log(`   Status: ${leakDetection.detected ? '⚠️  LEAK DETECTED' : '✅ No leak'}`);
    if (leakDetection.detected) {
      console.log(`   Growth: ${leakDetection.growth}`);
      console.log(`   Growth Rate: ${leakDetection.growthRate}`);
    }

    if (this.alerts.length > 0) {
      console.log('\n⚠️  Recent Alerts:');
      const recentAlerts = this.getRecentAlerts(5);
      recentAlerts.forEach((alert, i) => {
        console.log(`   ${i + 1}. [${alert.type}] ${alert.message}`);
      });
    }

    console.log(`\n⏱️  Monitoring: ${stats.samples} samples, ${stats.uptime} uptime`);
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

module.exports = MemoryMonitor;

// CLI usage (if run directly)
if (require.main === module) {
  const monitor = new MemoryMonitor({
    sampleInterval: 2000,  // 2 seconds
    alertThreshold: 200,   // 200MB
    enableAlerts: true
  });

  console.log('Starting memory monitoring...');
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
}
