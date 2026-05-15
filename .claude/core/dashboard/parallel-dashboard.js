/**
 * Parallel Execution Dashboard
 * 並列実行ダッシュボード
 * Dashboard Thực Thi Song Song
 *
 * Purpose: Visualize and track parallel execution performance
 * Version: 1.0.0
 * Date: 2025-12-23
 */

const fs = require('fs');
const path = require('path');

/**
 * ParallelDashboard class
 * Provides visualization and tracking for parallel execution
 */
class ParallelDashboard {
  constructor(options = {}) {
    this.branch = options.branch || this.getCurrentBranch();
    this.historyFile = path.join(
      '.claude',
      'memory-bank',
      'eps-enhancement',
      this.branch,
      'parallel-history.json'
    );
    this.stats = {};
    this.history = [];

    this.loadHistory();
    this.calculateStats();
  }

  /**
   * Get current git branch
   * @returns {string} Branch name
   */
  getCurrentBranch() {
    try {
      const { execSync } = require('child_process');
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8'
      }).trim();
      return branch;
    } catch (error) {
      return 'dev'; // Default fallback
    }
  }

  /**
   * Load execution history from file
   */
  loadHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf-8');
        this.history = JSON.parse(data);
      } else {
        this.history = [];
      }
    } catch (error) {
      console.error(`Warning: Could not load history: ${error.message}`);
      this.history = [];
    }
  }

  /**
   * Save execution history to file
   */
  saveHistory() {
    try {
      const dir = path.dirname(this.historyFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error(`Warning: Could not save history: ${error.message}`);
    }
  }

  /**
   * Record a new execution
   * @param {Object} execution - Execution data
   */
  recordExecution(execution) {
    const record = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      planId: execution.planId || 'unknown',
      steps: execution.steps || 0,
      levels: execution.levels || 0,
      sequential_time: execution.sequential_time || 0,
      parallel_time: execution.parallel_time || 0,
      speedup: execution.speedup || 1.0,
      parallelization_rate: execution.parallelization_rate || 0,
      concurrent_avg: execution.concurrent_avg || 1,
      safety: {
        violations: execution.violations || 0,
        rollbacks: execution.rollbacks || 0,
        fallbacks: execution.fallbacks || 0
      }
    };

    this.history.push(record);
    this.saveHistory();
    this.calculateStats();
  }

  /**
   * Generate unique ID for execution
   * @returns {string} Unique ID
   */
  generateId() {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate aggregate statistics
   */
  calculateStats() {
    if (this.history.length === 0) {
      this.stats = {
        total: 0,
        avgSpeedup: 0,
        bestSpeedup: 0,
        parallelRate: 0,
        sequentialTime: 0,
        parallelTime: 0,
        timeSaved: 0,
        improvement: 0,
        sequential: 0,
        partial: 0,
        parallel: 0,
        violations: 0,
        rollbacks: 0,
        fallbacks: 0
      };
      return;
    }

    const total = this.history.length;
    const speedups = this.history.map(h => h.speedup);
    const avgSpeedup = speedups.reduce((a, b) => a + b, 0) / total;
    const bestSpeedup = Math.max(...speedups);

    const rates = this.history.map(h => h.parallelization_rate);
    const avgRate = rates.reduce((a, b) => a + b, 0) / total;

    const seqTime = this.history.reduce((sum, h) => sum + h.sequential_time, 0);
    const parTime = this.history.reduce((sum, h) => sum + h.parallel_time, 0);
    const timeSaved = seqTime - parTime;
    const improvement = seqTime > 0 ? (timeSaved / seqTime * 100) : 0;

    // Categorize by parallelization rate
    let sequential = 0;
    let partial = 0;
    let parallel = 0;

    this.history.forEach(h => {
      if (h.parallelization_rate === 0) sequential++;
      else if (h.parallelization_rate < 50) partial++;
      else parallel++;
    });

    // Safety metrics
    const violations = this.history.reduce((sum, h) => sum + (h.safety.violations || 0), 0);
    const rollbacks = this.history.reduce((sum, h) => sum + (h.safety.rollbacks || 0), 0);
    const fallbacks = this.history.reduce((sum, h) => sum + (h.safety.fallbacks || 0), 0);

    this.stats = {
      total,
      avgSpeedup: avgSpeedup.toFixed(2),
      bestSpeedup: bestSpeedup.toFixed(2),
      parallelRate: avgRate.toFixed(1),
      sequentialTime: seqTime.toFixed(1),
      parallelTime: parTime.toFixed(1),
      timeSaved: timeSaved.toFixed(1),
      improvement: improvement.toFixed(1),
      sequential,
      partial,
      parallel,
      violations,
      rollbacks,
      fallbacks
    };
  }

  /**
   * Display main dashboard
   */
  displayMain() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║        PARALLEL EXECUTION DASHBOARD - Week 3                 ║
╚══════════════════════════════════════════════════════════════╝

📊 OVERALL STATISTICS
─────────────────────────────────────────────────────────────────
Total Executions:         ${this.stats.total}
Average Speedup:          ${this.stats.avgSpeedup}x
Best Speedup:             ${this.stats.bestSpeedup}x
Parallelization Rate:     ${this.stats.parallelRate}%

⚡ EXECUTION TIME
─────────────────────────────────────────────────────────────────
Sequential Baseline:      ${this.stats.sequentialTime}s
Parallel Average:         ${this.stats.parallelTime}s
Time Saved:              ${this.stats.timeSaved}s (-${this.stats.improvement}%)

🔀 PARALLELIZATION BREAKDOWN
─────────────────────────────────────────────────────────────────
Fully Sequential:         ${this.stats.sequential} (${this.calcPercent(this.stats.sequential, this.stats.total)}%)
Partially Parallel:       ${this.stats.partial} (${this.calcPercent(this.stats.partial, this.stats.total)}%)
Highly Parallel:          ${this.stats.parallel} (${this.calcPercent(this.stats.parallel, this.stats.total)}%)

🛡️ SAFETY METRICS
─────────────────────────────────────────────────────────────────
Safety Violations:        ${this.stats.violations} ${this.stats.violations === 0 ? '✅' : '⚠️'}
Rollbacks Triggered:      ${this.stats.rollbacks}
Fallbacks to Sequential:  ${this.stats.fallbacks}

📁 DATA
─────────────────────────────────────────────────────────────────
History File:            ${this.historyFile}
Branch:                  ${this.branch}
`);

    if (this.stats.total === 0) {
      console.log(`
⚠️  No execution history found. Run some parallel executions first.

Usage:
  const planSystem = new EnhancedPlanSystem();
  const result = await planSystem.executePlan(plan, { parallel: true });

  const dashboard = new ParallelDashboard();
  dashboard.recordExecution(result.parallelization_metrics);
`);
    }
  }

  /**
   * Calculate percentage
   * @param {number} value - Value
   * @param {number} total - Total
   * @returns {string} Percentage
   */
  calcPercent(value, total) {
    if (total === 0) return '0.0';
    return ((value / total) * 100).toFixed(1);
  }

  /**
   * Display performance trends
   * @param {number} days - Number of days to show
   */
  displayTrends(days = 7) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║        PERFORMANCE TRENDS - Last ${days} Days                       ║
╚══════════════════════════════════════════════════════════════╝
`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentHistory = this.history.filter(h => {
      const execDate = new Date(h.timestamp);
      return execDate >= cutoffDate;
    });

    if (recentHistory.length === 0) {
      console.log('⚠️  No executions found in the last', days, 'days.');
      return;
    }

    // Group by date
    const byDate = {};
    recentHistory.forEach(h => {
      const date = h.timestamp.split('T')[0];
      if (!byDate[date]) {
        byDate[date] = [];
      }
      byDate[date].push(h);
    });

    // Calculate daily metrics
    console.log('📅 DATE          | EXECS | AVG SPEEDUP | AVG PARALLEL% | SPARKLINE');
    console.log('─────────────────┼───────┼─────────────┼───────────────┼──────────────');

    const dates = Object.keys(byDate).sort();
    const sparklineData = [];

    dates.forEach(date => {
      const execs = byDate[date];
      const avgSpeedup = execs.reduce((sum, e) => sum + e.speedup, 0) / execs.length;
      const avgRate = execs.reduce((sum, e) => sum + e.parallelization_rate, 0) / execs.length;

      sparklineData.push(avgSpeedup);

      const sparkline = this.createSparkline(avgSpeedup, 1, 5);
      console.log(
        `${date}   | ${String(execs.length).padStart(5)} | ${avgSpeedup.toFixed(2).padStart(11)} | ${avgRate.toFixed(1).padStart(13)}% | ${sparkline}`
      );
    });

    console.log();
    console.log('📈 SPEEDUP TREND (last 7 days):');
    console.log('   ' + this.createSparklineGraph(sparklineData));
    console.log();
  }

  /**
   * Create ASCII sparkline
   * @param {number} value - Value to display
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {string} Sparkline characters
   */
  createSparkline(value, min, max) {
    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const normalized = (value - min) / (max - min);
    const index = Math.floor(normalized * (chars.length - 1));
    return chars[Math.max(0, Math.min(chars.length - 1, index))].repeat(3);
  }

  /**
   * Create sparkline graph from array of values
   * @param {Array<number>} values - Array of values
   * @returns {string} Sparkline graph
   */
  createSparklineGraph(values) {
    if (values.length === 0) return '';

    const min = Math.min(...values);
    const max = Math.max(...values);
    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

    return values.map(v => {
      const normalized = max > min ? (v - min) / (max - min) : 0.5;
      const index = Math.floor(normalized * (chars.length - 1));
      return chars[Math.max(0, Math.min(chars.length - 1, index))];
    }).join('');
  }

  /**
   * Compare two executions
   * @param {string} id1 - First execution ID
   * @param {string} id2 - Second execution ID
   */
  compare(id1, id2) {
    const exec1 = this.history.find(h => h.id === id1);
    const exec2 = this.history.find(h => h.id === id2);

    if (!exec1 || !exec2) {
      console.log('❌ One or both execution IDs not found.');
      return;
    }

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   EXECUTION COMPARISON                       ║
╚══════════════════════════════════════════════════════════════╝

EXECUTION 1: ${exec1.id}
  Timestamp:           ${exec1.timestamp}
  Plan ID:             ${exec1.planId}
  Steps:               ${exec1.steps}
  Levels:              ${exec1.levels}
  Speedup:             ${exec1.speedup}x
  Parallel Rate:       ${exec1.parallelization_rate}%

EXECUTION 2: ${exec2.id}
  Timestamp:           ${exec2.timestamp}
  Plan ID:             ${exec2.planId}
  Steps:               ${exec2.steps}
  Levels:              ${exec2.levels}
  Speedup:             ${exec2.speedup}x
  Parallel Rate:       ${exec2.parallelization_rate}%

COMPARISON:
  Steps Difference:    ${exec2.steps - exec1.steps} (${this.diffPercent(exec1.steps, exec2.steps)})
  Levels Difference:   ${exec2.levels - exec1.levels} (${this.diffPercent(exec1.levels, exec2.levels)})
  Speedup Difference:  ${(exec2.speedup - exec1.speedup).toFixed(2)}x (${this.diffPercent(exec1.speedup, exec2.speedup)})
  Parallel Rate Diff:  ${(exec2.parallelization_rate - exec1.parallelization_rate).toFixed(1)}%
`);
  }

  /**
   * Calculate difference percentage
   * @param {number} val1 - First value
   * @param {number} val2 - Second value
   * @returns {string} Difference string
   */
  diffPercent(val1, val2) {
    if (val1 === 0) return 'N/A';
    const diff = ((val2 - val1) / val1 * 100).toFixed(1);
    return diff >= 0 ? `+${diff}%` : `${diff}%`;
  }

  /**
   * Export history to various formats
   * @param {string} format - Export format (json, csv)
   * @param {string} outputFile - Output file path
   */
  export(format = 'json', outputFile = null) {
    const output = outputFile || `.claude/reports/parallel-export-${new Date().toISOString().split('T')[0]}.${format}`;

    try {
      let data;
      if (format === 'json') {
        data = JSON.stringify({ stats: this.stats, history: this.history }, null, 2);
      } else if (format === 'csv') {
        data = this.toCSV();
      } else {
        console.log(`❌ Unknown format: ${format}`);
        return;
      }

      const dir = path.dirname(output);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(output, data);
      console.log(`✅ Exported to: ${output}`);
    } catch (error) {
      console.log(`❌ Export failed: ${error.message}`);
    }
  }

  /**
   * Convert history to CSV format
   * @returns {string} CSV data
   */
  toCSV() {
    const headers = [
      'id', 'timestamp', 'planId', 'steps', 'levels',
      'sequential_time', 'parallel_time', 'speedup',
      'parallelization_rate', 'concurrent_avg',
      'violations', 'rollbacks', 'fallbacks'
    ];

    const rows = this.history.map(h => [
      h.id,
      h.timestamp,
      h.planId,
      h.steps,
      h.levels,
      h.sequential_time,
      h.parallel_time,
      h.speedup,
      h.parallelization_rate,
      h.concurrent_avg,
      h.safety.violations,
      h.safety.rollbacks,
      h.safety.fallbacks
    ]);

    return [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
  }

  /**
   * List all executions
   * @param {number} limit - Number of executions to show
   */
  list(limit = 10) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║              RECENT EXECUTIONS (Last ${limit})                    ║
╚══════════════════════════════════════════════════════════════╝
`);

    if (this.history.length === 0) {
      console.log('⚠️  No executions found.');
      return;
    }

    const recent = this.history.slice(-limit).reverse();

    console.log('ID                      | DATE       | STEPS | SPEEDUP | PARALLEL%');
    console.log('────────────────────────┼────────────┼───────┼─────────┼──────────');

    recent.forEach(h => {
      const date = h.timestamp.split('T')[0];
      const id = h.id.substring(0, 22);
      console.log(
        `${id.padEnd(23)} | ${date} | ${String(h.steps).padStart(5)} | ${h.speedup.toFixed(2).padStart(7)} | ${h.parallelization_rate.toFixed(1).padStart(8)}%`
      );
    });

    console.log();
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'main';

  const dashboard = new ParallelDashboard();

  switch (command) {
    case 'main':
      dashboard.displayMain();
      break;

    case 'trends':
      const days = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1]) || 7;
      dashboard.displayTrends(days);
      break;

    case 'compare':
      if (args.length < 3) {
        console.log('Usage: node parallel-dashboard.js compare <id1> <id2>');
      } else {
        dashboard.compare(args[1], args[2]);
      }
      break;

    case 'export':
      const format = args.find(a => a.startsWith('--format='))?.split('=')[1] || 'json';
      const output = args.find(a => a.startsWith('--output='))?.split('=')[1] || null;
      dashboard.export(format, output);
      break;

    case 'list':
      const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1]) || 10;
      dashboard.list(limit);
      break;

    case 'help':
      console.log(`
Parallel Execution Dashboard - CLI Help

COMMANDS:
  main                          Show main dashboard with overall statistics
  trends [--days=7]             Show performance trends over time
  compare <id1> <id2>           Compare two executions
  export [--format=json|csv]    Export history data
         [--output=file.json]
  list [--limit=10]             List recent executions
  help                          Show this help message

EXAMPLES:
  node .claude/utils/parallel-dashboard.js main
  node .claude/utils/parallel-dashboard.js trends --days=30
  node .claude/utils/parallel-dashboard.js export --format=csv --output=report.csv
  node .claude/utils/parallel-dashboard.js list --limit=20
`);
      break;

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Use "help" command to see available commands.');
  }
}

module.exports = { ParallelDashboard };
