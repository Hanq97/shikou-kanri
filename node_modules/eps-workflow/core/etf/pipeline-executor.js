'use strict';

/**
 * pipeline-executor.js — 3-stage test generation pipeline orchestrator.
 *
 * Layer: L2 MICRO-CMD
 * Pattern: Chain-of-Responsibility [BD Pattern 1, D1]
 *
 * Stages: PLAN → GENERATE → VALIDATE
 * Pre-check: scan-result.json must exist (from SP-2 ETF-INTL)
 * Write-on-Complete per stage (D17)
 */

const fs = require('fs');
const path = require('path');

const STAGES = ['plan', 'generate', 'validate'];

class PipelineExecutor {
  /**
   * @param {string} moduleId - Module identifier
   * @param {object} [options]
   * @param {string} [options.pkgRoot] - Package root directory
   * @param {boolean} [options.scanOnly] - Only run scan (not test pipeline)
   * @param {boolean} [options.planOnly] - Stop after plan stage
   * @param {boolean} [options.skipValidation] - Skip validation stage
   * @param {boolean} [options.fromPlan] - Resume from existing plan (skip plan stage)
   * @param {string} [options.cacheDir] - Cache directory path
   */
  constructor(moduleId, options) {
    options = options || {};
    this.moduleId = moduleId;
    this.pkgRoot = options.pkgRoot || process.cwd();
    this.scanOnly = options.scanOnly || false;
    this.planOnly = options.planOnly || false;
    this.skipValidation = options.skipValidation || false;
    this.fromPlan = options.fromPlan || false;
    this.cacheDir = options.cacheDir || path.join(this.pkgRoot, '.claude', 'cache', 'etf', moduleId);

    this._planGenerator = null;
    this._codeGenerator = null;
    this._validator = null;
  }

  /**
   * Execute the full 3-stage pipeline.
   *
   * @returns {Promise<{testPlan: object, testFiles: object, validationReport: object}>}
   */
  async execute() {
    // Pre-check: scan-result.json must exist
    const scanResultPath = path.join(this.cacheDir, 'scan-result.json');
    if (!fs.existsSync(scanResultPath)) {
      throw new Error(
        'scan-result.json not found at ' + scanResultPath +
        '. Run analysis pipeline first (SP-2 ETF-INTL).'
      );
    }

    const scanResult = JSON.parse(fs.readFileSync(scanResultPath, 'utf8'));

    // Determine start stage
    let startStage = 'plan';
    if (this.fromPlan) startStage = 'generate';

    return this.resumeFrom(startStage, scanResult);
  }

  /**
   * Resume pipeline from a specific stage.
   *
   * @param {string} stage - Stage to resume from: "plan" | "generate" | "validate"
   * @param {object} [scanResult] - Scan result (loaded from cache if not provided)
   * @returns {Promise<object>}
   */
  async resumeFrom(stage, scanResult) {
    const startIdx = STAGES.indexOf(stage);
    if (startIdx === -1) {
      throw new Error('Unknown stage: ' + stage + '. Valid: ' + STAGES.join(', '));
    }

    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    // Load scan result if not provided
    if (!scanResult) {
      const scanPath = path.join(this.cacheDir, 'scan-result.json');
      if (fs.existsSync(scanPath)) {
        scanResult = JSON.parse(fs.readFileSync(scanPath, 'utf8'));
      }
    }

    // Load previous stage outputs for resume
    const state = this._loadPreviousOutputs(startIdx);

    // Module context for downstream stages
    const moduleContext = {
      moduleId: this.moduleId,
      pkgRoot: this.pkgRoot,
      cacheDir: this.cacheDir,
      scanResult,
    };

    // Execute stages sequentially
    for (let i = startIdx; i < STAGES.length; i++) {
      const stageName = STAGES[i];

      // Skip plan stage if fromPlan
      if (stageName === 'plan' && this.fromPlan) continue;

      // Stop after plan if planOnly
      if (stageName === 'generate' && this.planOnly) break;

      // Skip validation if skipValidation
      if (stageName === 'validate' && this.skipValidation) break;

      // Gate check before generate: must have test cases
      if (stageName === 'generate' && state.testPlan) {
        this._gateCheckPlan(state.testPlan);
      }

      try {
        const stageResult = await this._executeStage(stageName, state, moduleContext);
        Object.assign(state, stageResult);

        // Write-on-Complete (D17)
        this._writeStageOutput(stageName, stageResult);
      } catch (err) {
        this._writeStageOutput(stageName + '_error', { error: err.message });
        throw new Error('Pipeline failed at stage "' + stageName + '": ' + err.message);
      }
    }

    return state;
  }

  // ── Stage Implementations ──────────────────────────────────────────────

  async _executeStage(stage, state, moduleContext) {
    switch (stage) {
      case 'plan':
        return this._stagePlan(moduleContext);
      case 'generate':
        return this._stageGenerate(state.testPlan, moduleContext);
      case 'validate':
        return this._stageValidate(state.testFiles, moduleContext);
      default:
        throw new Error('Unimplemented stage: ' + stage);
    }
  }

  async _stagePlan(moduleContext) {
    const generator = this._getPlanGenerator();
    const testPlan = await generator.generate(moduleContext.scanResult, moduleContext);
    return { testPlan };
  }

  async _stageGenerate(testPlan, moduleContext) {
    if (!testPlan) {
      // Try loading from cache
      const planPath = path.join(this.cacheDir, 'test-plan.json');
      if (fs.existsSync(planPath)) {
        testPlan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      } else {
        throw new Error('No test plan available. Run plan stage first.');
      }
    }

    const generator = this._getCodeGenerator();
    const testFiles = await generator.generate(testPlan, moduleContext.scanResult, moduleContext);
    return { testFiles };
  }

  async _stageValidate(testFiles, moduleContext) {
    if (!testFiles) {
      const filesPath = path.join(this.cacheDir, 'test-files.json');
      if (fs.existsSync(filesPath)) {
        testFiles = JSON.parse(fs.readFileSync(filesPath, 'utf8'));
      } else {
        throw new Error('No test files available. Run generate stage first.');
      }
    }

    const validator = this._getValidator();
    const validationReport = await validator.validate(testFiles, moduleContext);
    return { validationReport };
  }

  // ── Gate Checks ────────────────────────────────────────────────────────

  _gateCheckPlan(testPlan) {
    if (!testPlan || !testPlan.testCases || testPlan.testCases.length === 0) {
      throw new Error('Gate check failed: test plan has no test cases');
    }

    // Check abnormal ratio (BR-TPIP-006: >= 40%)
    const stats = testPlan.stats;
    if (stats && stats.abnormalRatio < 0.40) {
      // Warning only — don't block (can be improved by Gemini supplement)
      this._writeStageOutput('gate_warning', {
        warning: 'Abnormal ratio ' + stats.abnormalRatio + ' is below 40% threshold',
      });
    }
  }

  // ── Cache I/O ──────────────────────────────────────────────────────────

  _loadPreviousOutputs(startIdx) {
    const state = {};
    const stageFiles = {
      plan: 'test-plan.json',
      generate: 'test-files.json',
      validate: 'validation-report.json',
    };

    for (let i = 0; i < startIdx; i++) {
      const stageName = STAGES[i];
      const fileName = stageFiles[stageName];
      if (fileName) {
        const filePath = path.join(this.cacheDir, fileName);
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (stageName === 'plan') state.testPlan = data;
          else if (stageName === 'generate') state.testFiles = data;
          else if (stageName === 'validate') state.validationReport = data;
        }
      }
    }

    return state;
  }

  _writeStageOutput(stageName, data) {
    const stageFiles = {
      plan: 'test-plan.json',
      generate: 'test-files.json',
      validate: 'validation-report.json',
    };
    const stageKeys = {
      plan: 'testPlan',
      generate: 'testFiles',
      validate: 'validationReport',
    };

    const fileName = stageFiles[stageName] || (stageName + '.json');
    const filePath = path.join(this.cacheDir, fileName);

    // Write just the value (not the wrapper) for known stages
    const key = stageKeys[stageName];
    const writeData = key && data[key] ? data[key] : data;
    fs.writeFileSync(filePath, JSON.stringify(writeData, null, 2));
  }

  // ── Lazy Dependency Loading ────────────────────────────────────────────

  _getPlanGenerator() {
    if (!this._planGenerator) {
      const { TestPlanGenerator } = require('./test-plan-generator.js');
      this._planGenerator = new TestPlanGenerator(this.pkgRoot);
    }
    return this._planGenerator;
  }

  _getCodeGenerator() {
    if (!this._codeGenerator) {
      const { TestCodeGenerator } = require('./test-code-generator.js');
      this._codeGenerator = new TestCodeGenerator(this.pkgRoot);
    }
    return this._codeGenerator;
  }

  _getValidator() {
    if (!this._validator) {
      const { TestValidator } = require('./test-validator.js');
      this._validator = new TestValidator(this.pkgRoot);
    }
    return this._validator;
  }
}

module.exports = { PipelineExecutor, STAGES };
