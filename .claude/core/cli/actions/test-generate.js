'use strict';

/**
 * test-generate — Generate test plan and test code from scan results.
 *
 * Args:
 *   --module <id>    Target module ID (required)
 *   --cwd <path>     Working directory (default: process.cwd())
 *   --planOnly       Stop after plan stage (skip code generation + validation)
 *   --fromPlan       Skip plan stage (use existing test-plan.json)
 *   --skipValidation Skip validation stage
 *
 * Pre-check: scan-result.json must exist (from test-scan)
 * Delegates to: PipelineExecutor (SP-3 ETF-TPIP)
 * Output: test-plan.json + test-files.json + validation-report.json
 */

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) return { test: true, available: true };

    const moduleId = args.module;
    if (!moduleId) return { error: 'Missing --module flag' };

    const path = require('path');
    const fs = require('fs');
    const projectRoot = args.cwd || process.cwd();
    const cacheDir = path.join(projectRoot, '.claude/cache/etf', moduleId);

    // Pre-check: scan-result.json must exist
    const scanPath = path.join(cacheDir, 'scan-result.json');
    if (!fs.existsSync(scanPath)) return { error: 'Run test-scan first' };

    // Delegate to PipelineExecutor (SP-3)
    const { PipelineExecutor } = require(path.join(pkgRoot, 'core/etf/pipeline-executor.js'));
    const executor = new PipelineExecutor(moduleId, {
      pkgRoot: projectRoot,
      cacheDir,
      planOnly: args.planOnly,
      skipValidation: args.skipValidation,
      fromPlan: args.fromPlan,
    });
    const result = await executor.execute();

    return { moduleId, ...result, outputPath: cacheDir };
  },
};
