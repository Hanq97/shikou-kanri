'use strict';

/**
 * reverse-dd-extract — Generate Detail Design from source code analysis.
 *
 * Args:
 *   --module <id>       Target module ID (required)
 *   --cwd <path>        Working directory (default: process.cwd())
 *   --output-dir <path> Output directory for DD markdown (default: documents/features)
 *
 * Independent from test pipeline (can run without test-scan).
 * Delegates to: AnalysisPipeline (SP-2) → ReverseDDGenerator (SP-2)
 * Output: {module}-reverse-dd.md (markdown) + reverse-dd.json (cache)
 */

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) return { test: true, available: true };

    const moduleId = args.module;
    if (!moduleId) return { error: 'Missing --module flag' };

    const path = require('path');
    const fs = require('fs');

    // Delegate to AnalysisPipeline (SP-2) for scan, then ReverseDDGenerator (SP-2)
    const { AnalysisPipeline } = require(path.join(pkgRoot, 'core/etf/analysis-pipeline.js'));
    const { ReverseDDGenerator } = require(path.join(pkgRoot, 'core/etf/reverse-dd-generator.js'));

    const pipeline = new AnalysisPipeline(moduleId, { pkgRoot, ...args });
    const scanResult = await pipeline.analyze();

    const generator = new ReverseDDGenerator(pkgRoot);
    const result = await generator.generate(scanResult);

    // Write-on-Complete (D17) — markdown document
    const outputDir = args['output-dir'] || path.join(args.cwd || process.cwd(), 'documents/features');
    fs.mkdirSync(outputDir, { recursive: true });
    const ddPath = path.join(outputDir, `${moduleId}-reverse-dd.md`);
    fs.writeFileSync(ddPath, result.document);

    // Write-on-Complete (D17) — JSON cache
    const cacheDir = path.join(args.cwd || process.cwd(), '.claude/cache/etf', moduleId);
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(
      path.join(cacheDir, 'reverse-dd.json'),
      JSON.stringify(result, null, 2)
    );

    return { moduleId, ddPath, confidenceReport: result.confidenceReport };
  },
};
