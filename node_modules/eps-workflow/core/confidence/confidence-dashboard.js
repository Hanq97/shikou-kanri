#!/usr/bin/env node

/**
 * Confidence Dashboard - Week 2 Enhanced
 * 信頼度ダッシュボード - 週2強化版
 * Dashboard Confidence - Tuần 2 Nâng cao
 *
 * CLI-based dashboard for real-time confidence metrics monitoring
 * with visual design, trend analysis, and auto-suggestions.
 *
 * Features:
 * - Real-time statistics (overall, by command, by category)
 * - 7-day trend analysis with ASCII charts
 * - Low confidence alerts (<90%)
 * - Auto-suggestions based on historical data
 * - Factor contribution breakdown (7 factors)
 * - Export to JSON/CSV/Markdown
 * - Filter by date/category
 * - Detailed report view
 *
 * Usage:
 *   node .claude/utils/confidence-dashboard.js                     # Interactive mode
 *   node .claude/utils/confidence-dashboard.js --export json       # Export to JSON
 *   node .claude/utils/confidence-dashboard.js --export csv        # Export to CSV
 *   node .claude/utils/confidence-dashboard.js --export markdown   # Export to Markdown
 *   node .claude/utils/confidence-dashboard.js --detailed          # Show detailed report
 *   node .claude/utils/confidence-dashboard.js --filter-date "2025-12-15" "2025-12-22"
 *   node .claude/utils/confidence-dashboard.js --filter-category backend
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

// Box drawing characters
const box = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║',
  cross: '┼',
  teeDown: '┬',
  teeUp: '┴',
  teeRight: '├',
  teeLeft: '┤',
  rowTop: '┌',
  rowBottom: '└',
  rowRight: '┐',
  rowBottomRight: '┘',
  rowHorizontal: '─',
  rowVertical: '│'
};

/**
 * Main dashboard class
 */
class ConfidenceDashboard {
  constructor() {
    this.historyPath = path.join(
      process.cwd(),
      '.claude/memory-bank/dev/confidence-history.json'
    );
    this.reportsDir = path.join(process.cwd(), '.claude/reports');
    this.history = null;
    this.filteredEntries = null;
  }

  /**
   * Load confidence history from JSON file
   */
  async loadHistory() {
    try {
      const data = await fs.readFile(this.historyPath, 'utf-8');
      this.history = JSON.parse(data);
      this.filteredEntries = this.history.history || [];
      return this.history;
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.error(`${colors.yellow}⚠️  History file not found: ${this.historyPath}${colors.reset}`);
        this.history = { history: [], statistics: {}, metadata: {} };
        this.filteredEntries = [];
        return this.history;
      }
      console.error(`${colors.red}Error loading history: ${err.message}${colors.reset}`);
      throw err;
    }
  }

  /**
   * Calculate statistics from entries
   */
  calculateStatistics(entries, period = 'last_7_days') {
    if (!entries || entries.length === 0) {
      return {
        total_entries: 0,
        avg_confidence: 0,
        success_rate: 0,
        false_positive_rate: 0,
        by_command: {},
        by_category: {},
        by_complexity: {},
        trends: {},
        factor_averages: {},
        low_confidence_alerts: [],
        failed_checks: []
      };
    }

    // Overall stats
    const totalEntries = entries.length;
    const totalConfidence = entries.reduce((sum, e) => sum + (e.confidence?.overall || 0), 0);
    const avgConfidence = totalConfidence / totalEntries;

    const successCount = entries.filter(e => e.outcome?.status === 'success').length;
    const successRate = (successCount / totalEntries) * 100;
    const falsePositiveRate = 100 - successRate;

    // By command
    const byCommand = {};
    entries.forEach(entry => {
      const cmd = entry.command || 'unknown';
      if (!byCommand[cmd]) {
        byCommand[cmd] = { count: 0, total_conf: 0, success: 0, total_time: 0 };
      }
      byCommand[cmd].count++;
      byCommand[cmd].total_conf += entry.confidence?.overall || 0;
      if (entry.outcome?.status === 'success') byCommand[cmd].success++;
      if (entry.outcome?.execution_time) byCommand[cmd].total_time += entry.outcome.execution_time;
    });

    Object.keys(byCommand).forEach(cmd => {
      const data = byCommand[cmd];
      byCommand[cmd] = {
        count: data.count,
        avg_confidence: data.total_conf / data.count,
        success_rate: (data.success / data.count) * 100,
        avg_execution_time: data.total_time / data.count
      };
    });

    // By category
    const byCategory = {};
    entries.forEach(entry => {
      const cat = entry.category || 'unknown';
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, total_conf: 0, success: 0, patterns: {} };
      }
      byCategory[cat].count++;
      byCategory[cat].total_conf += entry.confidence?.overall || 0;
      if (entry.outcome?.status === 'success') byCategory[cat].success++;

      // Track patterns
      if (entry.metadata?.patterns_used) {
        entry.metadata.patterns_used.forEach(pattern => {
          if (!byCategory[cat].patterns[pattern]) {
            byCategory[cat].patterns[pattern] = 0;
          }
          byCategory[cat].patterns[pattern]++;
        });
      }
    });

    Object.keys(byCategory).forEach(cat => {
      const data = byCategory[cat];
      const topPatterns = Object.entries(data.patterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([pattern]) => pattern);

      byCategory[cat] = {
        count: data.count,
        avg_confidence: data.total_conf / data.count,
        success_rate: (data.success / data.count) * 100,
        top_patterns: topPatterns
      };
    });

    // By complexity
    const byComplexity = {};
    entries.forEach(entry => {
      const comp = entry.complexity || 'unknown';
      if (!byComplexity[comp]) {
        byComplexity[comp] = { count: 0, total_conf: 0, success: 0 };
      }
      byComplexity[comp].count++;
      byComplexity[comp].total_conf += entry.confidence?.overall || 0;
      if (entry.outcome?.status === 'success') byComplexity[comp].success++;
    });

    Object.keys(byComplexity).forEach(comp => {
      const data = byComplexity[comp];
      byComplexity[comp] = {
        count: data.count,
        avg_confidence: data.total_conf / data.count,
        success_rate: (data.success / data.count) * 100
      };
    });

    // Trends (by date)
    const trends = {};
    entries.forEach(entry => {
      const date = entry.timestamp ? entry.timestamp.split('T')[0] : 'unknown';
      if (!trends[date]) {
        trends[date] = { count: 0, total_conf: 0 };
      }
      trends[date].count++;
      trends[date].total_conf += entry.confidence?.overall || 0;
    });

    Object.keys(trends).forEach(date => {
      const data = trends[date];
      trends[date] = {
        count: data.count,
        avg: data.total_conf / data.count
      };
    });

    // Factor averages
    const factorAverages = {
      evidence: 0,
      consistency: 0,
      complexity: 0,
      expert_confidence: 0,
      context_depth: 0,
      pattern_match: 0,
      historical_data: 0
    };

    entries.forEach(entry => {
      if (entry.confidence?.factors) {
        Object.keys(factorAverages).forEach(factor => {
          factorAverages[factor] += entry.confidence.factors[factor] || 0;
        });
      }
    });

    Object.keys(factorAverages).forEach(factor => {
      factorAverages[factor] = factorAverages[factor] / totalEntries;
    });

    // Low confidence alerts (<90%)
    const lowConfidenceAlerts = entries.filter(e => (e.confidence?.overall || 0) < 90);

    // Failed checks
    const failedChecks = entries.filter(e => e.outcome?.status === 'failed');

    return {
      total_entries: totalEntries,
      avg_confidence: avgConfidence,
      success_rate: successRate,
      false_positive_rate: falsePositiveRate,
      by_command: byCommand,
      by_category: byCategory,
      by_complexity: byComplexity,
      trends: trends,
      factor_averages: factorAverages,
      low_confidence_alerts: lowConfidenceAlerts,
      failed_checks: failedChecks
    };
  }

  /**
   * Draw box header with title
   */
  drawBoxHeader(title, width = 80) {
    const padding = width - title.length - 4;
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;

    console.log(box.topLeft + box.horizontal.repeat(width - 2) + box.topRight);
    console.log(
      box.vertical +
      ' '.repeat(leftPad) +
      colors.bold + title + colors.reset +
      ' '.repeat(rightPad) +
      box.vertical
    );
    console.log(box.bottomLeft + box.horizontal.repeat(width - 2) + box.bottomRight);
  }

  /**
   * Draw progress bar
   */
  drawProgressBar(value, max = 100, width = 20) {
    const percentage = (value / max) * 100;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    let color = colors.green;
    if (percentage < 60) color = colors.red;
    else if (percentage < 85) color = colors.yellow;

    return (
      color +
      '█'.repeat(filled) +
      colors.reset +
      '░'.repeat(empty)
    );
  }

  /**
   * Draw main dashboard
   */
  async drawMainDashboard() {
    const stats = this.calculateStatistics(this.filteredEntries);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    // Clear screen
    console.clear();

    // Header
    this.drawBoxHeader('CONFIDENCE DASHBOARD - Week 2 Enhanced');
    console.log(`${box.vertical}  Branch: dev  |  Period: Last 7 days${' '.repeat(38)}${box.vertical}`);
    console.log(box.bottomLeft + box.horizontal.repeat(78) + box.bottomRight);
    console.log();

    // Overall statistics
    console.log(`${colors.cyan}📊 OVERALL STATISTICS${colors.reset}                                 Updated: ${dateStr} ${timeStr}`);
    console.log('─'.repeat(80));
    console.log(`Total Confidence Checks:  ${stats.total_entries}`);
    console.log(
      `Average Confidence:       ${stats.avg_confidence.toFixed(1)}%  ` +
      this.drawProgressBar(stats.avg_confidence) +
      `  (Target: 95%)`
    );
    console.log(
      `Success Rate:            ${stats.success_rate.toFixed(1)}%  ` +
      this.drawProgressBar(stats.success_rate) +
      `  (Target: 98%)`
    );
    console.log(
      `False Positive Rate:      ${stats.false_positive_rate.toFixed(1)}%  ` +
      this.drawProgressBar(100 - stats.false_positive_rate) +
      `  (Target: <1%)`
    );
    console.log();

    // By command
    console.log(`${colors.cyan}📈 BY COMMAND${colors.reset}                                    Avg Confidence  |  Success Rate`);
    console.log('─'.repeat(80));

    const commands = Object.entries(stats.by_command).sort((a, b) => b[1].count - a[1].count);
    if (commands.length === 0) {
      console.log('No command data available');
    } else {
      commands.forEach(([cmd, cmdStats]) => {
        const status = cmdStats.success_rate >= 95 ? '✅' : '⚠️';
        console.log(
          `${cmd.padEnd(14)}` +
          `${cmdStats.count.toString().padStart(2)} checks   ` +
          `${cmdStats.avg_confidence.toFixed(1)}%  ` +
          this.drawProgressBar(cmdStats.avg_confidence) +
          `      ${cmdStats.success_rate.toFixed(1)}%  ${status}`
        );
      });
    }
    console.log();

    // By category
    console.log(`${colors.cyan}🔍 BY CATEGORY${colors.reset}                                   Avg Confidence  |  Top Pattern`);
    console.log('─'.repeat(80));

    const categories = Object.entries(stats.by_category).sort((a, b) => b[1].avg_confidence - a[1].avg_confidence);
    if (categories.length === 0) {
      console.log('No category data available');
    } else {
      categories.forEach(([cat, catStats]) => {
        const topPattern = catStats.top_patterns[0] || 'N/A';
        console.log(
          `${cat.padEnd(14)}` +
          `${catStats.count.toString().padStart(2)} checks   ` +
          `${catStats.avg_confidence.toFixed(1)}%  ` +
          this.drawProgressBar(catStats.avg_confidence) +
          `     ${topPattern}`
        );
      });
    }
    console.log();

    // Recent trends (last 7 days)
    console.log(`${colors.cyan}📉 RECENT TRENDS (Last 7 Days)${colors.reset}                              Daily Avg Confidence`);
    console.log('─'.repeat(80));

    const sortedTrends = Object.entries(stats.trends)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7);

    if (sortedTrends.length === 0) {
      console.log('No trend data available');
    } else {
      sortedTrends.forEach(([date, trend]) => {
        const bar = this.drawProgressBar(trend.avg, 100, 25);
        console.log(
          `${date}    ${trend.count.toString().padStart(2)} checks  ` +
          `${trend.avg.toFixed(1)}%  ${bar}`
        );
      });
    }
    console.log();

    // Low confidence alerts
    console.log(`${colors.yellow}⚠️  LOW CONFIDENCE ALERTS (<90%)${colors.reset}                            Confidence  |  Risk`);
    console.log('─'.repeat(80));

    if (stats.low_confidence_alerts.length === 0) {
      console.log(`${colors.green}None! All checks passed threshold ✅${colors.reset}`);
    } else {
      stats.low_confidence_alerts.forEach(alert => {
        console.log(
          `${alert.feature || 'unknown'}  ${alert.command || ''}  ` +
          `${(alert.confidence?.overall || 0).toFixed(1)}%  ${colors.red}HIGH${colors.reset}`
        );
      });
    }
    console.log();

    // Auto-suggestions
    console.log(`${colors.magenta}💡 AUTO-SUGGESTIONS (Based on ${stats.total_entries} historical entries)${colors.reset}`);
    console.log('─'.repeat(80));

    if (stats.total_entries === 0) {
      console.log('Not enough data for suggestions');
    } else {
      // Generate suggestions based on data
      const backendData = stats.by_category['backend'];
      const frontendData = stats.by_category['frontend'];

      if (backendData && backendData.success_rate >= 95) {
        console.log(`${colors.green}✓${colors.reset} Backend patterns have ${backendData.success_rate.toFixed(1)}% success rate → Continue using ${backendData.top_patterns[0] || 'current patterns'}`);
      }

      if (frontendData && frontendData.success_rate >= 95) {
        console.log(`${colors.green}✓${colors.reset} Frontend patterns have ${frontendData.success_rate.toFixed(1)}% success rate → Maintain current approach`);
      }

      // Check for low-performing commands
      Object.entries(stats.by_command).forEach(([cmd, cmdStats]) => {
        if (cmdStats.success_rate < 90) {
          console.log(`${colors.yellow}⚠️${colors.reset}  ${cmd} has ${(100 - cmdStats.success_rate).toFixed(1)}% failure rate → Review and improve`);
        }
      });

      if (stats.low_confidence_alerts.length > 0) {
        console.log(`${colors.yellow}⚠️${colors.reset}  ${stats.low_confidence_alerts.length} low confidence alerts → Review evidence and context`);
      }
    }
    console.log();

    // Factor contribution
    console.log(`${colors.cyan}🎯 FACTOR CONTRIBUTION (Average Across All Checks)${colors.reset}              Score  |  Weight`);
    console.log('─'.repeat(80));

    if (stats.total_entries === 0) {
      console.log('No factor data available');
    } else {
      const factorWeights = {
        evidence: '15%',
        consistency: '15%',
        complexity: '15-20% (dynamic)',
        expert_confidence: '15-30% (dynamic)',
        context_depth: '10%',
        pattern_match: '10-25% (dynamic)',
        historical_data: '5%'
      };

      Object.entries(stats.factor_averages).forEach(([factor, score]) => {
        const name = factor.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const weight = factorWeights[factor];
        console.log(
          `${name.padEnd(24)}` +
          `${score.toFixed(1)}%  ` +
          this.drawProgressBar(score) +
          `    ${weight}`
        );
      });
    }
    console.log();

    // Export options
    console.log(`${colors.cyan}📥 EXPORT OPTIONS${colors.reset}`);
    console.log('─'.repeat(80));
    console.log(`[1] Export to JSON       [2] Export to CSV       [3] Export to Markdown`);
    console.log(`[4] Show Detailed Report [5] Filter by Date      [6] Filter by Category`);
    console.log(`[Q] Quit`);
    console.log();
  }

  /**
   * Show detailed report
   */
  async showDetailedReport() {
    const stats = this.calculateStatistics(this.filteredEntries);

    console.clear();
    this.drawBoxHeader('DETAILED CONFIDENCE REPORT');
    console.log();

    // Factor breakdown
    console.log(`${colors.cyan}📊 FACTOR BREAKDOWN (Last 7 Days)${colors.reset}`);
    console.log();

    console.log(box.rowTop + box.rowHorizontal.repeat(18) + box.teeDown + box.rowHorizontal.repeat(10) + box.teeDown + box.rowHorizontal.repeat(10) + box.teeDown + box.rowHorizontal.repeat(10) + box.teeDown + box.rowHorizontal.repeat(10) + box.teeDown + box.rowHorizontal.repeat(14) + box.rowRight);
    console.log(box.rowVertical + ' Factor           ' + box.rowVertical + '   Min    ' + box.rowVertical + '   Max    ' + box.rowVertical + '   Avg    ' + box.rowVertical + '  StdDev  ' + box.rowVertical + '   Trend      ' + box.rowVertical);
    console.log(box.teeRight + box.rowHorizontal.repeat(18) + box.cross + box.rowHorizontal.repeat(10) + box.cross + box.rowHorizontal.repeat(10) + box.cross + box.rowHorizontal.repeat(10) + box.cross + box.rowHorizontal.repeat(10) + box.cross + box.rowHorizontal.repeat(14) + box.teeLeft);

    Object.entries(stats.factor_averages).forEach(([factor, avg]) => {
      const name = factor.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      // Calculate min/max from entries
      const values = this.filteredEntries
        .filter(e => e.confidence?.factors?.[factor] !== undefined)
        .map(e => e.confidence.factors[factor]);

      const min = values.length > 0 ? Math.min(...values) : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;
      const stdDev = this.calculateStdDev(values);
      const trend = avg >= 90 ? '↗ Improving' : avg >= 80 ? '→ Stable' : '↘ Declining';

      console.log(
        box.rowVertical + ` ${name.padEnd(16)} ` +
        box.rowVertical + `  ${min.toFixed(1)}%   ` +
        box.rowVertical + `  ${max.toFixed(1)}%  ` +
        box.rowVertical + `  ${avg.toFixed(1)}%   ` +
        box.rowVertical + `   ${stdDev.toFixed(1)}    ` +
        box.rowVertical + `  ${trend}   ` +
        box.rowVertical
      );
    });

    console.log(box.rowBottom + box.rowHorizontal.repeat(18) + box.teeUp + box.rowHorizontal.repeat(10) + box.teeUp + box.rowHorizontal.repeat(10) + box.teeUp + box.rowHorizontal.repeat(10) + box.teeUp + box.rowHorizontal.repeat(10) + box.teeUp + box.rowHorizontal.repeat(14) + box.rowBottomRight);
    console.log();
    console.log('Legend: ↗ Improving  → Stable  ↘ Declining');
    console.log();

    // Command performance
    console.log(`${colors.cyan}📊 COMMAND PERFORMANCE (Sorted by Success Rate)${colors.reset}`);
    console.log();

    const commands = Object.entries(stats.by_command)
      .sort((a, b) => b[1].success_rate - a[1].success_rate);

    if (commands.length > 0) {
      console.log(box.rowTop + box.rowHorizontal.repeat(14) + box.teeDown + box.rowHorizontal.repeat(8) + box.teeDown + box.rowHorizontal.repeat(14) + box.teeDown + box.rowHorizontal.repeat(14) + box.teeDown + box.rowHorizontal.repeat(24) + box.rowRight);
      console.log(box.rowVertical + ' Command      ' + box.rowVertical + ' Count  ' + box.rowVertical + '  Avg Conf    ' + box.rowVertical + '  Success %   ' + box.rowVertical + '   Avg Exec Time        ' + box.rowVertical);
      console.log(box.teeRight + box.rowHorizontal.repeat(14) + box.cross + box.rowHorizontal.repeat(8) + box.cross + box.rowHorizontal.repeat(14) + box.cross + box.rowHorizontal.repeat(14) + box.cross + box.rowHorizontal.repeat(24) + box.teeLeft);

      commands.forEach(([cmd, cmdStats]) => {
        const status = cmdStats.success_rate >= 95 ? '✅' : '⚠️';
        const execTime = cmdStats.avg_execution_time ? `${(cmdStats.avg_execution_time / 1000).toFixed(1)}s` : 'N/A';
        console.log(
          box.rowVertical + ` ${cmd.padEnd(12)} ` +
          box.rowVertical + `   ${cmdStats.count.toString().padStart(2)}   ` +
          box.rowVertical + `   ${cmdStats.avg_confidence.toFixed(1)}%      ` +
          box.rowVertical + `    ${cmdStats.success_rate.toFixed(1)}%  ${status} ` +
          box.rowVertical + `    ${execTime.padEnd(18)} ` +
          box.rowVertical
        );
      });

      console.log(box.rowBottom + box.rowHorizontal.repeat(14) + box.teeUp + box.rowHorizontal.repeat(8) + box.teeUp + box.rowHorizontal.repeat(14) + box.teeUp + box.rowHorizontal.repeat(14) + box.teeUp + box.rowHorizontal.repeat(24) + box.rowBottomRight);
    }
    console.log();

    // Failed checks analysis
    if (stats.failed_checks.length > 0) {
      console.log(`${colors.yellow}⚠️  FAILED CHECKS ANALYSIS (Last 7 Days)${colors.reset}`);
      console.log();

      console.log(box.rowTop + box.rowHorizontal.repeat(22) + box.teeDown + box.rowHorizontal.repeat(14) + box.teeDown + box.rowHorizontal.repeat(13) + box.teeDown + box.rowHorizontal.repeat(24) + box.rowRight);
      console.log(box.rowVertical + ' Feature              ' + box.rowVertical + '  Command     ' + box.rowVertical + '  Conf       ' + box.rowVertical + '   Failure Reason       ' + box.rowVertical);
      console.log(box.teeRight + box.rowHorizontal.repeat(22) + box.cross + box.rowHorizontal.repeat(14) + box.cross + box.rowHorizontal.repeat(13) + box.cross + box.rowHorizontal.repeat(24) + box.teeLeft);

      stats.failed_checks.forEach(check => {
        const feature = (check.feature || 'unknown').substring(0, 20).padEnd(20);
        const cmd = (check.command || '').padEnd(12);
        const conf = `${(check.confidence?.overall || 0).toFixed(1)}%`.padEnd(11);
        const reason = (check.outcome?.error || 'Unknown error').substring(0, 22).padEnd(22);

        console.log(
          box.rowVertical + ` ${feature} ` +
          box.rowVertical + `  ${cmd} ` +
          box.rowVertical + `  ${conf} ` +
          box.rowVertical + `   ${reason} ` +
          box.rowVertical
        );
      });

      console.log(box.rowBottom + box.rowHorizontal.repeat(22) + box.teeUp + box.rowHorizontal.repeat(14) + box.teeUp + box.rowHorizontal.repeat(13) + box.teeUp + box.rowHorizontal.repeat(24) + box.rowBottomRight);
      console.log();
      console.log(`Total failed: ${stats.failed_checks.length} (${stats.false_positive_rate.toFixed(1)}% of all checks)`);
      console.log();
    }

    // Improvement recommendations
    console.log(`${colors.magenta}💡 IMPROVEMENT RECOMMENDATIONS${colors.reset}`);
    console.log();
    console.log('Based on historical checks, here are data-driven recommendations:');
    console.log();

    // Generate recommendations
    let priority = 1;

    // Check for low-performing commands
    Object.entries(stats.by_command).forEach(([cmd, cmdStats]) => {
      if (cmdStats.success_rate < 90) {
        console.log(`${priority}. HIGH PRIORITY: Improve ${cmd} confidence`);
        console.log(`   Current: ${cmdStats.avg_confidence.toFixed(1)}% avg (${(100 - cmdStats.success_rate).toFixed(1)}% failure rate)`);
        console.log(`   Target: 90%+ avg (<2% failure rate)`);
        console.log(`   Action: Review patterns and add more evidence sources`);
        console.log(`   Expected: +${(90 - cmdStats.avg_confidence).toFixed(1)}% confidence`);
        console.log();
        priority++;
      }
    });

    // Check for low factors
    Object.entries(stats.factor_averages).forEach(([factor, avg]) => {
      if (avg < 85) {
        const name = factor.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        console.log(`${priority}. MEDIUM PRIORITY: Improve ${name} factor`);
        console.log(`   Current: ${avg.toFixed(1)}% avg`);
        console.log(`   Target: 90%+ avg`);
        console.log(`   Action: Enhance ${factor.replace(/_/g, ' ')} in quality gates`);
        console.log(`   Expected: +${(90 - avg).toFixed(1)}% factor score`);
        console.log();
        priority++;
      }
    });

    if (priority === 1) {
      console.log('All metrics are performing well! No immediate recommendations.');
      console.log();
    }

    console.log(`\nPress ${colors.bold}[Enter]${colors.reset} to return to main menu...`);
  }

  /**
   * Calculate standard deviation
   */
  calculateStdDev(values) {
    if (values.length === 0) return 0;
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Filter entries by date range
   */
  async filterByDate(startDate, endDate) {
    if (!startDate || !endDate) {
      console.clear();
      this.drawBoxHeader('FILTER BY DATE RANGE');
      console.log();
      console.log('Available date ranges:');
      console.log('[1] Last 24 hours');
      console.log('[2] Last 7 days (default)');
      console.log('[3] Last 30 days');
      console.log('[4] Last 90 days');
      console.log('[5] All time');
      console.log('[6] Custom range');
      console.log();

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      return new Promise((resolve) => {
        rl.question('Enter option (1-6): ', (answer) => {
          rl.close();

          const now = new Date();
          let start, end = now;

          switch (answer) {
            case '1':
              start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case '2':
              start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case '3':
              start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case '4':
              start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            case '5':
              start = new Date(0);
              break;
            default:
              console.log('Invalid option');
              resolve();
              return;
          }

          this.filteredEntries = this.history.history.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= start && entryDate <= end;
          });

          console.log(`\n${colors.green}✓${colors.reset} Filtered to ${this.filteredEntries.length} entries`);
          setTimeout(resolve, 1000);
        });
      });
    } else {
      // Custom date range
      const start = new Date(startDate);
      const end = new Date(endDate);

      this.filteredEntries = this.history.history.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= start && entryDate <= end;
      });

      console.log(`${colors.green}✓${colors.reset} Filtered to ${this.filteredEntries.length} entries between ${startDate} and ${endDate}`);
    }
  }

  /**
   * Filter entries by category
   */
  async filterByCategory(category) {
    if (!category) {
      console.clear();
      this.drawBoxHeader('FILTER BY CATEGORY');
      console.log();

      const stats = this.calculateStatistics(this.history.history);
      const categories = Object.keys(stats.by_category);

      if (categories.length === 0) {
        console.log('No categories found in history');
        console.log(`\nPress ${colors.bold}[Enter]${colors.reset} to continue...`);
        return;
      }

      console.log('Available categories:');
      categories.forEach((cat, index) => {
        const catStats = stats.by_category[cat];
        console.log(`[${index + 1}] ${cat} (${catStats.count} checks)`);
      });
      console.log();

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      return new Promise((resolve) => {
        rl.question(`Enter option (1-${categories.length}): `, (answer) => {
          rl.close();

          const index = parseInt(answer) - 1;
          if (index >= 0 && index < categories.length) {
            const selectedCategory = categories[index];
            this.filteredEntries = this.history.history.filter(entry => entry.category === selectedCategory);
            console.log(`\n${colors.green}✓${colors.reset} Filtered to ${selectedCategory}: ${this.filteredEntries.length} entries`);
            setTimeout(resolve, 1000);
          } else {
            console.log('Invalid option');
            resolve();
          }
        });
      });
    } else {
      // Direct category filter
      this.filteredEntries = this.history.history.filter(entry => entry.category === category);
      console.log(`${colors.green}✓${colors.reset} Filtered to ${category}: ${this.filteredEntries.length} entries`);
    }
  }

  /**
   * Export to JSON
   */
  async exportJSON(outputPath) {
    await fs.mkdir(this.reportsDir, { recursive: true });

    const dateStr = new Date().toISOString().split('T')[0];
    const exportPath = outputPath || path.join(this.reportsDir, `confidence-export-${dateStr}.json`);

    const stats = this.calculateStatistics(this.filteredEntries);
    const exportData = {
      export_date: new Date().toISOString(),
      branch: 'dev',
      period: {
        start: this.filteredEntries.length > 0 ? this.filteredEntries[0].timestamp : null,
        end: this.filteredEntries.length > 0 ? this.filteredEntries[this.filteredEntries.length - 1].timestamp : null
      },
      summary: {
        total_checks: stats.total_entries,
        avg_confidence: stats.avg_confidence,
        success_rate: stats.success_rate,
        false_positive_rate: stats.false_positive_rate
      },
      entries: this.filteredEntries,
      statistics: stats
    };

    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));

    console.log(`\n${colors.green}✅ Exported to: ${exportPath}${colors.reset}`);
    console.log(`File size: ${(JSON.stringify(exportData).length / 1024).toFixed(1)} KB`);
    console.log(`Entries: ${this.filteredEntries.length}`);
    console.log();
    console.log('Export includes:');
    console.log('  ✓ All history entries');
    console.log('  ✓ Aggregated statistics');
    console.log('  ✓ Factor breakdowns');
    console.log('  ✓ Trend data');
    console.log();
  }

  /**
   * Export to CSV
   */
  async exportCSV(outputPath) {
    await fs.mkdir(this.reportsDir, { recursive: true });

    const dateStr = new Date().toISOString().split('T')[0];
    const exportPath = outputPath || path.join(this.reportsDir, `confidence-export-${dateStr}.csv`);

    const csvLines = [
      'ID,Timestamp,Command,Feature,Category,Complexity,Overall_Conf,Evidence,Consistency,Complexity_Score,Expert_Conf,Context_Depth,Pattern_Match,Historical,Passed,Outcome,Execution_Time,Success'
    ];

    this.filteredEntries.forEach(entry => {
      csvLines.push([
        entry.id,
        entry.timestamp,
        entry.command,
        entry.feature || '',
        entry.category || '',
        entry.complexity || '',
        entry.confidence?.overall || 0,
        entry.confidence?.factors?.evidence || 0,
        entry.confidence?.factors?.consistency || 0,
        entry.confidence?.factors?.complexity || 0,
        entry.confidence?.factors?.expert_confidence || 0,
        entry.confidence?.factors?.context_depth || 0,
        entry.confidence?.factors?.pattern_match || 0,
        entry.confidence?.factors?.historical_data || 0,
        entry.confidence?.passed || false,
        entry.outcome?.status || '',
        entry.outcome?.execution_time || '',
        entry.outcome?.status === 'success'
      ].join(','));
    });

    await fs.writeFile(exportPath, csvLines.join('\n'));

    console.log(`\n${colors.green}✅ Exported to: ${exportPath}${colors.reset}`);
    console.log(`File size: ${(csvLines.join('\n').length / 1024).toFixed(1)} KB`);
    console.log(`Rows: ${csvLines.length} (1 header + ${this.filteredEntries.length} entries)`);
    console.log();
    console.log('CSV columns:');
    console.log('  ID, Timestamp, Command, Feature, Category, Complexity,');
    console.log('  Overall_Conf, Evidence, Consistency, Complexity_Score,');
    console.log('  Expert_Conf, Context_Depth, Pattern_Match, Historical,');
    console.log('  Passed, Outcome, Execution_Time, Success');
    console.log();
  }

  /**
   * Export to Markdown
   */
  async exportMarkdown(outputPath) {
    await fs.mkdir(this.reportsDir, { recursive: true });

    const dateStr = new Date().toISOString().split('T')[0];
    const exportPath = outputPath || path.join(this.reportsDir, `confidence-report-${dateStr}.md`);

    const stats = this.calculateStatistics(this.filteredEntries);

    let markdown = `# Confidence Report - ${dateStr}\n\n`;
    markdown += `## Executive Summary\n\n`;
    markdown += `- **Total Checks**: ${stats.total_entries}\n`;
    markdown += `- **Average Confidence**: ${stats.avg_confidence.toFixed(1)}%\n`;
    markdown += `- **Success Rate**: ${stats.success_rate.toFixed(1)}%\n`;
    markdown += `- **False Positive Rate**: ${stats.false_positive_rate.toFixed(1)}%\n\n`;

    markdown += `## Statistics by Command\n\n`;
    markdown += `| Command | Count | Avg Confidence | Success Rate | Avg Exec Time |\n`;
    markdown += `|---------|-------|----------------|--------------|---------------|\n`;
    Object.entries(stats.by_command).forEach(([cmd, cmdStats]) => {
      const execTime = cmdStats.avg_execution_time ? `${(cmdStats.avg_execution_time / 1000).toFixed(1)}s` : 'N/A';
      markdown += `| ${cmd} | ${cmdStats.count} | ${cmdStats.avg_confidence.toFixed(1)}% | ${cmdStats.success_rate.toFixed(1)}% | ${execTime} |\n`;
    });
    markdown += `\n`;

    markdown += `## Statistics by Category\n\n`;
    markdown += `| Category | Count | Avg Confidence | Success Rate | Top Patterns |\n`;
    markdown += `|----------|-------|----------------|--------------|-------------|\n`;
    Object.entries(stats.by_category).forEach(([cat, catStats]) => {
      const patterns = catStats.top_patterns.join(', ');
      markdown += `| ${cat} | ${catStats.count} | ${catStats.avg_confidence.toFixed(1)}% | ${catStats.success_rate.toFixed(1)}% | ${patterns} |\n`;
    });
    markdown += `\n`;

    markdown += `## Factor Averages\n\n`;
    markdown += `| Factor | Average Score |\n`;
    markdown += `|--------|---------------|\n`;
    Object.entries(stats.factor_averages).forEach(([factor, avg]) => {
      const name = factor.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      markdown += `| ${name} | ${avg.toFixed(1)}% |\n`;
    });
    markdown += `\n`;

    if (stats.failed_checks.length > 0) {
      markdown += `## Failed Checks\n\n`;
      markdown += `| Feature | Command | Confidence | Error |\n`;
      markdown += `|---------|---------|------------|-------|\n`;
      stats.failed_checks.forEach(check => {
        markdown += `| ${check.feature || 'unknown'} | ${check.command || ''} | ${(check.confidence?.overall || 0).toFixed(1)}% | ${check.outcome?.error || 'Unknown'} |\n`;
      });
      markdown += `\n`;
    }

    markdown += `## Recommendations\n\n`;

    // Generate recommendations
    let hasRecommendations = false;

    Object.entries(stats.by_command).forEach(([cmd, cmdStats]) => {
      if (cmdStats.success_rate < 90) {
        markdown += `1. **HIGH PRIORITY**: Improve ${cmd} confidence\n`;
        markdown += `   - Current: ${cmdStats.avg_confidence.toFixed(1)}% avg (${(100 - cmdStats.success_rate).toFixed(1)}% failure rate)\n`;
        markdown += `   - Target: 90%+ avg (<2% failure rate)\n`;
        markdown += `   - Action: Review patterns and add more evidence sources\n\n`;
        hasRecommendations = true;
      }
    });

    if (!hasRecommendations) {
      markdown += `All metrics are performing well! No immediate recommendations.\n`;
    }

    await fs.writeFile(exportPath, markdown);

    console.log(`\n${colors.green}✅ Exported to: ${exportPath}${colors.reset}`);
    console.log(`File size: ${(markdown.length / 1024).toFixed(1)} KB`);
    console.log();
    console.log('Report includes:');
    console.log('  ✓ Executive summary');
    console.log('  ✓ Statistics tables');
    console.log('  ✓ Failed checks analysis');
    console.log('  ✓ Recommendations');
    console.log();
  }

  /**
   * Run interactive dashboard
   */
  async run() {
    await this.loadHistory();

    // Show main dashboard
    await this.drawMainDashboard();

    // Set up readline interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('line', async (input) => {
      const option = input.toLowerCase().trim();

      try {
        if (option === 'q') {
          console.log('\nGoodbye!');
          rl.close();
          process.exit(0);
        } else if (option === '1') {
          await this.exportJSON();
          console.log(`Press ${colors.bold}[Enter]${colors.reset} to continue...`);
        } else if (option === '2') {
          await this.exportCSV();
          console.log(`Press ${colors.bold}[Enter]${colors.reset} to continue...`);
        } else if (option === '3') {
          await this.exportMarkdown();
          console.log(`Press ${colors.bold}[Enter]${colors.reset} to continue...`);
        } else if (option === '4') {
          await this.showDetailedReport();
        } else if (option === '5') {
          await this.filterByDate();
          await this.drawMainDashboard();
        } else if (option === '6') {
          await this.filterByCategory();
          await this.drawMainDashboard();
        } else if (option === '') {
          // Redraw dashboard on Enter
          await this.drawMainDashboard();
        } else {
          console.log(`${colors.yellow}Invalid option. Try again.${colors.reset}`);
        }
      } catch (err) {
        console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
        console.log(`Press ${colors.bold}[Enter]${colors.reset} to continue...`);
      }
    });
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const dashboard = new ConfidenceDashboard();

  try {
    await dashboard.loadHistory();

    // Handle CLI arguments
    if (args.includes('--export')) {
      const exportFormat = args[args.indexOf('--export') + 1];
      if (exportFormat === 'json') {
        await dashboard.exportJSON();
      } else if (exportFormat === 'csv') {
        await dashboard.exportCSV();
      } else if (exportFormat === 'markdown') {
        await dashboard.exportMarkdown();
      } else {
        console.error(`${colors.red}Invalid export format: ${exportFormat}${colors.reset}`);
        console.log('Valid formats: json, csv, markdown');
        process.exit(1);
      }
      process.exit(0);
    } else if (args.includes('--detailed')) {
      await dashboard.showDetailedReport();
      console.log(`\nPress ${colors.bold}[Enter]${colors.reset} to exit...`);
      process.stdin.once('data', () => process.exit(0));
    } else if (args.includes('--filter-date')) {
      const startIndex = args.indexOf('--filter-date') + 1;
      const startDate = args[startIndex];
      const endDate = args[startIndex + 1];

      if (!startDate || !endDate) {
        console.error(`${colors.red}Error: --filter-date requires start and end dates${colors.reset}`);
        console.log('Usage: --filter-date "2025-12-15" "2025-12-22"');
        process.exit(1);
      }

      await dashboard.filterByDate(startDate, endDate);
      await dashboard.drawMainDashboard();
      console.log(`\nPress ${colors.bold}[Enter]${colors.reset} to exit...`);
      process.stdin.once('data', () => process.exit(0));
    } else if (args.includes('--filter-category')) {
      const category = args[args.indexOf('--filter-category') + 1];

      if (!category) {
        console.error(`${colors.red}Error: --filter-category requires a category name${colors.reset}`);
        console.log('Usage: --filter-category backend');
        process.exit(1);
      }

      await dashboard.filterByCategory(category);
      await dashboard.drawMainDashboard();
      console.log(`\nPress ${colors.bold}[Enter]${colors.reset} to exit...`);
      process.stdin.once('data', () => process.exit(0));
    } else {
      // Interactive mode
      await dashboard.run();
    }
  } catch (err) {
    console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run dashboard
if (require.main === module) {
  main();
}

module.exports = ConfidenceDashboard;
