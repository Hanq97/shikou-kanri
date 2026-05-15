'use strict';

/**
 * report-generator.js — Generate structured reports for ETF command results.
 *
 * Layer: L5 SKILL
 *
 * Generates inline (conversation) + file (markdown) formats.
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate report for any ETF command result.
 *
 * @param {string} command - "test" | "reverse-dd"
 * @param {string} sub - Sub-command
 * @param {object} moduleContext - Module context
 * @param {object} result - Command result
 * @returns {{inline: string, file: string, filePath: string}}
 */
function generateReport(command, sub, moduleContext, result) {
  if (command === 'test' && sub === 'scan') {
    return _reportScan(moduleContext, result);
  }
  if (command === 'test' && sub === 'generate') {
    return _reportGenerate(moduleContext, result);
  }
  if (command === 'test' && sub === 'validate') {
    return _reportValidate(moduleContext, result);
  }
  if (command === 'reverse-dd') {
    return _reportReverseDD(moduleContext, result);
  }

  return {
    inline: 'Command completed: ' + command + ' ' + sub,
    file: '',
    filePath: '',
  };
}

/**
 * Format scan result for inline display.
 */
function formatScanInline(moduleContext, scanResult) {
  if (!scanResult) return 'No scan result available.';

  const lines = [];
  lines.push('Scan complete for ' + (scanResult.moduleId || 'unknown'));
  lines.push('');
  lines.push('| Category | Count |');
  lines.push('|----------|-------|');
  lines.push('| API Contracts | ' + (scanResult.apiContracts || []).length + ' |');
  lines.push('| Entities | ' + (scanResult.entities || []).length + ' |');
  lines.push('| Business Rules | ' + (scanResult.businessRules || []).length + ' |');
  lines.push('| Dependencies | ' + (scanResult.dependencies || []).length + ' |');
  lines.push('');
  lines.push('Quality: ' + (scanResult.qualityLevel || 'MINIMAL'));

  // DD enrichment info
  if (scanResult.mode === 'DD_FIRST') {
    lines.push('Mode: DD_FIRST');
    if (scanResult.ddMetadata) {
      const dd = scanResult.ddMetadata;
      lines.push('');
      lines.push('| DD Data | Count |');
      lines.push('|---------|-------|');
      lines.push('| Entities | ' + (dd.entities || []).length + ' |');
      lines.push('| API Specs | ' + (dd.apiSpecs || []).length + ' |');
      lines.push('| Workflows | ' + (dd.workflows || []).length + ' |');
      lines.push('| Error Codes | ' + (dd.errorCodes || []).length + ' |');
      lines.push('| Business Rules | ' + (dd.businessRules || []).length + ' |');
      lines.push('| Source | ' + (dd.source || 'unknown') + ' |');
    }
    if (scanResult.crossValidation) {
      const cv = scanResult.crossValidation;
      lines.push('');
      lines.push('DD<->DB Cross-Validation:');
      lines.push('  Matches: ' + (cv.matches || []).length);
      lines.push('  Mismatches: ' + (cv.mismatches || []).length);
      lines.push('  Missing: ' + (cv.missing || []).length);
    }
  } else {
    lines.push('Mode: CODE_FIRST');
  }

  return lines.join('\n');
}

/**
 * Format validation result as full markdown.
 */
function formatValidationMarkdown(moduleContext, validationResult) {
  if (!validationResult) return '# Validation Report\n\nNo results available.';

  const lines = [];
  lines.push('# Validation Report: ' + (validationResult.moduleId || 'unknown'));
  lines.push('');
  lines.push('Generated: ' + new Date().toISOString());
  lines.push('');

  // Compile
  lines.push('## Compile Check');
  const compile = validationResult.compileResult || {};
  lines.push('- Status: ' + (compile.success ? 'PASS' : 'FAIL'));
  if (compile.failedFiles && compile.failedFiles.length > 0) {
    lines.push('- Failed files: ' + compile.failedFiles.length);
    for (const f of compile.failedFiles) {
      lines.push('  - ' + f);
    }
  }

  // Run
  lines.push('');
  lines.push('## Test Execution');
  const run = validationResult.runResult || {};
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push('| Passed | ' + (run.passed || 0) + ' |');
  lines.push('| Failed | ' + (run.failed || 0) + ' |');
  lines.push('| Skipped | ' + (run.skipped || 0) + ' |');
  lines.push('| Duration | ' + (run.duration || 0) + 'ms |');

  // Coverage
  lines.push('');
  lines.push('## Coverage');
  const cov = validationResult.coverageResult || {};
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push('| Line | ' + (cov.line || 0) + '% |');
  lines.push('| Branch | ' + (cov.branch || 0) + '% |');
  lines.push('| Method | ' + (cov.method || 0) + '% |');

  // Quality score
  lines.push('');
  lines.push('## Quality Score: ' + (validationResult.qualityScore || 0) + '/100');

  return lines.join('\n');
}

/**
 * Format reverse-DD confidence for inline display.
 */
function formatConfidenceInline(moduleContext, reverseDD) {
  if (!reverseDD) return 'No reverse DD result available.';

  const lines = [];
  lines.push('Reverse DD generated for ' + (reverseDD.moduleId || 'unknown'));
  lines.push('');

  if (reverseDD.confidenceSummary) {
    const summary = reverseDD.confidenceSummary;
    lines.push('Confidence Summary:');
    lines.push('  EXTRACTED (>=90%): ' + (summary.EXTRACTED || 0) + ' sections');
    lines.push('  INFERRED (55-89%): ' + (summary.INFERRED || 0) + ' sections');
    lines.push('  MISSING (<55%):    ' + (summary.MISSING || 0) + ' sections');
  }

  return lines.join('\n');
}

/**
 * Generate aggregate cross-module report.
 */
function generateAggregateReport(results) {
  const lines = [];
  lines.push('# ETF Aggregate Report');
  lines.push('');
  lines.push('Generated: ' + new Date().toISOString());
  lines.push('');
  lines.push('| Module | Stage | Quality | Coverage |');
  lines.push('|--------|-------|---------|----------|');

  for (const [moduleId, result] of Object.entries(results)) {
    const stage = result.stage || 'unknown';
    const quality = result.qualityScore || '-';
    const coverage = result.coverageResult ? result.coverageResult.line + '%' : '-';
    lines.push('| ' + moduleId + ' | ' + stage + ' | ' + quality + ' | ' + coverage + ' |');
  }

  const aggregatePath = path.join(process.cwd(), '.claude', 'cache', 'etf', 'aggregate-report.md');
  return { inline: lines.join('\n'), aggregatePath };
}

// ── Internal Report Generators ───────────────────────────────────────────────

function _reportScan(moduleContext, result) {
  const inline = formatScanInline(moduleContext, result);
  const filePath = moduleContext && moduleContext.cacheDir
    ? path.join(moduleContext.cacheDir, 'scan-report.md')
    : '';

  const file = '# Scan Report\n\n' + inline;

  if (filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, file);
  }

  return { inline, file, filePath };
}

function _reportGenerate(moduleContext, result) {
  const testPlan = result ? result.testPlan : null;
  const testFiles = result ? result.testFiles : null;

  const lines = [];
  lines.push('Test generation complete');
  lines.push('');

  if (testPlan) {
    const stats = testPlan.stats || {};
    lines.push('Test Plan: ' + (stats.total || 0) + ' test cases');
    lines.push('  Unit: ' + (stats.unit || 0));
    lines.push('  Integration: ' + (stats.integration || 0));
    lines.push('  E2E: ' + (stats.e2e || 0));
    lines.push('  Abnormal ratio: ' + ((stats.abnormalRatio || 0) * 100).toFixed(0) + '%');
  }

  if (testFiles) {
    const fileStats = testFiles.stats || {};
    lines.push('');
    lines.push('Generated: ' + (fileStats.totalFiles || 0) + ' files, ' + (fileStats.totalLines || 0) + ' lines');
  }

  // DD Traceability (if DD_FIRST mode)
  if (result && result.traceability) {
    const t = result.traceability;
    const s = t.summary || {};
    lines.push('');
    lines.push('DD Traceability:');
    lines.push('  Requirements: ' + (s.totalRequirements || 0) + ' total');
    lines.push('  Covered: ' + (s.coveredRequirements || 0) + ' (' + (s.coveragePercent || 0) + '%)');
    lines.push('  Uncovered: ' + (s.uncoveredRequirements || 0));
    lines.push('  Orphan tests: ' + (s.orphanTests || 0));
    lines.push('  Mismatches: ' + (s.mismatchCount || 0));
  }

  const inline = lines.join('\n');
  const filePath = moduleContext && moduleContext.cacheDir
    ? path.join(moduleContext.cacheDir, 'generate-report.md')
    : '';

  return { inline, file: '# Generation Report\n\n' + inline, filePath };
}

function _reportValidate(moduleContext, result) {
  const validationReport = result ? result.validationReport : null;
  const inline = validationReport
    ? 'Quality Score: ' + (validationReport.qualityScore || 0) + '/100'
    : 'No validation results.';

  const file = formatValidationMarkdown(moduleContext, validationReport);
  const filePath = moduleContext && moduleContext.cacheDir
    ? path.join(moduleContext.cacheDir, 'validation-report.md')
    : '';

  if (filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, file);
  }

  return { inline, file, filePath };
}

function _reportReverseDD(moduleContext, result) {
  const inline = formatConfidenceInline(moduleContext, result);
  return { inline, file: '', filePath: result ? result.outputPath || '' : '' };
}

/**
 * Format traceability matrix for inline display.
 */
function formatTraceabilityInline(matrix) {
  if (!matrix || !matrix.summary) return 'No traceability data available.';

  const s = matrix.summary;
  const lines = [];
  lines.push('DD Requirement Traceability');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push('| Total Requirements | ' + (s.totalRequirements || 0) + ' |');
  lines.push('| Covered | ' + (s.coveredRequirements || 0) + ' (' + (s.coveragePercent || 0) + '%) |');
  lines.push('| Uncovered | ' + (s.uncoveredRequirements || 0) + ' |');
  lines.push('| Orphan Tests | ' + (s.orphanTests || 0) + ' |');
  lines.push('| DD<->DB<->Code Mismatches | ' + (s.mismatchCount || 0) + ' |');

  const uncovered = (matrix.mappings || []).filter(m => m.testCaseIds.length === 0);
  if (uncovered.length > 0) {
    lines.push('');
    lines.push('Top uncovered:');
    for (const u of uncovered.slice(0, 5)) {
      lines.push('  - ' + u.ddRequirement + ': ' + (u.description || '').substring(0, 60));
    }
    if (uncovered.length > 5) {
      lines.push('  ... and ' + (uncovered.length - 5) + ' more');
    }
  }

  return lines.join('\n');
}

module.exports = {
  generateReport,
  formatScanInline,
  formatValidationMarkdown,
  formatConfidenceInline,
  formatTraceabilityInline,
  generateAggregateReport,
};
