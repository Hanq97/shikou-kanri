/**
 * Parallel Execution Engine
 * 並列実行エンジン
 * Engine Thực Thi Song Song
 *
 * Purpose: Execute plan steps with safe parallelization while respecting dependencies
 * Version: 1.0.0
 * Date: 2025-12-23
 */

const { DependencyGraph } = require('./dependency-graph.js');

/**
 * ParallelExecutor class
 * Executes plan steps in parallel while maintaining safety constraints
 */
class ParallelExecutor {
  constructor(plan, options = {}) {
    this.plan = plan;
    this.options = {
      maxConcurrency: options.maxConcurrency || 4,
      timeoutMs: options.timeoutMs || 300000, // 5 minutes default
      onProgress: options.onProgress || null,
      onStepStart: options.onStepStart || null,
      onStepComplete: options.onStepComplete || null,
      onStepError: options.onStepError || null,
      fallbackToSequential: options.fallbackToSequential !== false,
      validateBeforeExecution: options.validateBeforeExecution !== false
    };

    this.graph = new DependencyGraph(plan);
    this.results = new Map(); // stepId → result
    this.inProgress = new Set(); // Currently executing steps
    this.completed = new Set(); // Successfully completed steps
    this.failed = new Set(); // Failed steps
    this.startTime = null;
    this.endTime = null;
    this.executionLog = []; // Audit trail
    this.fileLocks = new Map(); // file → stepId (virtual file locks)
    this.completedSteps = []; // Ordered list for rollback
  }

  /**
   * Execute plan with parallelization
   * @returns {Promise<Object>} Execution results
   */
  async execute() {
    this.startTime = Date.now();
    this.log('info', 'Execution started', { plan: this.plan.id || 'unnamed' });

    try {
      // Step 1: Build dependency graph (skip topological sort for validation)
      this.log('info', 'Building dependency graph');
      let graphData = this.graph.buildGraph({ skipTopologicalSort: this.options.validateBeforeExecution });

      this.log('info', 'Dependency graph built', {
        nodes: graphData.nodes.length
      });

      // Step 2: Validate graph if enabled
      if (this.options.validateBeforeExecution) {
        this.log('info', 'Validating graph');
        const validation = this.graph.validate();

        if (!validation.valid) {
          const errors = validation.issues.filter(i => i.severity === 'error');
          this.log('error', 'Graph validation failed', { errors });

          if (this.options.fallbackToSequential) {
            this.log('warn', 'Falling back to sequential execution');
            return await this.executeSequential();
          } else {
            throw new Error(`Graph validation failed: ${errors.map(e => e.message).join('; ')}`);
          }
        }

        this.log('info', 'Graph validation passed', {
          warnings: validation.issues.filter(i => i.severity === 'warning').length
        });

        // Now perform topological sort after validation passes
        this.graph.topologicalSort();
        this.graph.calculateMetrics();
        graphData = {
          ...graphData,
          levels: this.graph.levels,
          metrics: this.graph.metrics
        };
      }

      this.log('info', 'Execution levels determined', {
        levels: graphData.levels.length,
        metrics: graphData.metrics
      });

      // Step 3: Execute level by level
      this.log('info', 'Starting level-by-level execution', {
        total_levels: graphData.levels.length
      });

      for (let i = 0; i < graphData.levels.length; i++) {
        const level = graphData.levels[i];
        this.log('info', `Executing level ${i + 1}/${graphData.levels.length}`, {
          steps_in_level: level.length
        });

        await this.executeLevel(level, i);

        this.log('info', `Level ${i + 1} completed`, {
          completed: level.length,
          total_completed: this.completed.size,
          total_failed: this.failed.size
        });
      }

      // Step 4: Compile results
      this.endTime = Date.now();
      const executionTime = this.endTime - this.startTime;

      const result = {
        success: this.failed.size === 0,
        total_steps: graphData.nodes.length,
        completed: this.completed.size,
        failed: this.failed.size,
        execution_time_ms: executionTime,
        execution_time_s: (executionTime / 1000).toFixed(2),
        parallelization_metrics: graphData.metrics,
        results: Array.from(this.results.entries()).map(([stepId, result]) => ({
          stepId,
          ...result
        })),
        levels: graphData.levels,
        execution_log: this.executionLog
      };

      this.log('info', 'Execution completed', {
        success: result.success,
        execution_time: result.execution_time_s + 's'
      });

      return result;

    } catch (error) {
      this.endTime = Date.now();
      this.log('error', 'Execution failed', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        completed: this.completed.size,
        failed: this.failed.size,
        execution_time_ms: this.endTime - this.startTime,
        results: Array.from(this.results.values()),
        execution_log: this.executionLog
      };
    }
  }

  /**
   * Execute all steps in a level (parallel execution)
   * @param {Array} stepIds - Step IDs in this level
   * @param {number} levelIndex - Level index
   */
  async executeLevel(stepIds, levelIndex) {
    if (stepIds.length === 0) {
      return;
    }

    // Create batches based on maxConcurrency
    const batches = this.createBatches(stepIds, this.options.maxConcurrency);

    this.log('info', `Level ${levelIndex} split into ${batches.length} batches`, {
      batch_sizes: batches.map(b => b.length)
    });

    // Execute each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      this.log('info', `Executing batch ${batchIndex + 1}/${batches.length}`, {
        steps: batch
      });

      // Execute all steps in batch concurrently
      const promises = batch.map(stepId => this.executeStep(stepId, levelIndex, batchIndex));

      // Wait for all steps in batch to complete
      const batchResults = await Promise.allSettled(promises);

      // Check for failures
      const failures = batchResults.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        this.log('error', `Batch ${batchIndex + 1} had failures`, {
          failures: failures.length
        });

        // If any step fails, stop execution
        throw new Error(`Batch execution failed: ${failures[0].reason}`);
      }
    }
  }

  /**
   * Execute single step
   * @param {string} stepId - Step ID
   * @param {number} levelIndex - Level index
   * @param {number} batchIndex - Batch index
   * @returns {Promise<Object>} Step result
   */
  async executeStep(stepId, levelIndex, batchIndex) {
    const node = this.graph.nodes.get(stepId);

    if (!node) {
      throw new Error(`Step ${stepId} not found in graph`);
    }

    const stepStartTime = Date.now();

    try {
      // Mark as in progress
      this.inProgress.add(stepId);
      this.log('info', `Step started: ${stepId}`, {
        description: node.description,
        level: levelIndex,
        batch: batchIndex
      });

      // Call onStepStart callback
      if (this.options.onStepStart) {
        this.options.onStepStart(stepId, node);
      }

      // Execute step action
      const result = await this.runAction(node);

      // Mark as completed
      const executionTime = Date.now() - stepStartTime;
      this.inProgress.delete(stepId);
      this.completed.add(stepId);

      const stepResult = {
        success: true,
        stepId: stepId,
        description: node.description,
        result: result,
        execution_time_ms: executionTime,
        level: levelIndex,
        batch: batchIndex
      };

      this.results.set(stepId, stepResult);

      this.log('info', `Step completed: ${stepId}`, {
        execution_time_ms: executionTime
      });

      // Call onStepComplete callback
      if (this.options.onStepComplete) {
        this.options.onStepComplete(stepId, node, stepResult);
      }

      // Call onProgress callback
      if (this.options.onProgress) {
        this.options.onProgress(this.getProgress());
      }

      return stepResult;

    } catch (error) {
      // Mark as failed
      const executionTime = Date.now() - stepStartTime;
      this.inProgress.delete(stepId);
      this.failed.add(stepId);

      const stepResult = {
        success: false,
        stepId: stepId,
        description: node.description,
        error: error.message,
        stack: error.stack,
        execution_time_ms: executionTime,
        level: levelIndex,
        batch: batchIndex
      };

      this.results.set(stepId, stepResult);

      this.log('error', `Step failed: ${stepId}`, {
        error: error.message,
        execution_time_ms: executionTime
      });

      // Call onStepError callback
      if (this.options.onStepError) {
        this.options.onStepError(stepId, node, error);
      }

      // Re-throw to stop execution
      throw error;
    }
  }

  /**
   * Run step action (integrates with plan execution logic)
   * @param {Object} node - Step node
   * @returns {Promise<Object>} Action result
   */
  async runAction(node) {
    // TODO: This will integrate with enhanced-plan.js execution logic
    // For now, return a mock result

    // Simulate execution time (remove in production)
    if (process.env.NODE_ENV === 'test') {
      await this.sleep(Math.random() * 100);
    }

    // Return mock result
    return {
      status: 'completed',
      stepId: node.id,
      description: node.description,
      output: {
        files_written: node.writes,
        files_read: node.reads
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute plan sequentially (fallback mode)
   * @returns {Promise<Object>} Execution results
   */
  async executeSequential() {
    this.log('info', 'Starting sequential execution (fallback mode)');

    // Build graph without topological sort (may have cycles - just execute in original order)
    const graphData = this.graph.buildGraph({ skipTopologicalSort: true });
    const allSteps = graphData.nodes.map(n => n.id);

    // Execute steps one by one in original order
    for (let i = 0; i < allSteps.length; i++) {
      const stepId = allSteps[i];

      try {
        await this.executeStep(stepId, 0, 0);
      } catch (error) {
        // Stop on first error
        break;
      }
    }

    this.endTime = Date.now();

    return {
      success: this.failed.size === 0,
      mode: 'sequential',
      total_steps: allSteps.length,
      completed: this.completed.size,
      failed: this.failed.size,
      execution_time_ms: this.endTime - this.startTime,
      results: Array.from(this.results.values()),
      execution_log: this.executionLog
    };
  }

  /**
   * Create batches for concurrency control
   * @param {Array} items - Items to batch
   * @param {number} batchSize - Maximum items per batch
   * @returns {Array} Array of batches
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get current execution progress
   * @returns {Object} Progress information
   */
  getProgress() {
    const total = this.graph.nodes.size;
    const done = this.completed.size + this.failed.size;

    return {
      total: total,
      completed: this.completed.size,
      failed: this.failed.size,
      in_progress: this.inProgress.size,
      pending: total - done - this.inProgress.size,
      percentage: total > 0 ? Math.round((done / total) * 100) : 0,
      current_steps: Array.from(this.inProgress)
    };
  }

  /**
   * Get execution statistics
   * @returns {Object} Execution statistics
   */
  getStats() {
    const now = this.endTime || Date.now();
    const elapsed = now - (this.startTime || now);

    return {
      elapsed_ms: elapsed,
      elapsed_s: (elapsed / 1000).toFixed(2),
      steps_per_second: this.completed.size > 0 ? (this.completed.size / (elapsed / 1000)).toFixed(2) : 0,
      success_rate: this.graph.nodes.size > 0 ? ((this.completed.size / this.graph.nodes.size) * 100).toFixed(1) : 0,
      failure_rate: this.graph.nodes.size > 0 ? ((this.failed.size / this.graph.nodes.size) * 100).toFixed(1) : 0
    };
  }

  /**
   * Log execution event
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      metadata: metadata
    };

    this.executionLog.push(logEntry);

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      const prefix = `[ParallelExecutor ${level.toUpperCase()}]`;
      console.log(prefix, message, metadata);
    }
  }

  /**
   * Acquire file locks for a step
   * Week 3 Day 4: Advanced safety
   * @param {string} stepId - Step ID
   * @returns {Array} Array of locked files
   */
  async acquireFileLocks(stepId) {
    const node = this.graph.nodes.get(stepId);
    if (!node) return [];

    const lockedFiles = [];

    // Lock all files this step will write
    for (const file of node.writes) {
      if (this.fileLocks.has(file)) {
        // File is already locked by another step - should not happen if graph is correct
        const lockHolder = this.fileLocks.get(file);
        this.log('warn', `File lock conflict detected`, {
          file: file,
          stepId: stepId,
          lockHolder: lockHolder
        });
        // Release any locks we already acquired
        await this.releaseFileLocks(lockedFiles);
        throw new Error(`File ${file} is locked by step ${lockHolder}`);
      }

      this.fileLocks.set(file, stepId);
      lockedFiles.push(file);
    }

    return lockedFiles;
  }

  /**
   * Release file locks
   * @param {Array} locks - Array of locked files
   */
  async releaseFileLocks(locks) {
    for (const file of locks) {
      this.fileLocks.delete(file);
    }
  }

  /**
   * Execute step with file locking safety
   * Week 3 Day 4: Enhanced safety with locks
   * @param {string} stepId - Step ID
   * @param {number} levelIndex - Level index
   * @param {number} batchIndex - Batch index
   * @returns {Promise<Object>} Step result
   */
  async executeStepWithSafety(stepId, levelIndex, batchIndex) {
    // Acquire locks before execution
    let locks = [];
    try {
      locks = await this.acquireFileLocks(stepId);
    } catch (error) {
      // Lock acquisition failed - safety violation detected
      this.log('error', `Failed to acquire locks for step ${stepId}`, {
        error: error.message
      });
      throw error;
    }

    try {
      // Execute step with locks held
      const result = await this.executeStep(stepId, levelIndex, batchIndex);

      // Add to completed steps list for potential rollback
      this.completedSteps.push({
        stepId: stepId,
        result: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      // Step execution failed - initiate rollback if enabled
      if (this.options.fallbackToSequential) {
        this.log('warn', `Step ${stepId} failed, initiating rollback`, {
          error: error.message
        });
        await this.handleStepFailure(stepId, error);
      }
      throw error;
    } finally {
      // Always release locks
      await this.releaseFileLocks(locks);
    }
  }

  /**
   * Handle step failure with rollback
   * Week 3 Day 4: Rollback mechanism
   * @param {string} failedStepId - Failed step ID
   * @param {Error} error - Error that caused failure
   * @returns {Promise<void>}
   */
  async handleStepFailure(failedStepId, error) {
    this.log('error', `Handling failure of step ${failedStepId}`, {
      error: error.message,
      completedSteps: this.completedSteps.length
    });

    // Rollback completed steps in reverse order (if rollback is needed)
    // Note: In current implementation, we just log and fallback to sequential
    // Full rollback would require step-specific rollback logic

    const completedInReverse = [...this.completedSteps].reverse();
    for (const completed of completedInReverse) {
      this.log('info', `Would rollback step: ${completed.stepId} (placeholder)`);
      // await this.rollbackStep(completed.stepId); // Future enhancement
    }

    // Clear state for sequential retry
    this.completed.clear();
    this.failed.clear();
    this.completedSteps = [];
    this.fileLocks.clear();
  }

  /**
   * Sleep utility for testing
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset executor state (for testing)
   */
  reset() {
    this.results.clear();
    this.inProgress.clear();
    this.completed.clear();
    this.failed.clear();
    this.executionLog = [];
    this.fileLocks.clear();
    this.completedSteps = [];
    this.startTime = null;
    this.endTime = null;
  }
}

/**
 * ProgressTracker class
 * Tracks and reports execution progress
 */
class ProgressTracker {
  constructor() {
    this.steps = new Map(); // stepId → status
    this.history = []; // Historical events
    this.startTime = null;
  }

  /**
   * Mark step as started
   * @param {string} stepId - Step ID
   * @param {Object} metadata - Step metadata
   */
  start(stepId, metadata = {}) {
    if (!this.startTime) {
      this.startTime = Date.now();
    }

    this.steps.set(stepId, {
      status: 'in_progress',
      startTime: Date.now(),
      endTime: null,
      metadata: metadata
    });

    this.history.push({
      type: 'start',
      stepId: stepId,
      timestamp: Date.now()
    });
  }

  /**
   * Mark step as completed
   * @param {string} stepId - Step ID
   * @param {Object} result - Execution result
   */
  complete(stepId, result = {}) {
    const step = this.steps.get(stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in tracker`);
    }

    step.status = 'completed';
    step.endTime = Date.now();
    step.duration = step.endTime - step.startTime;
    step.result = result;

    this.steps.set(stepId, step);

    this.history.push({
      type: 'complete',
      stepId: stepId,
      timestamp: Date.now(),
      duration: step.duration
    });
  }

  /**
   * Mark step as failed
   * @param {string} stepId - Step ID
   * @param {Error} error - Error object
   */
  fail(stepId, error) {
    const step = this.steps.get(stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in tracker`);
    }

    step.status = 'failed';
    step.endTime = Date.now();
    step.duration = step.endTime - step.startTime;
    step.error = error.message;

    this.steps.set(stepId, step);

    this.history.push({
      type: 'fail',
      stepId: stepId,
      timestamp: Date.now(),
      error: error.message
    });
  }

  /**
   * Get progress summary
   * @param {number} totalSteps - Total number of steps
   * @returns {Object} Progress summary
   */
  getProgress(totalSteps) {
    const statuses = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0
    };

    for (const step of this.steps.values()) {
      statuses[step.status]++;
    }

    statuses.pending = totalSteps - (statuses.in_progress + statuses.completed + statuses.failed);

    const done = statuses.completed + statuses.failed;
    const percentage = totalSteps > 0 ? Math.round((done / totalSteps) * 100) : 0;

    return {
      total: totalSteps,
      ...statuses,
      percentage: percentage,
      elapsed_ms: this.startTime ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Get execution timeline
   * @returns {Array} Timeline events
   */
  getTimeline() {
    return this.history.map(event => ({
      ...event,
      relativeTime: this.startTime ? event.timestamp - this.startTime : 0
    }));
  }

  /**
   * Reset tracker
   */
  reset() {
    this.steps.clear();
    this.history = [];
    this.startTime = null;
  }
}

module.exports = { ParallelExecutor, ProgressTracker };
