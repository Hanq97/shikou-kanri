'use strict';

/**
 * test-coverage-gate.js — Quality gate for test coverage thresholds.
 *
 * Layer: L4 GUARD
 * Pattern: Gate pattern (E-DD-05)
 *
 * Checks line/branch/method coverage against configurable thresholds.
 * Default threshold: 60% (configurable per-metric).
 */

/**
 * Check if coverage meets threshold.
 *
 * @param {object} validationReport - From schemas.createValidationReport()
 * @param {number|object} [threshold=60] - Single number or { line, branch, method }
 * @returns {{ passed: boolean, coverage: { line: number, branch: number, method: number }, threshold: object, failures: string[] }}
 */
function checkCoverage(validationReport, threshold) {
  const cov = (validationReport && validationReport.coverageResult) || {};

  // Normalize threshold
  let thresholds;
  if (typeof threshold === 'number') {
    thresholds = { line: threshold, branch: threshold, method: threshold };
  } else if (typeof threshold === 'object' && threshold !== null) {
    thresholds = {
      line: threshold.line || 60,
      branch: threshold.branch || 60,
      method: threshold.method || 60,
    };
  } else {
    thresholds = { line: 60, branch: 60, method: 60 };
  }

  const coverage = {
    line: cov.line || 0,
    branch: cov.branch || 0,
    method: cov.method || 0,
  };

  const failures = [];
  if (coverage.line < thresholds.line) {
    failures.push(`line: ${coverage.line}% < ${thresholds.line}%`);
  }
  if (coverage.branch < thresholds.branch) {
    failures.push(`branch: ${coverage.branch}% < ${thresholds.branch}%`);
  }
  if (coverage.method < thresholds.method) {
    failures.push(`method: ${coverage.method}% < ${thresholds.method}%`);
  }

  return {
    passed: failures.length === 0,
    coverage,
    threshold: thresholds,
    failures,
  };
}

module.exports = { checkCoverage };
