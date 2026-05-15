'use strict';

/**
 * test-validate — Validate generated test files (compile, run, coverage).
 *
 * Args:
 *   --module <id>    Target module ID (required)
 *   --cwd <path>     Working directory (default: process.cwd())
 *
 * Pre-check: test-files.json must exist (from test-generate)
 * Delegates to: TestValidator (SP-3 ETF-TPIP)
 * Output: validation-report.json
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

    // Pre-check: test-files.json must exist
    const filesPath = path.join(cacheDir, 'test-files.json');
    if (!fs.existsSync(filesPath)) return { error: 'Run test-generate first' };
    const testFiles = JSON.parse(fs.readFileSync(filesPath, 'utf8'));

    // Delegate to TestValidator (SP-3)
    const { TestValidator } = require(path.join(pkgRoot, 'core/etf/test-validator.js'));
    const validator = new TestValidator(pkgRoot, args);
    const report = await validator.validate(testFiles, { moduleId });

    // Write-on-Complete (D17)
    const schemas = require(path.join(pkgRoot, 'core/etf/schemas.js'));
    const validationReport = schemas.createValidationReport(report);
    fs.writeFileSync(
      path.join(cacheDir, 'validation-report.json'),
      JSON.stringify(validationReport, null, 2)
    );

    return { moduleId, validationReport, outputPath: path.join(cacheDir, 'validation-report.json') };
  },
};
