'use strict';

/**
 * test-validator.js — 3-step test validation: compile → run → coverage.
 *
 * Layer: L2 MICRO-CMD
 * Pattern: Quality Gate [BD Component: QUALITY_GATE_SYSTEM]
 *
 * Compile check (mvn test-compile / tsc --noEmit)
 * Test execution (mvn test / vitest run)
 * Coverage report (JaCoCo XML / Istanbul JSON)
 */

const { execSync } = require('child_process');
const path = require('path');
const schemas = require('./schemas.js');

class TestValidator {
  /**
   * @param {string} pkgRoot - Package root directory
   * @param {object} [options]
   * @param {number} [options.timeout] - Execution timeout in ms (default 300000)
   * @param {number} [options.coverageThreshold] - Minimum coverage % (default 60)
   */
  constructor(pkgRoot, options) {
    options = options || {};
    this.pkgRoot = pkgRoot;
    this.timeout = options.timeout || 300000;
    this.coverageThreshold = options.coverageThreshold || 60;
  }

  /**
   * Validate test files: compile → run → coverage.
   *
   * @param {object} testFiles - TestFile from test-code-generator
   * @param {object} moduleContext - Module context
   * @returns {Promise<object>} ValidationReport (SP-1 schema)
   */
  async validate(testFiles, moduleContext) {
    const files = testFiles.files || [];
    if (files.length === 0) {
      return schemas.createValidationReport({
        moduleId: testFiles.moduleId,
        compileResult: { success: true, failedFiles: [], errors: [] },
        runResult: { passed: 0, failed: 0, skipped: 0, duration: 0 },
        coverageResult: { line: 0, branch: 0, method: 0 },
        qualityScore: 0,
      });
    }

    // Step 1: Compile check
    const compileResult = await this.compileCheck(testFiles);

    // Gate: >= 90% compile success
    const compileRate = files.length > 0
      ? (files.length - compileResult.failedFiles.length) / files.length
      : 1;

    if (compileRate < 0.90) {
      return schemas.createValidationReport({
        moduleId: testFiles.moduleId,
        compileResult,
        runResult: { passed: 0, failed: 0, skipped: 0, duration: 0 },
        coverageResult: { line: 0, branch: 0, method: 0 },
        qualityScore: Math.round(compileRate * 30),
      });
    }

    // Step 2: Run tests
    const runResult = await this.runTests(testFiles);

    // Step 3: Collect coverage
    const coverageResult = await this.collectCoverage(testFiles, testFiles.language);

    // Calculate quality score
    const qualityScore = this._calculateQualityScore(compileResult, runResult, coverageResult, files.length);

    return schemas.createValidationReport({
      moduleId: testFiles.moduleId,
      compileResult,
      runResult,
      coverageResult,
      qualityScore,
    });
  }

  /**
   * Compile check for test files.
   *
   * @param {object} testFiles
   * @returns {Promise<{success: boolean, failedFiles: string[], errors: string[]}>}
   */
  async compileCheck(testFiles) {
    const language = testFiles.language || 'java';
    const result = { success: true, failedFiles: [], errors: [] };

    try {
      if (language === 'java') {
        this._exec('mvn test-compile -q', this.pkgRoot);
      } else if (language === 'typescript') {
        this._exec('npx tsc --noEmit', this.pkgRoot);
      }
    } catch (err) {
      result.success = false;
      result.errors.push(err.message || 'Compilation failed');

      // Parse failed files from error output
      const output = (err.stdout || '') + (err.stderr || '');
      const failedFiles = this._parseFailedFiles(output, language);
      result.failedFiles = failedFiles;
    }

    return result;
  }

  /**
   * Run test files and collect results.
   *
   * @param {object} testFiles
   * @returns {Promise<{passed: number, failed: number, skipped: number, duration: number}>}
   */
  async runTests(testFiles) {
    const language = testFiles.language || 'java';
    const start = Date.now();

    try {
      let output;
      if (language === 'java') {
        output = this._exec('mvn test -q', this.pkgRoot);
      } else if (language === 'typescript') {
        output = this._exec('npx vitest run --reporter=json', this.pkgRoot);
      }

      const duration = Date.now() - start;
      return this._parseTestResults(output, language, duration);
    } catch (err) {
      const duration = Date.now() - start;
      const output = (err.stdout || '') + (err.stderr || '');
      return this._parseTestResults(output, language, duration);
    }
  }

  /**
   * Collect coverage reports.
   *
   * @param {object} testFiles
   * @param {string} language
   * @returns {Promise<{line: number, branch: number, method: number, report?: string}>}
   */
  async collectCoverage(testFiles, language) {
    const { aggregateJaCoCo, aggregateIstanbul } = require('./coverage-aggregator.js');

    if (language === 'java') {
      // JaCoCo XML report
      const reportPath = path.join(this.pkgRoot, 'target', 'site', 'jacoco', 'jacoco.xml');
      return aggregateJaCoCo([reportPath]);
    }

    // Istanbul JSON
    const reportPath = path.join(this.pkgRoot, 'coverage', 'coverage-final.json');
    return aggregateIstanbul([reportPath]);
  }

  // ── Internal Helpers ───────────────────────────────────────────────────

  _exec(cmd, cwd) {
    try {
      return execSync(cmd, {
        cwd,
        timeout: this.timeout,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      const e = new Error(err.message);
      e.stdout = err.stdout || '';
      e.stderr = err.stderr || '';
      throw e;
    }
  }

  _parseFailedFiles(output, language) {
    const failed = [];
    if (!output) return failed;

    if (language === 'java') {
      // Parse Maven compile errors: [ERROR] /path/to/File.java:[line,col]
      const matches = output.match(/\[ERROR\]\s+([^\s:]+\.java)/g) || [];
      for (const m of matches) {
        const file = m.replace('[ERROR]', '').trim();
        if (!failed.includes(file)) failed.push(file);
      }
    } else {
      // Parse tsc errors: path/to/file.ts(line,col)
      const matches = output.match(/([^\s(]+\.tsx?)\(/g) || [];
      for (const m of matches) {
        const file = m.replace('(', '').trim();
        if (!failed.includes(file)) failed.push(file);
      }
    }

    return failed;
  }

  _parseTestResults(output, language, duration) {
    const result = { passed: 0, failed: 0, skipped: 0, duration };

    if (!output) return result;

    if (language === 'java') {
      // Maven Surefire: Tests run: X, Failures: Y, Errors: Z, Skipped: W
      const match = output.match(/Tests run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+),\s*Skipped:\s*(\d+)/);
      if (match) {
        const total = parseInt(match[1]);
        const failures = parseInt(match[2]) + parseInt(match[3]);
        result.passed = total - failures - parseInt(match[4]);
        result.failed = failures;
        result.skipped = parseInt(match[4]);
      }
    } else {
      // Vitest JSON: try parsing
      try {
        const json = JSON.parse(output);
        if (json.numPassedTests !== undefined) {
          result.passed = json.numPassedTests;
          result.failed = json.numFailedTests || 0;
          result.skipped = json.numPendingTests || 0;
        }
      } catch {
        // Fallback: regex
        const passMatch = output.match(/(\d+)\s+pass/i);
        const failMatch = output.match(/(\d+)\s+fail/i);
        if (passMatch) result.passed = parseInt(passMatch[1]);
        if (failMatch) result.failed = parseInt(failMatch[1]);
      }
    }

    return result;
  }

  _calculateQualityScore(compileResult, runResult, coverageResult, totalFiles) {
    let score = 0;

    // Compile success: 30%
    const compileRate = totalFiles > 0
      ? (totalFiles - (compileResult.failedFiles || []).length) / totalFiles
      : 1;
    score += compileRate * 30;

    // Test pass rate: 40%
    const totalTests = runResult.passed + runResult.failed;
    const passRate = totalTests > 0 ? runResult.passed / totalTests : 0;
    score += passRate * 40;

    // Coverage: 30%
    const avgCoverage = (
      (coverageResult.line || 0) +
      (coverageResult.branch || 0) +
      (coverageResult.method || 0)
    ) / 3;
    score += (avgCoverage / 100) * 30;

    return Math.round(score);
  }
}

module.exports = { TestValidator };
