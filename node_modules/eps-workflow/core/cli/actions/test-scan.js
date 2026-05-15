'use strict';

/**
 * test-scan — Scan module source code for test generation context.
 *
 * Args:
 *   --module <id>    Target module ID (required, e.g., cmn001000)
 *   --cwd <path>     Working directory (default: process.cwd())
 *
 * Delegates to: AnalysisPipeline (SP-2 ETF-INTL)
 * Output: .claude/cache/etf/{moduleId}/scan-result.json
 */

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    // Test stub
    if (args.test) return { test: true, available: true };

    // Validate required args
    const moduleId = args.module;
    if (!moduleId) return { error: 'Missing --module flag' };

    const path = require('path');

    // Delegate to ETF-INTL analysis pipeline (SP-2)
    const { AnalysisPipeline } = require(path.join(pkgRoot, 'core/etf/analysis-pipeline.js'));

    // Use target project root (cwd) for discovery, not framework pkgRoot
    const projectRoot = args.cwd || process.cwd();
    const cacheDir = path.join(projectRoot, '.claude/cache/etf', moduleId);

    const pipeline = new AnalysisPipeline(moduleId, {
      pkgRoot: projectRoot,
      cacheDir,
      ragEnabled: args.ragEnabled,
      claudeEnabled: args.claudeEnabled,
      geminiEnabled: args.geminiEnabled,
    });
    const result = await pipeline.analyze();

    // Pipeline already writes scan-result.json via _writeFinalResult
    return { moduleId, scanResult: result, outputPath: path.join(cacheDir, 'scan-result.json') };
  },
};
