/**
 * GCOptimizer - Garbage Collection Optimization
 *
 * Improves GC performance through:
 * - Weak references for cache entries
 * - Manual GC triggering at optimal times
 * - Memory leak detection algorithms
 * - GC tuning parameters and monitoring
 *
 * @version 3.9.0
 * @date 2025-12-25
 */

class GCOptimizer {
  constructor(options = {}) {
    // Configuration
    this.config = {
      enableGCMonitoring: options.enableGCMonitoring !== false,
      enableWeakRefs: options.enableWeakRefs !== false,
      gcThreshold: options.gcThreshold || 100 * 1024 * 1024, // 100MB
      leakDetectionThreshold: options.leakDetectionThreshold || 50 * 1024 * 1024, // 50MB growth
      enableAutoGC: options.enableAutoGC || false,
      ...options
    };

    // GC statistics
    this.gcStats = {
      minor: [],          // Scavenge (young generation)
      major: [],          // Mark-sweep-compact (old generation)
      incremental: [],    // Incremental marking
      weakCallbacks: []   // Weak callbacks processing
    };

    // Memory snapshots for leak detection
    this.memorySnapshots = [];
    this.maxSnapshots = 10;

    // Weak reference registry (if supported)
    this.weakRefs = new Map(); // key → WeakRef(value)

    // Setup monitoring if enabled
    if (this.config.enableGCMonitoring) {
      this.setupGCMonitoring();
    }
  }

  /**
   * Setup GC monitoring using perf_hooks
   */
  setupGCMonitoring() {
    try {
      const { PerformanceObserver } = require('perf_hooks');

      const obs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (let entry of entries) {
          if (entry.entryType === 'gc') {
            this.recordGCEvent(entry);
          }
        }
      });

      obs.observe({ entryTypes: ['gc'], buffered: true });

      console.log('[GCOptimizer] GC monitoring enabled');
    } catch (error) {
      console.warn('[GCOptimizer] Failed to setup GC monitoring:', error.message);
    }
  }

  /**
   * Record GC event
   * @param {object} entry - GC performance entry
   */
  recordGCEvent(entry) {
    const event = {
      kind: entry.kind,           // 1=scavenge, 2=mark-sweep-compact, 4=incremental, 8=weak-callbacks
      duration: entry.duration,   // Duration in ms
      timestamp: Date.now(),
      flags: entry.flags || 0
    };

    // Categorize by kind
    if (entry.kind === 1) {
      this.gcStats.minor.push(event);
    } else if (entry.kind === 2) {
      this.gcStats.major.push(event);
    } else if (entry.kind === 4) {
      this.gcStats.incremental.push(event);
    } else if (entry.kind === 8) {
      this.gcStats.weakCallbacks.push(event);
    }

    // Keep only recent events (last 100)
    this.trimGCStats();
  }

  /**
   * Trim GC stats to prevent memory growth
   */
  trimGCStats() {
    const maxEvents = 100;

    if (this.gcStats.minor.length > maxEvents) {
      this.gcStats.minor = this.gcStats.minor.slice(-maxEvents);
    }
    if (this.gcStats.major.length > maxEvents) {
      this.gcStats.major = this.gcStats.major.slice(-maxEvents);
    }
    if (this.gcStats.incremental.length > maxEvents) {
      this.gcStats.incremental = this.gcStats.incremental.slice(-maxEvents);
    }
    if (this.gcStats.weakCallbacks.length > maxEvents) {
      this.gcStats.weakCallbacks = this.gcStats.weakCallbacks.slice(-maxEvents);
    }
  }

  /**
   * Get average GC pause time
   * @param {string} type - GC type ('minor', 'major', 'all')
   * @returns {number} Average pause time in ms
   */
  getAverageGCPauseTime(type = 'all') {
    let events = [];

    if (type === 'minor') {
      events = this.gcStats.minor;
    } else if (type === 'major') {
      events = this.gcStats.major;
    } else {
      events = [
        ...this.gcStats.minor,
        ...this.gcStats.major,
        ...this.gcStats.incremental
      ];
    }

    if (events.length === 0) return 0;

    const totalDuration = events.reduce((sum, gc) => sum + gc.duration, 0);
    return totalDuration / events.length;
  }

  /**
   * Trigger manual GC (requires --expose-gc flag)
   * @returns {boolean} True if GC triggered
   */
  triggerGC() {
    if (typeof global.gc === 'function') {
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();

      const freed = (before.heapUsed - after.heapUsed) / 1024 / 1024;
      console.log(`[GCOptimizer] Manual GC freed ${freed.toFixed(2)}MB`);

      return true;
    } else {
      console.warn('[GCOptimizer] Manual GC not available (use --expose-gc flag)');
      return false;
    }
  }

  /**
   * Take memory snapshot for leak detection
   */
  takeMemorySnapshot() {
    const usage = process.memoryUsage();

    const snapshot = {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    };

    this.memorySnapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.memorySnapshots.length > this.maxSnapshots) {
      this.memorySnapshots.shift();
    }

    return snapshot;
  }

  /**
   * Detect memory leaks
   * @returns {object} Leak detection result
   */
  detectMemoryLeaks() {
    if (this.memorySnapshots.length < 3) {
      return {
        detected: false,
        reason: 'Insufficient snapshots (need at least 3)'
      };
    }

    // Calculate memory growth rate
    const first = this.memorySnapshots[0];
    const last = this.memorySnapshots[this.memorySnapshots.length - 1];

    const growth = last.heapUsed - first.heapUsed;
    const timeSpan = last.timestamp - first.timestamp;
    const growthRate = (growth / timeSpan) * 1000; // bytes per second

    // Check for continuous growth
    let continuousGrowth = true;
    for (let i = 1; i < this.memorySnapshots.length; i++) {
      if (this.memorySnapshots[i].heapUsed < this.memorySnapshots[i - 1].heapUsed) {
        continuousGrowth = false;
        break;
      }
    }

    const leakDetected = continuousGrowth && growth > this.config.leakDetectionThreshold;

    return {
      detected: leakDetected,
      growth: Math.round(growth / 1024 / 1024) + 'MB',
      growthRate: (growthRate / 1024).toFixed(2) + 'KB/s',
      continuousGrowth,
      snapshots: this.memorySnapshots.length,
      recommendation: leakDetected
        ? 'Memory leak detected: Review object retention and cache cleanup'
        : 'No memory leak detected'
    };
  }

  /**
   * Create weak reference for cache entry
   * @param {string} key - Cache key
   * @param {object} value - Value to cache
   * @returns {WeakRef|null} Weak reference or null if not supported
   */
  createWeakRef(key, value) {
    if (!this.config.enableWeakRefs) {
      return null;
    }

    try {
      const weakRef = new WeakRef(value);
      this.weakRefs.set(key, weakRef);
      return weakRef;
    } catch (error) {
      console.warn('[GCOptimizer] WeakRef not supported:', error.message);
      return null;
    }
  }

  /**
   * Get value from weak reference
   * @param {string} key - Cache key
   * @returns {object|null} Cached value or null if collected
   */
  getWeakRef(key) {
    const weakRef = this.weakRefs.get(key);
    if (!weakRef) return null;

    const value = weakRef.deref();
    if (value === undefined) {
      // Value was garbage collected
      this.weakRefs.delete(key);
      return null;
    }

    return value;
  }

  /**
   * Get GC statistics
   * @returns {object} Statistics object
   */
  getStats() {
    return {
      minor: {
        count: this.gcStats.minor.length,
        avgPause: parseFloat(this.getAverageGCPauseTime('minor').toFixed(2))
      },
      major: {
        count: this.gcStats.major.length,
        avgPause: parseFloat(this.getAverageGCPauseTime('major').toFixed(2))
      },
      overall: {
        avgPause: parseFloat(this.getAverageGCPauseTime('all').toFixed(2)),
        totalEvents: this.gcStats.minor.length + this.gcStats.major.length + this.gcStats.incremental.length
      },
      weakRefs: {
        count: this.weakRefs.size,
        enabled: this.config.enableWeakRefs
      }
    };
  }

  /**
   * Get performance recommendations
   * @returns {Array<string>} Recommendations
   */
  getRecommendations() {
    const recommendations = [];
    const avgPause = this.getAverageGCPauseTime('all');

    if (avgPause > 50) {
      recommendations.push(`High GC pause time (${avgPause.toFixed(2)}ms): Consider object pooling or reducing allocations`);
    }

    if (this.gcStats.major.length > 10) {
      recommendations.push(`Frequent major GCs (${this.gcStats.major.length}): Reduce long-lived object allocations`);
    }

    const leakDetection = this.detectMemoryLeaks();
    if (leakDetection.detected) {
      recommendations.push(`Memory leak detected: ${leakDetection.growth} growth (${leakDetection.growthRate})`);
    }

    if (recommendations.length === 0) {
      recommendations.push('GC performance looks healthy');
    }

    return recommendations;
  }

  /**
   * Export metrics for monitoring
   * @returns {object} Monitoring data
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      gc: this.getStats(),
      memory: this.memorySnapshots.length > 0
        ? this.memorySnapshots[this.memorySnapshots.length - 1]
        : process.memoryUsage(),
      leakDetection: this.detectMemoryLeaks(),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Display dashboard
   */
  displayDashboard() {
    console.log('\n' + '='.repeat(60));
    console.log('♻️  GC OPTIMIZER DASHBOARD');
    console.log('='.repeat(60));

    const stats = this.getStats();
    const leakDetection = this.detectMemoryLeaks();

    console.log('\n📊 GC Statistics:');
    console.log(`   Minor GCs: ${stats.minor.count} (avg pause: ${stats.minor.avgPause}ms)`);
    console.log(`   Major GCs: ${stats.major.count} (avg pause: ${stats.major.avgPause}ms)`);
    console.log(`   Overall Avg Pause: ${stats.overall.avgPause}ms`);

    console.log('\n💾 Memory Leak Detection:');
    console.log(`   Status: ${leakDetection.detected ? '⚠️  LEAK DETECTED' : '✅ No leak'}`);
    console.log(`   Growth: ${leakDetection.growth}`);
    console.log(`   Growth Rate: ${leakDetection.growthRate}`);

    const recommendations = this.getRecommendations();
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

module.exports = GCOptimizer;
