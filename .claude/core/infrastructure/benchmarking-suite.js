/**
 * BenchmarkingSuite - Automated Performance Testing
 *
 * Features:
 * - Baseline vs current comparison
 * - Regression detection
 * - Performance report generation
 * - CI/CD integration
 *
 * @version 3.9.0
 * @date 2025-12-25
 */

const fs = require('fs').promises;
const path = require('path');

class BenchmarkingSuite {
  constructor(options = {}) {
    this.config = {
      baselineFile: options.baselineFile || path.join(process.cwd(), '.cache', 'performance-baseline.json'),
      reportFile: options.reportFile || path.join(process.cwd(), '.cache', 'performance-report.md'),
      iterations: options.iterations || 100,
      warmupIterations: options.warmupIterations || 10,
      regressionThreshold: options.regressionThreshold || 1.1, // 10% regression allowed
      ...options
    };

    this.baseline = null;
    this.results = [];
  }

  /**
   * Load baseline metrics
   */
  async loadBaseline() {
    try {
      const content = await fs.readFile(this.config.baselineFile, 'utf8');
      this.baseline = JSON.parse(content);
      console.log('[BenchmarkingSuite] Loaded baseline metrics');
      return true;
    } catch (e) {
      console.warn('[BenchmarkingSuite] No baseline found - will create new baseline');
      return false;
    }
  }

  /**
   * Save baseline metrics
   * @param {object} metrics - Baseline metrics
   */
  async saveBaseline(metrics) {
    try {
      const dir = path.dirname(this.config.baselineFile);
      await fs.mkdir(dir, { recursive: true });

      const data = {
        ...metrics,
        timestamp: new Date().toISOString(),
        version: '3.9.0'
      };

      await fs.writeFile(this.config.baselineFile, JSON.stringify(data, null, 2), 'utf8');
      console.log('[BenchmarkingSuite] Saved baseline metrics');
    } catch (e) {
      console.error('[BenchmarkingSuite] Failed to save baseline:', e.message);
    }
  }

  /**
   * Run benchmark tests
   * @returns {object} Benchmark results
   */
  async runBenchmarks() {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 RUNNING PERFORMANCE BENCHMARKS');
    console.log('='.repeat(70));

    const results = {
      timestamp: new Date().toISOString(),
      system: await this.benchmarkSystem(),
      queryOptimization: await this.benchmarkQueryOptimization(),
      memoryOptimization: await this.benchmarkMemoryOptimization(),
      cachingSystem: await this.benchmarkCachingSystem()
    };

    this.results = results;

    // Calculate overall improvement
    if (this.baseline) {
      results.comparison = this.compareWithBaseline(results);
    }

    return results;
  }

  /**
   * Benchmark system metrics
   * @returns {object} System benchmark results
   */
  async benchmarkSystem() {
    console.log('\n📊 Benchmarking System Metrics...');

    const startMemory = process.memoryUsage();
    const startTime = Date.now();

    // Simulate workload
    await this.simulateWorkload(100);

    const endMemory = process.memoryUsage();
    const duration = Date.now() - startTime;

    const results = {
      memoryUsedMB: parseFloat(((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)),
      executionTimeMs: duration,
      memoryPeakMB: parseFloat((endMemory.heapUsed / 1024 / 1024).toFixed(2))
    };

    console.log(`   ✅ Memory Used: ${results.memoryUsedMB}MB`);
    console.log(`   ✅ Execution Time: ${results.executionTimeMs}ms`);
    console.log(`   ✅ Peak Memory: ${results.memoryPeakMB}MB`);

    return results;
  }

  /**
   * Benchmark query optimization
   * @returns {object} Query optimization results
   */
  async benchmarkQueryOptimization() {
    console.log('\n🔍 Benchmarking Query Optimization...');

    const QueryCache = require('./query-cache');
    const cache = new QueryCache();

    // Warmup
    for (let i = 0; i < this.config.warmupIterations; i++) {
      await cache.get(`warmup-${i}`, async () => ({ data: `value-${i}` }));
    }

    // Benchmark cache hits
    const hitTimes = [];
    for (let i = 0; i < this.config.iterations; i++) {
      const key = `hit-test-${i % 10}`; // Repeat keys for cache hits
      const startTime = Date.now();
      await cache.get(key, async () => ({ data: `value-${i}` }));
      hitTimes.push(Date.now() - startTime);
    }

    // Benchmark cache misses
    const missTimes = [];
    for (let i = 0; i < this.config.iterations; i++) {
      const key = `miss-test-${i}`;
      const startTime = Date.now();
      await cache.get(key, async () => {
        await this.sleep(1); // Simulate query
        return { data: `value-${i}` };
      });
      missTimes.push(Date.now() - startTime);
    }

    const stats = cache.getStats();

    const results = {
      hitTimeAvgMs: parseFloat(this.calculateAverage(hitTimes).toFixed(2)),
      hitTimeP95Ms: parseFloat(this.calculatePercentile(hitTimes, 95).toFixed(2)),
      missTimeAvgMs: parseFloat(this.calculateAverage(missTimes).toFixed(2)),
      missTimeP95Ms: parseFloat(this.calculatePercentile(missTimes, 95).toFixed(2)),
      hitRate: stats.hitRate,
      cacheSize: stats.entries
    };

    console.log(`   ✅ Hit Time (avg): ${results.hitTimeAvgMs}ms`);
    console.log(`   ✅ Hit Time (p95): ${results.hitTimeP95Ms}ms`);
    console.log(`   ✅ Miss Time (avg): ${results.missTimeAvgMs}ms`);
    console.log(`   ✅ Hit Rate: ${results.hitRate}%`);

    return results;
  }

  /**
   * Benchmark memory optimization
   * @returns {object} Memory optimization results
   */
  async benchmarkMemoryOptimization() {
    console.log('\n💾 Benchmarking Memory Optimization...');

    const MemoryPool = require('./memory-pool');
    const pool = new MemoryPool({ minSize: 5, maxSize: 100 });

    // Factory function for creating objects
    const factory = () => ({ data: Buffer.alloc(1024) });

    // Benchmark acquires
    const acquireTimes = [];
    const objects = [];

    for (let i = 0; i < this.config.iterations; i++) {
      const startTime = Date.now();
      const obj = pool.acquire('benchmark-pool', factory);
      acquireTimes.push(Date.now() - startTime);
      objects.push(obj);
    }

    // Benchmark releases
    const releaseTimes = [];
    for (let obj of objects) {
      const startTime = Date.now();
      pool.release('benchmark-pool', obj);
      releaseTimes.push(Date.now() - startTime);
    }

    const stats = pool.getStats('benchmark-pool');

    const results = {
      acquireTimeAvgMs: parseFloat(this.calculateAverage(acquireTimes).toFixed(2)),
      acquireTimeP95Ms: parseFloat(this.calculatePercentile(acquireTimes, 95).toFixed(2)),
      releaseTimeAvgMs: parseFloat(this.calculateAverage(releaseTimes).toFixed(2)),
      releaseTimeP95Ms: parseFloat(this.calculatePercentile(releaseTimes, 95).toFixed(2)),
      reuseRate: stats ? (stats.reuseRate || 0) : 0,
      poolUtilization: stats ? (stats.poolUtilization || 0) : 0
    };

    console.log(`   ✅ Acquire Time (avg): ${results.acquireTimeAvgMs}ms`);
    console.log(`   ✅ Acquire Time (p95): ${results.acquireTimeP95Ms}ms`);
    console.log(`   ✅ Release Time (avg): ${results.releaseTimeAvgMs}ms`);
    console.log(`   ✅ Reuse Rate: ${results.reuseRate}%`);

    return results;
  }

  /**
   * Benchmark caching system
   * @returns {object} Caching system results
   */
  async benchmarkCachingSystem() {
    console.log('\n📦 Benchmarking Multi-Level Caching...');

    const MultiLevelCache = require('./multi-level-cache');
    const cache = new MultiLevelCache({
      l1: { maxEntries: 100 },
      l2: { cacheDir: '.test-cache-bench' }
    });

    await cache.init();

    // Benchmark L1 access
    const l1Times = [];
    for (let i = 0; i < this.config.iterations; i++) {
      const key = `l1-test-${i}`;
      await cache.set(key, { data: `value-${i}` });
      const startTime = Date.now();
      await cache.get(key);
      l1Times.push(Date.now() - startTime);
    }

    // Benchmark L2 access
    cache.l1.clear(); // Clear L1 to force L2 access
    const l2Times = [];
    for (let i = 0; i < 20; i++) {
      const key = `l1-test-${i}`;
      const startTime = Date.now();
      await cache.get(key);
      l2Times.push(Date.now() - startTime);
    }

    const stats = cache.getStats();

    const results = {
      l1TimeAvgMs: parseFloat(this.calculateAverage(l1Times).toFixed(2)),
      l1TimeP95Ms: parseFloat(this.calculatePercentile(l1Times, 95).toFixed(2)),
      l2TimeAvgMs: parseFloat(this.calculateAverage(l2Times).toFixed(2)),
      l2TimeP95Ms: parseFloat(this.calculatePercentile(l2Times, 95).toFixed(2)),
      l1HitRate: stats.l1.hitRate,
      l2HitRate: stats.l2.hitRate,
      overallHitRate: stats.overall.hitRate
    };

    // Cleanup
    await cache.clear();

    console.log(`   ✅ L1 Time (avg): ${results.l1TimeAvgMs}ms`);
    console.log(`   ✅ L1 Time (p95): ${results.l1TimeP95Ms}ms`);
    console.log(`   ✅ L2 Time (avg): ${results.l2TimeAvgMs}ms`);
    console.log(`   ✅ Overall Hit Rate: ${results.overallHitRate}%`);

    return results;
  }

  /**
   * Compare current results with baseline
   * @param {object} current - Current benchmark results
   * @returns {object} Comparison results
   */
  compareWithBaseline(current) {
    if (!this.baseline) {
      return null;
    }

    const comparison = {
      system: this.compareMetrics(this.baseline.system, current.system, 'lower'),
      queryOptimization: this.compareMetrics(this.baseline.queryOptimization, current.queryOptimization, 'lower'),
      memoryOptimization: this.compareMetrics(this.baseline.memoryOptimization, current.memoryOptimization, 'lower'),
      cachingSystem: this.compareMetrics(this.baseline.cachingSystem, current.cachingSystem, 'lower')
    };

    // Calculate overall improvement
    const improvements = [
      comparison.system.improvement,
      comparison.queryOptimization.improvement,
      comparison.memoryOptimization.improvement,
      comparison.cachingSystem.improvement
    ];

    comparison.overall = {
      improvement: parseFloat(this.calculateAverage(improvements).toFixed(2)),
      regressions: improvements.filter(i => i < 0).length,
      improvements: improvements.filter(i => i > 0).length
    };

    return comparison;
  }

  /**
   * Compare two metrics
   * @param {object} baseline - Baseline metrics
   * @param {object} current - Current metrics
   * @param {string} direction - 'lower' or 'higher' is better
   * @returns {object} Comparison result
   */
  compareMetrics(baseline, current, direction = 'lower') {
    const improvements = [];

    for (let key in baseline) {
      if (typeof baseline[key] === 'number' && typeof current[key] === 'number') {
        const delta = current[key] - baseline[key];
        const percentChange = (delta / baseline[key]) * 100;
        const improvement = direction === 'lower' ? -percentChange : percentChange;
        improvements.push(improvement);
      }
    }

    return {
      improvement: parseFloat(this.calculateAverage(improvements).toFixed(2))
    };
  }

  /**
   * Detect performance regressions
   * @param {object} comparison - Comparison results
   * @returns {Array} Regressions detected
   */
  detectRegressions(comparison) {
    const regressions = [];

    if (comparison.overall.improvement < 0) {
      regressions.push({
        type: 'OVERALL_REGRESSION',
        severity: 'CRITICAL',
        improvement: comparison.overall.improvement,
        message: `Overall performance regressed by ${Math.abs(comparison.overall.improvement)}%`
      });
    }

    return regressions;
  }

  /**
   * Generate performance report
   * @param {object} results - Benchmark results
   * @returns {string} Markdown report
   */
  generateReport(results) {
    const lines = [];

    lines.push('# Performance Benchmark Report');
    lines.push('');
    lines.push(`**Date**: ${results.timestamp}`);
    lines.push(`**Version**: 3.9.0`);
    lines.push('');

    // System metrics
    lines.push('## System Metrics');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Memory Used | ${results.system.memoryUsedMB}MB |`);
    lines.push(`| Execution Time | ${results.system.executionTimeMs}ms |`);
    lines.push(`| Peak Memory | ${results.system.memoryPeakMB}MB |`);
    lines.push('');

    // Query optimization
    lines.push('## Query Optimization');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Hit Time (avg) | ${results.queryOptimization.hitTimeAvgMs}ms |`);
    lines.push(`| Hit Time (p95) | ${results.queryOptimization.hitTimeP95Ms}ms |`);
    lines.push(`| Miss Time (avg) | ${results.queryOptimization.missTimeAvgMs}ms |`);
    lines.push(`| Hit Rate | ${results.queryOptimization.hitRate}% |`);
    lines.push('');

    // Memory optimization
    lines.push('## Memory Optimization');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Acquire Time (avg) | ${results.memoryOptimization.acquireTimeAvgMs}ms |`);
    lines.push(`| Release Time (avg) | ${results.memoryOptimization.releaseTimeAvgMs}ms |`);
    lines.push(`| Reuse Rate | ${results.memoryOptimization.reuseRate}% |`);
    lines.push('');

    // Caching system
    lines.push('## Multi-Level Caching');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| L1 Time (avg) | ${results.cachingSystem.l1TimeAvgMs}ms |`);
    lines.push(`| L2 Time (avg) | ${results.cachingSystem.l2TimeAvgMs}ms |`);
    lines.push(`| Overall Hit Rate | ${results.cachingSystem.overallHitRate}% |`);
    lines.push('');

    // Comparison with baseline
    if (results.comparison) {
      lines.push('## Baseline Comparison');
      lines.push('');
      lines.push(`**Overall Improvement**: ${results.comparison.overall.improvement}%`);
      lines.push('');
      lines.push('| Category | Improvement |');
      lines.push('|----------|-------------|');
      lines.push(`| System | ${results.comparison.system.improvement}% |`);
      lines.push(`| Query Optimization | ${results.comparison.queryOptimization.improvement}% |`);
      lines.push(`| Memory Optimization | ${results.comparison.memoryOptimization.improvement}% |`);
      lines.push(`| Caching System | ${results.comparison.cachingSystem.improvement}% |`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Save performance report
   * @param {string} report - Markdown report
   */
  async saveReport(report) {
    try {
      const dir = path.dirname(this.config.reportFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.config.reportFile, report, 'utf8');
      console.log(`\n📄 Report saved to: ${this.config.reportFile}`);
    } catch (e) {
      console.error('[BenchmarkingSuite] Failed to save report:', e.message);
    }
  }

  /**
   * Simulate workload
   * @param {number} iterations - Number of iterations
   */
  async simulateWorkload(iterations) {
    const data = [];
    for (let i = 0; i < iterations; i++) {
      data.push({ id: i, value: Math.random() });
    }
    await this.sleep(10);
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
   * Calculate percentile
   * @param {Array<number>} values - Values array
   * @param {number} percentile - Percentile (0-100)
   * @returns {number} Percentile value
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

module.exports = BenchmarkingSuite;

// CLI usage (if run directly)
if (require.main === module) {
  const suite = new BenchmarkingSuite();

  (async () => {
    console.log('Starting performance benchmarking...\n');

    // Load baseline
    const hasBaseline = await suite.loadBaseline();

    // Run benchmarks
    const results = await suite.runBenchmarks();

    // Generate report
    const report = suite.generateReport(results);
    await suite.saveReport(report);

    // Display results
    console.log('\n' + '='.repeat(70));
    console.log('📊 BENCHMARK RESULTS');
    console.log('='.repeat(70));

    if (results.comparison) {
      console.log(`\n✅ Overall Improvement: ${results.comparison.overall.improvement}%`);
      console.log(`   Improvements: ${results.comparison.overall.improvements}`);
      console.log(`   Regressions: ${results.comparison.overall.regressions}`);

      if (results.comparison.overall.improvement >= 20) {
        console.log('\n🎉 SUCCESS: Performance improvement ≥20% target achieved!');
      } else if (results.comparison.overall.improvement > 0) {
        console.log('\n⚠️  WARNING: Performance improved but below 20% target');
      } else {
        console.log('\n❌ FAILURE: Performance regressed compared to baseline');
      }
    } else {
      console.log('\nℹ️  No baseline available - saving current results as baseline');
      await suite.saveBaseline(results);
    }

    console.log('\n' + '='.repeat(70) + '\n');
  })();
}
