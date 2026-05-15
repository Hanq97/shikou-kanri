'use strict';

/**
 * coverage-report — Generate coverage dashboard from validation report.
 *
 * Args:
 *   --module <id>    Target module ID (required)
 *   --cwd <path>     Working directory (default: process.cwd())
 *
 * Pre-check: validation-report.json must exist (from test-validate)
 * Delegates to: CoverageAggregator (SP-3 ETF-TPIP)
 * Output: reports/coverage-dashboard.md (markdown report)
 */

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) return { test: true, available: true };

    const moduleId = args.module;
    if (!moduleId) return { error: 'Missing --module flag' };

    const path = require('path');
    const fs = require('fs');
    const cacheDir = path.join(args.cwd || process.cwd(), '.claude/cache/etf', moduleId);

    // Pre-check: validation-report.json must exist
    const reportPath = path.join(cacheDir, 'validation-report.json');
    if (!fs.existsSync(reportPath)) return { error: 'Run test-validate first' };
    const validationReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    // Delegate to CoverageAggregator (SP-3)
    const aggregator = require(path.join(pkgRoot, 'core/etf/coverage-aggregator.js'));
    const dashboard = aggregator.generateDashboard(
      validationReport.coverageResult?.backend,
      validationReport.coverageResult?.frontend
    );

    // Save markdown report
    const reportDir = path.join(cacheDir, 'reports');
    fs.mkdirSync(reportDir, { recursive: true });
    const dashPath = path.join(reportDir, 'coverage-dashboard.md');
    fs.writeFileSync(dashPath, dashboard);

    return { moduleId, inline: dashboard.substring(0, 500), reportPath: dashPath };
  },
};
