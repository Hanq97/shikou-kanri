#!/usr/bin/env node

/**
 * Confidence Trend Analyzer
 *
 * Analyzes confidence trends over time to identify patterns and anomalies.
 * Provides visualizations and insights for continuous improvement.
 *
 * Features:
 * - Daily confidence averages (last 30 days)
 * - Trend detection (improving/stable/declining) using linear regression
 * - Anomaly detection (sudden drops >15% from rolling average)
 * - Factor performance tracking over time
 * - CLI-formatted trend visualizations
 *
 * Trend Detection:
 * - Slope > 0.1: Improving
 * - Slope < -0.1: Declining
 * - Otherwise: Stable
 *
 * @version 1.0.0
 * @author EPS Framework Team
 * @date 2025-12-22
 */

const ConfidenceHistoryManager = require('./confidence-history-manager.js');
const fs = require('fs').promises;
const path = require('path');

class ConfidenceTrendAnalyzer {
  constructor(config = {}) {
    this.config = {
      defaultDays: 30,             // Default analysis period
      rollingWindowSize: 7,        // Days for rolling average
      anomalyThreshold: 15,        // Percentage drop to flag anomaly
      trendSlopeThreshold: 0.1,    // Slope threshold for trend detection
      ...config
    };

    this.historyManager = new ConfidenceHistoryManager();
  }

  /**
   * Analyze confidence trends over specified number of days
   * @param {number} days - Number of days to analyze
   * @returns {object} - Trend analysis results
   */
  async analyzeTrends(days = this.config.defaultDays) {
    console.log(`\n=== Analyzing Confidence Trends (Last ${days} Days) ===\n`);

    // Load history
    const history = await this.historyManager.loadHistory();

    // Filter to specified time period
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentHistory = history.history.filter(h =>
      new Date(h.timestamp) >= cutoffDate
    );

    if (recentHistory.length === 0) {
      console.log('No history data available for analysis.');
      return {
        period: days,
        entries: 0,
        trend: null,
        anomalies: [],
        factor_performance: {}
      };
    }

    console.log(`Found ${recentHistory.length} entries in period`);

    // Group by date
    const dailyData = this.groupByDate(recentHistory);
    const dataPoints = Object.entries(dailyData)
      .map(([date, entries]) => ({
        date: date,
        avg: this.average(entries.map(e => e.confidence?.overall || e.confidence || 0)),
        count: entries.length,
        entries: entries
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Detect overall trend
    const trend = this.detectTrend(dataPoints);

    // Detect anomalies
    const anomalies = this.detectAnomalies(dataPoints);

    // Analyze factor performance
    const factorPerformance = this.analyzeFactorPerformance(recentHistory);

    // Generate trend report
    const report = {
      period: days,
      entries: recentHistory.length,
      start_date: dataPoints[0]?.date,
      end_date: dataPoints[dataPoints.length - 1]?.date,
      trend: trend,
      anomalies: anomalies,
      daily_data: dataPoints,
      factor_performance: factorPerformance,
      summary: this.generateSummary(dataPoints, trend, anomalies, factorPerformance)
    };

    return report;
  }

  /**
   * Detect trend using linear regression
   * @param {Array} dataPoints - Array of {date, avg, count}
   * @returns {object} - Trend information
   */
  detectTrend(dataPoints) {
    if (dataPoints.length < 2) {
      return {
        direction: 'insufficient_data',
        slope: 0,
        confidence: 0
      };
    }

    // Convert dates to numeric values (days from start)
    const x = dataPoints.map((_, i) => i);
    const y = dataPoints.map(d => d.avg);

    // Calculate linear regression
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared (confidence in trend)
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) =>
      sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0
    );
    const rSquared = 1 - (ssResidual / ssTotal);

    // Determine trend direction
    let direction;
    if (slope > this.config.trendSlopeThreshold) {
      direction = 'improving';
    } else if (slope < -this.config.trendSlopeThreshold) {
      direction = 'declining';
    } else {
      direction = 'stable';
    }

    return {
      direction: direction,
      slope: Math.round(slope * 1000) / 1000,
      intercept: Math.round(intercept * 10) / 10,
      r_squared: Math.round(rSquared * 1000) / 1000,
      confidence: Math.round(rSquared * 100),
      start_value: dataPoints[0].avg,
      end_value: dataPoints[dataPoints.length - 1].avg,
      change: Math.round((dataPoints[dataPoints.length - 1].avg - dataPoints[0].avg) * 10) / 10
    };
  }

  /**
   * Detect anomalies (sudden drops) using rolling average
   * @param {Array} dataPoints - Array of {date, avg, count}
   * @returns {Array} - Array of anomaly objects
   */
  detectAnomalies(dataPoints) {
    if (dataPoints.length < this.config.rollingWindowSize) {
      return [];
    }

    const anomalies = [];

    for (let i = this.config.rollingWindowSize; i < dataPoints.length; i++) {
      // Calculate rolling average of previous window
      const window = dataPoints.slice(
        i - this.config.rollingWindowSize,
        i
      );
      const rollingAvg = this.average(window.map(d => d.avg));

      // Check if current value is significantly lower
      const current = dataPoints[i].avg;
      const percentDrop = ((rollingAvg - current) / rollingAvg) * 100;

      if (percentDrop > this.config.anomalyThreshold) {
        anomalies.push({
          date: dataPoints[i].date,
          value: current,
          rolling_avg: Math.round(rollingAvg * 10) / 10,
          drop_percent: Math.round(percentDrop * 10) / 10,
          severity: percentDrop > 25 ? 'high' : percentDrop > 20 ? 'medium' : 'low',
          entries: dataPoints[i].entries.map(e => ({
            command: e.command,
            feature: e.feature,
            confidence: e.confidence?.overall || e.confidence
          }))
        });
      }
    }

    return anomalies;
  }

  /**
   * Analyze factor performance over time
   * @param {Array} history - History entries
   * @returns {object} - Factor performance data
   */
  analyzeFactorPerformance(history) {
    const factorNames = [
      'evidence', 'consistency', 'complexity', 'expert_confidence',
      'context_depth', 'pattern_match', 'historical_data'
    ];

    const performance = {};

    for (const factor of factorNames) {
      // Extract all values for this factor
      const values = history
        .map(h => h.confidence?.factors?.[factor])
        .filter(v => v !== undefined && v !== null);

      if (values.length === 0) {
        performance[factor] = null;
        continue;
      }

      // Calculate statistics
      const sorted = [...values].sort((a, b) => a - b);
      const avg = this.average(values);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const median = sorted[Math.floor(sorted.length / 2)];
      const stdDev = this.standardDeviation(values, avg);

      // Trend over time (first half vs second half)
      const midPoint = Math.floor(values.length / 2);
      const firstHalf = this.average(values.slice(0, midPoint));
      const secondHalf = this.average(values.slice(midPoint));
      const trend = secondHalf > firstHalf ? 'improving' :
                    secondHalf < firstHalf ? 'declining' : 'stable';

      performance[factor] = {
        avg: Math.round(avg * 10) / 10,
        min: min,
        max: max,
        median: median,
        std_dev: Math.round(stdDev * 10) / 10,
        trend: trend,
        trend_change: Math.round((secondHalf - firstHalf) * 10) / 10,
        sample_count: values.length
      };
    }

    return performance;
  }

  /**
   * Generate text summary of analysis
   * @param {Array} dataPoints - Daily data points
   * @param {object} trend - Trend information
   * @param {Array} anomalies - Anomalies detected
   * @param {object} factorPerformance - Factor performance data
   * @returns {string} - Summary text
   */
  generateSummary(dataPoints, trend, anomalies, factorPerformance) {
    const lines = [];

    // Overall trend summary
    lines.push(`Overall Trend: ${trend.direction.toUpperCase()}`);
    if (trend.direction !== 'insufficient_data') {
      lines.push(`  Confidence: ${trend.start_value.toFixed(1)}% → ${trend.end_value.toFixed(1)}% (${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}%)`);
      lines.push(`  Linear Fit: R² = ${trend.r_squared.toFixed(3)} (${trend.confidence}% confidence)`);
    }

    // Anomaly summary
    if (anomalies.length > 0) {
      lines.push(`\nAnomalies Detected: ${anomalies.length}`);
      anomalies.forEach((a, i) => {
        lines.push(`  ${i + 1}. ${a.date}: ${a.drop_percent.toFixed(1)}% drop (${a.severity} severity)`);
      });
    } else {
      lines.push('\nNo anomalies detected');
    }

    // Factor highlights
    lines.push('\nFactor Highlights:');
    const sortedFactors = Object.entries(factorPerformance)
      .filter(([_, perf]) => perf !== null)
      .sort((a, b) => b[1].avg - a[1].avg);

    sortedFactors.slice(0, 3).forEach(([factor, perf]) => {
      lines.push(`  ✓ ${factor}: ${perf.avg.toFixed(1)}% avg (${perf.trend})`);
    });

    if (sortedFactors.length > 3) {
      const weakest = sortedFactors[sortedFactors.length - 1];
      lines.push(`  ✗ ${weakest[0]}: ${weakest[1].avg.toFixed(1)}% avg (${weakest[1].trend})`);
    }

    return lines.join('\n');
  }

  /**
   * Generate CLI-formatted trend report
   * @returns {string} - Formatted report
   */
  async generateTrendReport(days = this.config.defaultDays) {
    const analysis = await this.analyzeTrends(days);

    if (analysis.entries === 0) {
      return 'No data available for trend analysis.';
    }

    const lines = [];

    // Header
    lines.push('');
    lines.push('╔═══════════════════════════════════════════════════════════╗');
    lines.push('║         CONFIDENCE ENGINE TREND ANALYSIS REPORT          ║');
    lines.push('╚═══════════════════════════════════════════════════════════╝');
    lines.push('');

    // Period info
    lines.push(`Period: ${analysis.start_date} to ${analysis.end_date} (${analysis.period} days)`);
    lines.push(`Total Entries: ${analysis.entries}`);
    lines.push('');

    // Summary
    lines.push('─────────────────────────────────────────────────────────');
    lines.push('SUMMARY');
    lines.push('─────────────────────────────────────────────────────────');
    lines.push(analysis.summary);
    lines.push('');

    // Trend visualization
    if (analysis.daily_data.length > 0) {
      lines.push('─────────────────────────────────────────────────────────');
      lines.push('DAILY CONFIDENCE TREND');
      lines.push('─────────────────────────────────────────────────────────');
      lines.push(this.generateSparkline(analysis.daily_data.map(d => d.avg)));
      lines.push('');

      // Show recent days
      lines.push('Recent Days:');
      analysis.daily_data.slice(-7).forEach(d => {
        const bar = '█'.repeat(Math.round(d.avg / 5));
        lines.push(`  ${d.date}: ${d.avg.toFixed(1)}% ${bar} (${d.count} entries)`);
      });
      lines.push('');
    }

    // Factor performance table
    lines.push('─────────────────────────────────────────────────────────');
    lines.push('FACTOR PERFORMANCE');
    lines.push('─────────────────────────────────────────────────────────');
    lines.push('Factor                  Avg    Min   Max   Trend      Change');
    lines.push('─────────────────────────────────────────────────────────');

    for (const [factor, perf] of Object.entries(analysis.factor_performance)) {
      if (perf === null) continue;

      const trendIcon = perf.trend === 'improving' ? '↑' :
                       perf.trend === 'declining' ? '↓' : '→';
      const changeStr = perf.trend_change > 0 ? `+${perf.trend_change.toFixed(1)}` :
                       perf.trend_change.toFixed(1);

      lines.push(
        `${factor.padEnd(20)} ` +
        `${perf.avg.toFixed(1).padStart(5)}  ` +
        `${perf.min.toString().padStart(3)}  ` +
        `${perf.max.toString().padStart(3)}  ` +
        `${trendIcon} ${perf.trend.padEnd(9)} ` +
        `${changeStr}`
      );
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate simple ASCII sparkline
   * @param {Array} values - Array of numbers
   * @returns {string} - Sparkline visualization
   */
  generateSparkline(values) {
    if (values.length === 0) return '';

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) {
      return '  ' + '─'.repeat(values.length) + ` (constant ${min.toFixed(1)}%)`;
    }

    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const sparkline = values.map(v => {
      const normalized = (v - min) / range;
      const index = Math.min(chars.length - 1, Math.floor(normalized * chars.length));
      return chars[index];
    }).join('');

    return `  ${sparkline}  (${min.toFixed(1)}% - ${max.toFixed(1)}%)`;
  }

  /**
   * Group history entries by date
   * @param {Array} history - History entries
   * @returns {object} - Grouped by date
   */
  groupByDate(history) {
    return history.reduce((groups, item) => {
      const date = item.timestamp.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
      return groups;
    }, {});
  }

  /**
   * Calculate average of array
   * @param {Array} arr - Numbers array
   * @returns {number} - Average
   */
  average(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Calculate standard deviation
   * @param {Array} arr - Numbers array
   * @param {number} avg - Precalculated average
   * @returns {number} - Standard deviation
   */
  standardDeviation(arr, avg) {
    if (!arr || arr.length === 0) return 0;
    const variance = arr.reduce((sum, v) =>
      sum + Math.pow(v - avg, 2), 0
    ) / arr.length;
    return Math.sqrt(variance);
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const analyzer = new ConfidenceTrendAnalyzer();

  (async () => {
    try {
      if (command === 'analyze') {
        const days = parseInt(args[1]) || 30;
        const analysis = await analyzer.analyzeTrends(days);

        console.log('\n=== Analysis Results ===');
        console.log(JSON.stringify(analysis, null, 2));

      } else if (command === 'report') {
        const days = parseInt(args[1]) || 30;
        const report = await analyzer.generateTrendReport(days);

        console.log(report);

      } else if (command === 'anomalies') {
        const days = parseInt(args[1]) || 30;
        const analysis = await analyzer.analyzeTrends(days);

        console.log('\n=== Anomalies Detected ===\n');
        if (analysis.anomalies.length === 0) {
          console.log('No anomalies detected in the period.');
        } else {
          analysis.anomalies.forEach((a, i) => {
            console.log(`${i + 1}. ${a.date} - ${a.severity.toUpperCase()} SEVERITY`);
            console.log(`   Drop: ${a.drop_percent.toFixed(1)}% (from ${a.rolling_avg.toFixed(1)}% to ${a.value.toFixed(1)}%)`);
            console.log(`   Affected entries: ${a.entries.length}`);
            a.entries.forEach(e => {
              console.log(`     - ${e.command} ${e.feature}: ${e.confidence.toFixed(1)}%`);
            });
            console.log();
          });
        }

      } else if (command === 'factors') {
        const days = parseInt(args[1]) || 30;
        const analysis = await analyzer.analyzeTrends(days);

        console.log('\n=== Factor Performance ===\n');
        for (const [factor, perf] of Object.entries(analysis.factor_performance)) {
          if (perf === null) continue;

          console.log(`${factor.toUpperCase()}`);
          console.log(`  Average: ${perf.avg.toFixed(1)}%`);
          console.log(`  Range: ${perf.min} - ${perf.max}`);
          console.log(`  Trend: ${perf.trend} (${perf.trend_change > 0 ? '+' : ''}${perf.trend_change.toFixed(1)}%)`);
          console.log(`  Std Dev: ${perf.std_dev.toFixed(1)}`);
          console.log();
        }

      } else {
        console.log('Confidence Trend Analyzer');
        console.log('\nUsage:');
        console.log('  node confidence-trend-analyzer.js analyze [days]');
        console.log('  node confidence-trend-analyzer.js report [days]');
        console.log('  node confidence-trend-analyzer.js anomalies [days]');
        console.log('  node confidence-trend-analyzer.js factors [days]');
        console.log('\nExamples:');
        console.log('  node confidence-trend-analyzer.js analyze 30');
        console.log('  node confidence-trend-analyzer.js report 14');
        console.log('  node confidence-trend-analyzer.js anomalies 7');
        console.log('  node confidence-trend-analyzer.js factors 30');
        console.log('\nDescription:');
        console.log('  analyze   - Analyze trends and return JSON results');
        console.log('  report    - Generate formatted trend report');
        console.log('  anomalies - Show detected anomalies only');
        console.log('  factors   - Show factor performance over time');
      }
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  })();
}

module.exports = ConfidenceTrendAnalyzer;
