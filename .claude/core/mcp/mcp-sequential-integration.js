/**
 * Sequential MCP Integration
 * シーケンシャルMCP統合
 * Tích Hợp MCP Tuần Tự
 *
 * Purpose: Multi-step planning workflow with dependency management
 * 目的：依存関係管理を備えたマルチステップ計画ワークフロー
 * Mục đích: Quy trình lập kế hoạch đa bước với quản lý phụ thuộc
 *
 * Features:
 * - Multi-step planning workflow
 * - Step dependency management
 * - Progressive refinement logic
 * - Context passing between steps
 *
 * Version: 1.0.0
 * Created: 2025-12-27
 */

const AgentCoordinator = require('./agent-coordinator.js');

class SequentialMCPIntegration {
    constructor(options = {}) {
        this.coordinator = new AgentCoordinator();

        this.config = {
            maxSteps: 10,                      // Maximum steps in a plan
            maxDependencyDepth: 5,             // Maximum dependency chain depth
            stepTimeout: 120000,               // 2 minutes per step
            contextTTL: 3600000,               // 1 hour context lifetime
            enableProgressiveRefinement: true, // Enable refinement mode
            ...options
        };

        // Step execution tracking
        this.execution = {
            planId: null,
            steps: [],                         // Array of step definitions
            executedSteps: new Map(),          // stepId → result
            pendingSteps: new Set(),           // stepIds not yet executed
            blockedSteps: new Map(),           // stepId → [dependency IDs]
            context: new Map(),                // stepId → context object
            startTime: null,
            endTime: null
        };

        // Statistics
        this.stats = {
            total_plans: 0,
            total_steps: 0,
            successful_steps: 0,
            failed_steps: 0,
            avg_steps_per_plan: 0,
            avg_step_duration: 0,
            dependency_violations: 0,
            refinement_iterations: 0
        };

        console.log('[SequentialMCP] Initialized');
        console.log(`[SequentialMCP] Config: maxSteps=${this.config.maxSteps}, maxDepth=${this.config.maxDependencyDepth}`);
    }

    /**
     * Initialize a new multi-step plan
     *
     * @param {string} planId - Unique plan identifier
     * @param {Array<Object>} steps - Array of step definitions
     * @returns {Object} - Initialization result
     */
    initializePlan(planId, steps) {
        console.log(`\n[SequentialMCP] Initializing plan: ${planId}`);
        console.log(`[SequentialMCP] Steps: ${steps.length}`);

        // Validate plan
        if (steps.length === 0) {
            throw new Error('Plan must have at least one step');
        }

        if (steps.length > this.config.maxSteps) {
            throw new Error(`Plan exceeds maximum steps (${this.config.maxSteps})`);
        }

        // Validate step structure
        for (const step of steps) {
            if (!step.id || !step.description || !step.category) {
                throw new Error(`Invalid step structure: ${JSON.stringify(step)}`);
            }
        }

        // Validate dependencies
        const stepIds = new Set(steps.map(s => s.id));
        for (const step of steps) {
            if (step.dependencies) {
                for (const depId of step.dependencies) {
                    if (!stepIds.has(depId)) {
                        throw new Error(`Step ${step.id} depends on non-existent step ${depId}`);
                    }
                }
            }
        }

        // Check for circular dependencies
        this._validateNoCycles(steps);

        // Initialize execution state
        this.execution.planId = planId;
        this.execution.steps = steps;
        this.execution.executedSteps.clear();
        this.execution.pendingSteps = new Set(steps.map(s => s.id));
        this.execution.blockedSteps.clear();
        this.execution.context.clear();
        this.execution.startTime = Date.now();
        this.execution.endTime = null;

        // Build dependency map
        for (const step of steps) {
            if (step.dependencies && step.dependencies.length > 0) {
                this.execution.blockedSteps.set(step.id, step.dependencies);
            }
        }

        this.stats.total_plans++;

        console.log(`[SequentialMCP] Plan initialized successfully`);
        console.log(`[SequentialMCP] Pending: ${this.execution.pendingSteps.size}, Blocked: ${this.execution.blockedSteps.size}`);

        return {
            planId: planId,
            totalSteps: steps.length,
            readySteps: this._getReadySteps().length,
            blockedSteps: this.execution.blockedSteps.size
        };
    }

    /**
     * Execute the next available step in the plan
     *
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} - Step execution result
     */
    async executeNextStep(options = {}) {
        if (!this.execution.planId) {
            throw new Error('No active plan. Call initializePlan() first.');
        }

        const readySteps = this._getReadySteps();

        if (readySteps.length === 0) {
            if (this.execution.pendingSteps.size === 0) {
                console.log('[SequentialMCP] All steps completed');
                this.execution.endTime = Date.now();
                return {
                    status: 'completed',
                    message: 'All steps completed successfully',
                    totalSteps: this.execution.steps.length,
                    executedSteps: this.execution.executedSteps.size,
                    duration: this.execution.endTime - this.execution.startTime
                };
            } else {
                throw new Error(`No steps ready to execute. Pending: ${this.execution.pendingSteps.size}, Blocked: ${this.execution.blockedSteps.size}`);
            }
        }

        // Execute first ready step
        const stepId = readySteps[0];
        const step = this.execution.steps.find(s => s.id === stepId);

        console.log(`\n[SequentialMCP] Executing step: ${stepId}`);
        console.log(`[SequentialMCP] Description: ${step.description}`);
        console.log(`[SequentialMCP] Category: ${step.category}`);

        try {
            // Gather context from dependencies
            const context = this._buildStepContext(step);

            // Execute step via AgentCoordinator
            const startTime = Date.now();
            const result = await this.coordinator.coordinate(
                step.description,
                step.category,
                step.complexity || 'low',
                step.personas || [],
                { autonomous: true, ...options }
            );

            const duration = Date.now() - startTime;

            // Store result and context
            this.execution.executedSteps.set(stepId, {
                ...result,
                stepId: stepId,
                duration: duration,
                timestamp: new Date().toISOString()
            });

            this.execution.context.set(stepId, {
                stepId: stepId,
                result: result,
                context: context,
                timestamp: new Date().toISOString()
            });

            // Update tracking
            this.execution.pendingSteps.delete(stepId);
            this._unblockDependentSteps(stepId);

            this.stats.total_steps++;
            this.stats.successful_steps++;
            this.stats.avg_step_duration = (this.stats.avg_step_duration * (this.stats.total_steps - 1) + duration) / this.stats.total_steps;

            console.log(`[SequentialMCP] Step completed in ${duration}ms`);
            console.log(`[SequentialMCP] Remaining: ${this.execution.pendingSteps.size} steps`);

            return {
                status: 'success',
                stepId: stepId,
                recommendation: result.recommendation,
                confidence: result.confidence,
                tokens: result.tokens,
                duration: duration,
                remainingSteps: this.execution.pendingSteps.size,
                nextReadySteps: this._getReadySteps()
            };

        } catch (error) {
            console.error(`[SequentialMCP] Step ${stepId} failed:`, error.message);
            this.stats.failed_steps++;

            return {
                status: 'failed',
                stepId: stepId,
                error: error.message,
                remainingSteps: this.execution.pendingSteps.size
            };
        }
    }

    /**
     * Execute all steps in the plan sequentially
     *
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} - Complete plan execution result
     */
    async executeAll(options = {}) {
        console.log(`\n[SequentialMCP] Executing all steps in plan: ${this.execution.planId}`);

        const results = [];

        while (this.execution.pendingSteps.size > 0) {
            const result = await this.executeNextStep(options);

            if (result.status === 'completed') {
                break;
            }

            results.push(result);

            if (result.status === 'failed' && !options.continueOnError) {
                console.error(`[SequentialMCP] Stopping execution due to step failure`);
                break;
            }
        }

        const totalDuration = Date.now() - this.execution.startTime;
        this.stats.avg_steps_per_plan = (this.stats.avg_steps_per_plan * (this.stats.total_plans - 1) + results.length) / this.stats.total_plans;

        console.log(`\n[SequentialMCP] Plan execution complete`);
        console.log(`[SequentialMCP] Total duration: ${totalDuration}ms`);
        console.log(`[SequentialMCP] Steps executed: ${results.length}/${this.execution.steps.length}`);
        console.log(`[SequentialMCP] Success rate: ${this.stats.successful_steps}/${this.stats.total_steps} (${Math.round(this.stats.successful_steps / this.stats.total_steps * 100)}%)`);

        return {
            planId: this.execution.planId,
            totalSteps: this.execution.steps.length,
            executedSteps: results.length,
            successfulSteps: results.filter(r => r.status === 'success').length,
            failedSteps: results.filter(r => r.status === 'failed').length,
            duration: totalDuration,
            results: results
        };
    }

    /**
     * Get context from a specific step
     *
     * @param {string} stepId - Step identifier
     * @returns {Object|null} - Step context or null if not found
     */
    getStepContext(stepId) {
        return this.execution.context.get(stepId) || null;
    }

    /**
     * Get all executed step results
     *
     * @returns {Array<Object>} - Array of executed step results
     */
    getAllResults() {
        return Array.from(this.execution.executedSteps.values());
    }

    /**
     * Get current execution status
     *
     * @returns {Object} - Current status
     */
    getStatus() {
        return {
            planId: this.execution.planId,
            totalSteps: this.execution.steps.length,
            executedSteps: this.execution.executedSteps.size,
            pendingSteps: this.execution.pendingSteps.size,
            blockedSteps: this.execution.blockedSteps.size,
            readySteps: this._getReadySteps().length,
            startTime: this.execution.startTime,
            elapsed: this.execution.startTime ? Date.now() - this.execution.startTime : 0
        };
    }

    /**
     * Get statistics
     *
     * @returns {Object} - Statistics object
     */
    getStats() {
        return { ...this.stats };
    }

    // ==================== PRIVATE METHODS ====================

    /**
     * Get steps that are ready to execute (no blocking dependencies)
     *
     * @returns {Array<string>} - Array of step IDs ready to execute
     */
    _getReadySteps() {
        const ready = [];

        for (const stepId of this.execution.pendingSteps) {
            if (!this.execution.blockedSteps.has(stepId)) {
                ready.push(stepId);
            }
        }

        return ready;
    }

    /**
     * Build context for a step from its dependencies
     *
     * @param {Object} step - Step definition
     * @returns {Object} - Aggregated context from dependencies
     */
    _buildStepContext(step) {
        const context = {
            stepId: step.id,
            dependencies: []
        };

        if (step.dependencies) {
            for (const depId of step.dependencies) {
                const depContext = this.execution.context.get(depId);
                if (depContext) {
                    context.dependencies.push({
                        stepId: depId,
                        recommendation: depContext.result.recommendation,
                        confidence: depContext.result.confidence
                    });
                }
            }
        }

        return context;
    }

    /**
     * Unblock steps that depend on the just-completed step
     *
     * @param {string} completedStepId - ID of completed step
     */
    _unblockDependentSteps(completedStepId) {
        for (const [stepId, dependencies] of this.execution.blockedSteps.entries()) {
            const updatedDeps = dependencies.filter(d => d !== completedStepId);

            if (updatedDeps.length === 0) {
                // All dependencies satisfied, unblock step
                this.execution.blockedSteps.delete(stepId);
                console.log(`[SequentialMCP] Step ${stepId} unblocked`);
            } else {
                // Update remaining dependencies
                this.execution.blockedSteps.set(stepId, updatedDeps);
            }
        }
    }

    /**
     * Validate no circular dependencies in plan
     *
     * @param {Array<Object>} steps - Step definitions
     * @throws {Error} - If circular dependency detected
     */
    _validateNoCycles(steps) {
        const visited = new Set();
        const recursionStack = new Set();

        const hasCycle = (stepId) => {
            if (recursionStack.has(stepId)) {
                return true; // Cycle detected
            }

            if (visited.has(stepId)) {
                return false; // Already checked
            }

            visited.add(stepId);
            recursionStack.add(stepId);

            const step = steps.find(s => s.id === stepId);
            if (step && step.dependencies) {
                for (const depId of step.dependencies) {
                    if (hasCycle(depId)) {
                        return true;
                    }
                }
            }

            recursionStack.delete(stepId);
            return false;
        };

        for (const step of steps) {
            if (hasCycle(step.id)) {
                throw new Error(`Circular dependency detected involving step: ${step.id}`);
            }
        }
    }
}

module.exports = SequentialMCPIntegration;
