'use strict';

/**
 * command-router.js — Parse, validate, and dispatch ETF commands.
 *
 * Layer: L2 MICRO-CMD
 *
 * Routes: /test scan|generate|validate, /reverse-dd extract
 * Validates state transitions before dispatching.
 * Integrates with bootstrapper for gap detection.
 */

const fs = require('fs');
const path = require('path');

const VALID_TEST_SUBS = ['scan', 'generate', 'validate'];
const VALID_REVERSE_DD_SUBS = ['extract'];

/**
 * Route a parsed command to the appropriate pipeline action.
 *
 * @param {object} parsedArgs - { command, sub, flags }
 * @returns {Promise<{ok: boolean, report?: object, outputPath?: string, error?: string}>}
 */
async function routeCommand(parsedArgs) {
  const { command, sub, flags } = parsedArgs;

  // Validate command
  if (command === 'test') {
    return _routeTestCommand(sub, flags);
  } else if (command === 'reverse-dd') {
    return _routeReverseDDCommand(sub, flags);
  }

  return { ok: false, error: 'Unknown command: ' + command };
}

/**
 * Resolve module ID to paths using project-config.json.
 *
 * @param {string} moduleName - Module identifier
 * @param {string} [configPath] - Path to project-config.json
 * @returns {object|null} Module registry entry
 */
function resolveModule(moduleName, configPath) {
  const pkgRoot = configPath ? path.dirname(path.dirname(configPath)) : process.cwd();
  const config = _loadConfig(pkgRoot);
  if (!config || !config.sourcePaths) return null;

  return {
    moduleId: moduleName,
    pkgRoot,
    sourcePaths: config.sourcePaths,
    cacheDir: path.join(pkgRoot, '.claude', 'cache', 'etf', moduleName),
  };
}

/**
 * Validate if a state transition is allowed.
 *
 * @param {string} command
 * @param {string} sub
 * @param {string} currentState - Current test pipeline state
 * @returns {{allowed: boolean, error?: string}}
 */
function validateStateTransition(command, sub, currentState) {
  if (command === 'reverse-dd') {
    return { allowed: true }; // Independent track
  }

  if (command !== 'test') {
    return { allowed: false, error: 'Unknown command: ' + command };
  }

  // scan: always allowed
  if (sub === 'scan') return { allowed: true };

  // generate: requires scan_complete
  if (sub === 'generate') {
    if (!currentState || currentState === 'none') {
      return { allowed: false, error: 'Run /test scan first. Current state: ' + (currentState || 'none') };
    }
    return { allowed: true };
  }

  // validate: requires generate_complete
  if (sub === 'validate') {
    if (!currentState || !['generate_complete', 'validate_complete'].includes(currentState)) {
      return { allowed: false, error: 'Run /test generate first. Current state: ' + (currentState || 'none') };
    }
    return { allowed: true };
  }

  return { allowed: false, error: 'Unknown sub-command: ' + sub };
}

/**
 * List all registered modules from project-config.json.
 *
 * @returns {string[]} Module names
 */
function listAvailableModules() {
  const config = _loadConfig(process.cwd());
  if (!config || !config.modules) return [];
  return Object.keys(config.modules);
}

// ── Internal Route Handlers ──────────────────────────────────────────────────

async function _routeTestCommand(sub, flags) {
  // Validate sub-command
  if (!VALID_TEST_SUBS.includes(sub)) {
    return { ok: false, error: 'Invalid sub-command: ' + sub + '. Valid: ' + VALID_TEST_SUBS.join(', ') };
  }

  // Validate --module
  const moduleId = flags.module;
  if (!moduleId && !flags.all) {
    return { ok: false, error: '--module is required unless --all is specified' };
  }

  // Resolve module
  const moduleContext = resolveModule(moduleId);

  // Check state transition
  const stateManager = _getStateManager();
  const currentState = stateManager ? stateManager.getModuleState(moduleId) : null;
  const stateStr = currentState ? currentState.stage : 'none';
  const transition = validateStateTransition('test', sub, stateStr);

  if (!transition.allowed) {
    return { ok: false, error: transition.error };
  }

  // Check bootstrapper
  const bootstrapper = _getBootstrapper();
  if (bootstrapper && moduleContext) {
    const check = bootstrapper.checkBootstrapNeeded(moduleContext);
    if (check.needed && !check.ready) {
      return {
        ok: false,
        error: 'Test infrastructure not ready. Run bootstrapper first.',
        needsBootstrap: true,
      };
    }
  }

  // Detect mode (DD_FIRST vs CODE_FIRST) and collect DD metadata
  const pkgRoot = moduleContext ? moduleContext.pkgRoot : process.cwd();
  const { ModeDetector } = require('./mode-detector.js');
  const detector = new ModeDetector(pkgRoot);
  let modeResult;
  try {
    modeResult = await detector.detect(moduleId);
  } catch {
    modeResult = { mode: 'CODE_FIRST', sourcePaths: [] };
  }

  // Dispatch to pipeline
  try {
    let result;

    if (sub === 'scan') {
      const { AnalysisPipeline } = require('./analysis-pipeline.js');
      const pipeline = new AnalysisPipeline(moduleId, {
        pkgRoot,
        cacheDir: moduleContext ? moduleContext.cacheDir : undefined,
        ddMetadata: modeResult.ddMetadata || null,
        dbDesignMetadata: modeResult.dbDesignMetadata || null,
        ragEnabled: true,
      });
      result = await pipeline.analyze();

      if (stateManager) stateManager.updateState(moduleId, { stage: 'scan_complete' });
    } else if (sub === 'generate') {
      const { PipelineExecutor } = require('./pipeline-executor.js');
      const executor = new PipelineExecutor(moduleId, {
        pkgRoot: moduleContext ? moduleContext.pkgRoot : process.cwd(),
        cacheDir: moduleContext ? moduleContext.cacheDir : undefined,
        skipValidation: flags.skipValidation || false,
        planOnly: flags.planOnly || false,
      });
      result = await executor.execute();

      if (stateManager) stateManager.updateState(moduleId, { stage: 'generate_complete' });
    } else if (sub === 'validate') {
      const { PipelineExecutor } = require('./pipeline-executor.js');
      const executor = new PipelineExecutor(moduleId, {
        pkgRoot: moduleContext ? moduleContext.pkgRoot : process.cwd(),
        cacheDir: moduleContext ? moduleContext.cacheDir : undefined,
        fromPlan: true,
      });
      result = await executor.resumeFrom('validate');

      if (stateManager) stateManager.updateState(moduleId, { stage: 'validate_complete' });
    }

    // Generate report
    const reportGen = _getReportGenerator();
    const report = reportGen ? reportGen.generateReport('test', sub, moduleContext, result) : null;

    return { ok: true, report, result, outputPath: moduleContext ? moduleContext.cacheDir : null };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function _routeReverseDDCommand(sub, flags) {
  if (!VALID_REVERSE_DD_SUBS.includes(sub)) {
    return { ok: false, error: 'Invalid sub-command: ' + sub };
  }

  const moduleId = flags.module;
  if (!moduleId) {
    return { ok: false, error: '--module is required for /reverse-dd' };
  }

  try {
    const moduleContext = resolveModule(moduleId);
    const pkgRoot = moduleContext ? moduleContext.pkgRoot : process.cwd();

    // Run analysis pipeline first
    const { AnalysisPipeline } = require('./analysis-pipeline.js');
    const pipeline = new AnalysisPipeline(moduleId, { pkgRoot });
    const scanResult = await pipeline.analyze();

    // Generate reverse DD
    const { ReverseDDGenerator } = require('./reverse-dd-generator.js');
    const generator = new ReverseDDGenerator(pkgRoot);
    const reverseDDResult = await generator.generate(scanResult);

    // Write output
    const outputDir = flags.outputDir || path.join(pkgRoot, 'documents', 'features');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, moduleId + '-reverse-dd.md');
    fs.writeFileSync(outputPath, reverseDDResult.markdown || JSON.stringify(reverseDDResult, null, 2));

    // Update state
    const stateManager = _getStateManager();
    if (stateManager) stateManager.updateState(moduleId, { stage: 'reverse_dd_complete' });

    return { ok: true, result: reverseDDResult, outputPath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Lazy Dependency Loading ──────────────────────────────────────────────────

function _loadConfig(pkgRoot) {
  const paths = [
    path.join(pkgRoot, '.claude', 'config', 'project-config.json'),
    path.join(pkgRoot, 'project-config.json'),
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const config = JSON.parse(fs.readFileSync(p, 'utf8'));
        // Normalize: convert sourceRoots[] to sourcePaths{} if needed
        if (!config.sourcePaths && Array.isArray(config.sourceRoots)) {
          config.sourcePaths = _sourceRootsToSourcePaths(config.sourceRoots);
        }
        return config;
      } catch { continue; }
    }
  }

  return null;
}

function _sourceRootsToSourcePaths(sourceRoots) {
  const result = { backend: [], frontend: [] };
  for (const root of sourceRoots) {
    const type = (root.type || '').toLowerCase();
    if (type === 'backend') {
      result.backend.push(root.path);
    } else if (type === 'frontend') {
      result.frontend.push(root.path);
    }
  }
  return result;
}

function _getStateManager() {
  try {
    return require('./test-state-manager.js');
  } catch {
    return null;
  }
}

function _getBootstrapper() {
  try {
    return require('./bootstrapper.js');
  } catch {
    return null;
  }
}

function _getReportGenerator() {
  try {
    return require('./report-generator.js');
  } catch {
    return null;
  }
}

module.exports = { routeCommand, resolveModule, validateStateTransition, listAvailableModules };
