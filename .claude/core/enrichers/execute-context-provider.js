"use strict";

/**
 * Execute Context Provider for /execute Command (L2.5)
 *
 * Real-time pattern injection with error context and progress tracking.
 * DD Reference: §5.4, §3.10.2 (IExecuteContextProvider)
 *
 * Features:
 * - L2.5.1: Real-time context refresh
 * - L2.5.2: Pattern injection
 * - L2.5.3: Error-aware context
 * - L2.5.4: Progress tracking
 *
 * @module execute-context-provider
 */

const GlobalGraphService = require('../rag/global-graph-service');

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

/**
 * Enricher configuration.
 * DD Reference: §5.4.2
 */
const CONFIG = {
  layer: "code",
  maxResultsPerStep: 3,
  patternDepth: 2, // §5.4.3 - Execute needs code patterns
  jitRefreshMs: 5000, // Refresh context every 5s
  minConfidence: 0.5,
};

/**
 * Staleness levels.
 */
const StalenessLevel = {
  FRESH: "fresh",
  SLIGHTLY_STALE: "slightly_stale",
  STALE: "stale",
  VERY_STALE: "very_stale",
};

/**
 * Progress status.
 * DD Reference: §3.10.2 (ProgressStatus)
 */
const ProgressStatus = {
  STARTED: "started",
  COMPLETED: "completed",
  FAILED: "failed",
  SKIPPED: "skipped",
};

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

/**
 * @typedef {object} Pattern
 * @property {string} id - Pattern ID
 * @property {string} name - Pattern name
 * @property {string} type - Pattern type
 * @property {number} confidence - Confidence
 * @property {string} source - Source file
 * @property {string} [snippet] - Code snippet
 */

/**
 * @typedef {object} SuggestedFix
 * @property {string} description - Fix description
 * @property {number} confidence - Confidence
 * @property {string} source - Source feature
 * @property {string} [codeSnippet] - Code snippet
 */

/**
 * @typedef {object} RollbackInfo
 * @property {string} checkpointId - Checkpoint ID
 * @property {string[]} affectedFiles - Files to rollback
 * @property {string} command - Rollback command
 */

/**
 * @typedef {object} ErrorContext
 * @property {Pattern[]} relatedPatterns - Patterns for error type
 * @property {SuggestedFix[]} suggestedFixes - From similar past errors
 * @property {string[]} affectedNodes - Graph nodes related to error
 * @property {RollbackInfo} rollbackInfo - Rollback information
 */

/**
 * @typedef {object} StepResult
 * @property {string} stepId - Step ID
 * @property {string} status - ProgressStatus
 * @property {number} duration - Duration in ms
 * @property {any} [output] - Output
 * @property {Error} [error] - Error if failed
 */

/**
 * @typedef {object} ExecutionProgress
 * @property {number} currentStep - Current step number
 * @property {number} totalSteps - Total steps
 * @property {StepResult[]} completedSteps - Completed steps
 * @property {string} status - running/paused/completed/failed
 * @property {string} startTime - ISO timestamp
 * @property {string} estimatedCompletion - ISO timestamp
 */

/**
 * @typedef {object} ExecutionStep
 * @property {string} id - Step ID
 * @property {string} title - Step title
 * @property {string[]} files - Files to modify
 * @property {string} [currentFile] - Current file being modified
 */

/**
 * @typedef {object} ExecuteContext
 * @property {Pattern[]} patterns - Matched patterns
 * @property {number} confidence - Confidence score
 * @property {string} freshness - StalenessLevel
 * @property {ErrorContext} [errorContext] - Error context if error occurred
 */

// ─────────────────────────────────────────────────────────────────
// Execute Context Provider
// ─────────────────────────────────────────────────────────────────

/**
 * Context provider for /execute command.
 * Implements IExecuteContextProvider interface.
 */
class ExecuteContextProvider {
  /**
   * Create an ExecuteContextProvider.
   *
   * @param {object} [options] - Options
   */
  constructor(options = {}) {
    this._graphService =
      options.graphService || GlobalGraphService.getInstance();
    this._config = { ...CONFIG, ...options.config };
    this._progress = null;
    this._contextCache = new Map();
    this._lastRefresh = new Map();
  }

  /**
   * Get context for an execution step.
   * DD Reference: §5.4.1, L2.5.1-L2.5.2
   *
   * @param {ExecutionStep} step - Execution step
   * @param {object} [options] - Options
   * @returns {Promise<ExecuteContext>}
   */
  async getContext(step, options = {}) {
    const cacheKey = step.id;
    const now = Date.now();

    // Check cache freshness (JIT refresh)
    const lastRefresh = this._lastRefresh.get(cacheKey) || 0;
    if (
      now - lastRefresh < this._config.jitRefreshMs &&
      this._contextCache.has(cacheKey)
    ) {
      const cached = this._contextCache.get(cacheKey);
      cached.freshness = StalenessLevel.FRESH;
      return cached;
    }

    const context = {
      patterns: [],
      confidence: 0,
      freshness: StalenessLevel.FRESH,
      errorContext: null,
    };

    try {
      // Query patterns for current step
      context.patterns = await this._queryPatterns(step, options);

      // Calculate confidence
      context.confidence = this._calculateConfidence(step, context.patterns);

      // Check freshness from staleness hook
      context.freshness = await this._checkFreshness(step);

      // Cache context
      this._contextCache.set(cacheKey, context);
      this._lastRefresh.set(cacheKey, now);
    } catch (err) {
      console.warn(
        `[ExecuteContextProvider] Context fetch failed for ${step.id}: ${err.message}`,
      );
      context.confidence = 50;
    }

    return context;
  }

  /**
   * Query patterns for step.
   * DD Reference: L2.5.2
   *
   * @param {ExecutionStep} step - Step
   * @param {object} [options] - Options
   * @returns {Promise<Pattern[]>}
   * @private
   */
  async _queryPatterns(step, options = {}) {
    const patterns = [];

    try {
      // Query based on step content
      const queryText = `${step.title} ${(step.files || []).join(" ")} ${step.currentFile || ""}`;

      const result = await this._graphService.query(queryText, {
        layer: this._config.layer,
        limit: this._config.maxResultsPerStep,
        depth: this._config.patternDepth,
      });

      if (result && result.nodes) {
        for (const node of result.nodes) {
          patterns.push({
            id: node.id,
            name: node.name || node.id,
            type: node.type || "code_pattern",
            confidence: node.score || 0.5,
            source:
              node.attributes?.sourceFile || node.attributes?.source || "",
            snippet: node.attributes?.snippet || undefined,
          });
        }
      }
    } catch (err) {
      console.warn(
        `[ExecuteContextProvider] Pattern query failed: ${err.message}`,
      );
    }

    return patterns;
  }

  /**
   * Calculate confidence.
   * @private
   */
  _calculateConfidence(step, patterns) {
    if (patterns.length === 0) return 50;

    const avgPatternConfidence =
      patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;

    return Math.min(Math.round(50 + avgPatternConfidence * 50), 100);
  }

  /**
   * Check freshness.
   * @private
   */
  async _checkFreshness(step) {
    // Staleness managed server-side (Decision D5)
    return StalenessLevel.FRESH;
  }

  /**
   * Get error-aware context.
   * DD Reference: L2.5.3
   *
   * @param {Error} error - The error that occurred
   * @param {ExecutionStep} step - Current step
   * @returns {Promise<ErrorContext>}
   */
  async getErrorContext(error, step) {
    const errorContext = {
      relatedPatterns: [],
      suggestedFixes: [],
      affectedNodes: [],
      rollbackInfo: {
        checkpointId: `checkpoint-${step.id}`,
        affectedFiles: step.files || [],
        command: `git checkout -- ${(step.files || []).join(" ")}`,
      },
    };

    try {
      // Query patterns related to error type
      const errorType = error.name || "Error";
      const errorMessage = error.message || "";

      const result = await this._graphService.query(
        `${errorType} ${errorMessage} fix solution`,
        {
          layer: "code",
          limit: 5,
        },
      );

      if (result && result.nodes) {
        for (const node of result.nodes) {
          // Add as related pattern
          errorContext.relatedPatterns.push({
            id: node.id,
            name: node.name || node.id,
            type: "error_pattern",
            confidence: node.score || 0.5,
            source: node.attributes?.source || "",
            snippet: node.attributes?.snippet || undefined,
          });

          // Extract suggested fixes
          if (node.attributes?.fix || node.attributes?.solution) {
            errorContext.suggestedFixes.push({
              description: node.attributes.fix || node.attributes.solution,
              confidence: node.score || 0.5,
              source: node.attributes?.source || "unknown",
              codeSnippet: node.attributes?.snippet || undefined,
            });
          }

          // Track affected nodes
          if (node.id) {
            errorContext.affectedNodes.push(node.id);
          }
        }
      }
    } catch (err) {
      console.warn(
        `[ExecuteContextProvider] Error context query failed: ${err.message}`,
      );
    }

    return errorContext;
  }

  /**
   * Track progress of execution.
   * DD Reference: L2.5.4
   *
   * @param {ExecutionStep} step - Step
   * @param {object} status - Status info
   */
  async trackProgress(step, status) {
    if (!this._progress) {
      this._progress = {
        currentStep: 0,
        totalSteps: 0,
        completedSteps: [],
        status: "running",
        startTime: new Date().toISOString(),
        estimatedCompletion: "",
      };
    }

    const stepResult = {
      stepId: step.id,
      status: status.status,
      duration: status.duration || 0,
      output: status.output || undefined,
      error: status.error || undefined,
    };

    this._progress.completedSteps.push(stepResult);
    this._progress.currentStep = this._progress.completedSteps.length;

    // Update overall status
    if (status.status === ProgressStatus.FAILED) {
      this._progress.status = "failed";
    } else if (
      this._progress.currentStep >= this._progress.totalSteps &&
      this._progress.totalSteps > 0
    ) {
      this._progress.status = "completed";
    }

    // Estimate completion
    if (
      this._progress.completedSteps.length > 0 &&
      this._progress.totalSteps > 0
    ) {
      const avgDuration =
        this._progress.completedSteps.reduce(
          (sum, s) => sum + (s.duration || 0),
          0,
        ) / this._progress.completedSteps.length;
      const remainingSteps =
        this._progress.totalSteps - this._progress.currentStep;
      const estimatedMs = avgDuration * remainingSteps;
      this._progress.estimatedCompletion = new Date(
        Date.now() + estimatedMs,
      ).toISOString();
    }
  }

  /**
   * Get current progress.
   * DD Reference: L2.5.4
   *
   * @returns {Promise<ExecutionProgress>}
   */
  async getProgress() {
    if (!this._progress) {
      return {
        currentStep: 0,
        totalSteps: 0,
        completedSteps: [],
        status: "running",
        startTime: new Date().toISOString(),
        estimatedCompletion: "",
      };
    }
    return this._progress;
  }

  /**
   * Initialize progress tracking.
   *
   * @param {number} totalSteps - Total steps in plan
   */
  initProgress(totalSteps) {
    this._progress = {
      currentStep: 0,
      totalSteps,
      completedSteps: [],
      status: "running",
      startTime: new Date().toISOString(),
      estimatedCompletion: "",
    };
  }

  /**
   * Clear context cache.
   */
  clearCache() {
    this._contextCache.clear();
    this._lastRefresh.clear();
  }

  /**
   * Format execute context for display.
   *
   * @param {ExecuteContext} context - Context
   * @param {ExecutionStep} step - Step
   * @returns {string}
   */
  static formatContext(context, step) {
    const lines = [];

    lines.push(`=== EXECUTE CONTEXT: ${step.title} ===`);
    lines.push(`Confidence: ${context.confidence}%`);
    lines.push(`Freshness: ${context.freshness}`);
    lines.push("");

    if (context.patterns.length > 0) {
      lines.push("📋 CODE PATTERNS:");
      for (const p of context.patterns) {
        lines.push(`  • ${p.name} (${(p.confidence * 100).toFixed(0)}%)`);
        if (p.source) {
          lines.push(`    Source: ${p.source}`);
        }
        if (p.snippet) {
          lines.push(`    ${p.snippet.substring(0, 80)}...`);
        }
      }
      lines.push("");
    }

    if (context.errorContext) {
      lines.push("❌ ERROR CONTEXT:");
      if (context.errorContext.suggestedFixes.length > 0) {
        lines.push("  Suggested fixes:");
        for (const fix of context.errorContext.suggestedFixes.slice(0, 3)) {
          lines.push(
            `    • ${fix.description} (${(fix.confidence * 100).toFixed(0)}%)`,
          );
        }
      }
      if (context.errorContext.rollbackInfo) {
        lines.push(`  Rollback: ${context.errorContext.rollbackInfo.command}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Format progress for display.
   *
   * @param {ExecutionProgress} progress - Progress
   * @returns {string}
   */
  static formatProgress(progress) {
    const lines = [];

    const pct =
      progress.totalSteps > 0
        ? Math.round((progress.currentStep / progress.totalSteps) * 100)
        : 0;
    const statusEmoji =
      progress.status === "completed"
        ? "✅"
        : progress.status === "failed"
          ? "❌"
          : progress.status === "paused"
            ? "⏸️"
            : "🔄";

    lines.push(`${statusEmoji} Execution ${progress.status.toUpperCase()}`);
    lines.push(
      `Progress: ${progress.currentStep}/${progress.totalSteps} (${pct}%)`,
    );
    lines.push(`Started: ${progress.startTime}`);

    if (progress.estimatedCompletion) {
      lines.push(`ETA: ${progress.estimatedCompletion}`);
    }

    const failures = progress.completedSteps.filter(
      (s) => s.status === ProgressStatus.FAILED,
    );
    if (failures.length > 0) {
      lines.push(`Failures: ${failures.length}`);
    }

    return lines.join("\n");
  }
}

// ─────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────

module.exports = {
  ExecuteContextProvider,
  StalenessLevel,
  ProgressStatus,
  CONFIG,
};
