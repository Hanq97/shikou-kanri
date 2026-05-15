/**
 * Dependency Graph Builder
 * 依存関係グラフビルダー
 * Trình Xây Dựng Đồ Thị Phụ Thuộc
 *
 * Purpose: Analyze plan structure and build dependency graph for parallel execution
 * Version: 1.0.0
 * Date: 2025-12-23
 */

/**
 * DependencyGraph class
 * Builds and analyzes dependency graphs from plan steps
 */
class DependencyGraph {
  constructor(plan) {
    this.plan = plan;
    this.nodes = new Map(); // stepId → node data
    this.edges = new Map(); // stepId → [dependency stepIds]
    this.levels = []; // execution levels (parallel groups)
    this.metrics = {};
  }

  /**
   * Build complete dependency graph from plan
   * @param {Object} options - Build options
   * @returns {Object} Graph structure with nodes, edges, levels, metrics
   */
  buildGraph(options = {}) {
    const { skipTopologicalSort = false } = options;

    // 1. Extract all steps from plan
    const steps = this.extractSteps(this.plan);

    if (steps.length === 0) {
      return {
        nodes: [],
        edges: [],
        levels: [],
        metrics: {
          total_steps: 0,
          total_levels: 0,
          parallelization_rate: 0,
          max_concurrent: 0
        }
      };
    }

    // 2. Create nodes
    steps.forEach(step => {
      this.nodes.set(step.id, {
        id: step.id,
        description: step.description || step.name || 'Unnamed step',
        type: step.type || 'action',
        action: step.action,
        reads: step.reads || [],
        writes: step.writes || [],
        parallel_safe: step.parallel_safe !== false,
        metadata: step.metadata || {}
      });
    });

    // 3. Detect dependencies
    this.detectDependencies();

    // 4. Perform topological sort (unless skipped for validation)
    if (!skipTopologicalSort) {
      this.topologicalSort();
      // 5. Calculate metrics
      this.calculateMetrics();
    }

    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.entries()).map(([stepId, deps]) => ({
        stepId,
        dependencies: deps
      })),
      levels: this.levels,
      metrics: this.metrics
    };
  }

  /**
   * Extract steps from plan structure
   * @param {Object} plan - Plan object
   * @returns {Array} Array of step objects
   */
  extractSteps(plan) {
    const steps = [];

    // Handle different plan formats
    if (plan.detailedSteps && Array.isArray(plan.detailedSteps)) {
      // Format 1: enhanced-plan.js format with detailedSteps
      plan.detailedSteps.forEach((step, index) => {
        steps.push({
          id: step.id || `step-${index + 1}`,
          description: step.description,
          type: step.category || 'general',
          reads: step.reads || [],
          writes: step.writes || [],
          parallel_safe: step.parallel_safe !== false,
          metadata: {
            phase: step.phase,
            duration: step.duration,
            complexity: step.complexity,
            context: step.context
          }
        });
      });
    } else if (plan.steps && Array.isArray(plan.steps)) {
      // Format 2: Simple steps array
      plan.steps.forEach((step, index) => {
        steps.push({
          id: step.id || `step-${index + 1}`,
          description: step.description || step.name,
          type: step.type || 'action',
          reads: step.reads || [],
          writes: step.writes || [],
          parallel_safe: step.parallel_safe !== false,
          metadata: step.metadata || {}
        });
      });
    } else if (plan.phases && Array.isArray(plan.phases)) {
      // Format 3: Phases with tasks
      let stepCounter = 1;
      plan.phases.forEach(phase => {
        if (phase.tasks && Array.isArray(phase.tasks)) {
          phase.tasks.forEach(task => {
            steps.push({
              id: task.id || `step-${stepCounter++}`,
              description: task.name || task.description,
              type: 'task',
              reads: task.reads || [],
              writes: task.writes || [],
              parallel_safe: task.parallel_safe !== false,
              metadata: {
                phase: phase.name,
                duration: task.duration
              }
            });
          });
        }
      });
    }

    return steps;
  }

  /**
   * Detect dependencies between all steps
   */
  detectDependencies() {
    const nodeArray = Array.from(this.nodes.values());

    // Initialize edges map (all steps start with no dependencies)
    nodeArray.forEach(node => {
      this.edges.set(node.id, []);
    });

    // Build complete dependency graph (check all pairs)
    for (let i = 0; i < nodeArray.length; i++) {
      const stepA = nodeArray[i];
      const deps = [];

      // Check dependencies with ALL other steps to detect cycles
      for (let j = 0; j < nodeArray.length; j++) {
        if (i === j) continue; // Skip self

        const stepB = nodeArray[j];

        // Check data dependency (stepA reads what stepB writes)
        if (this.hasDataDependency(stepA, stepB)) {
          deps.push(stepB.id);
        }
        // Check write conflict (both write same file - must serialize)
        // Only serialize if stepB comes before stepA in original order
        else if (this.hasWriteConflict(stepA, stepB) && j < i) {
          deps.push(stepB.id);
        }
      }

      this.edges.set(stepA.id, deps);
    }
  }

  /**
   * Check if stepA has data dependency on stepB
   * @param {Object} stepA - Step that may depend on stepB
   * @param {Object} stepB - Step that may be depended upon
   * @returns {boolean} True if stepA reads file that stepB writes
   */
  hasDataDependency(stepA, stepB) {
    return stepA.reads.some(file => stepB.writes.includes(file));
  }

  /**
   * Check if steps have write conflict
   * @param {Object} stepA - First step
   * @param {Object} stepB - Second step
   * @returns {boolean} True if both write to same file
   */
  hasWriteConflict(stepA, stepB) {
    return stepA.writes.some(file => stepB.writes.includes(file));
  }

  /**
   * Find root steps (no dependencies - can start immediately)
   * @returns {Array} Array of step IDs with no dependencies
   */
  findRoots() {
    const roots = [];
    for (const [stepId, deps] of this.edges.entries()) {
      if (deps.length === 0) {
        roots.push(stepId);
      }
    }
    return roots;
  }

  /**
   * Find leaf steps (no dependents - terminal steps)
   * @returns {Array} Array of step IDs that are not dependencies of any other step
   */
  findLeaves() {
    const allDeps = new Set();
    for (const deps of this.edges.values()) {
      deps.forEach(dep => allDeps.add(dep));
    }

    const leaves = [];
    for (const stepId of this.nodes.keys()) {
      if (!allDeps.has(stepId)) {
        leaves.push(stepId);
      }
    }
    return leaves;
  }

  /**
   * Topological sort using Kahn's algorithm
   * @returns {Array} Array of execution levels (each level is array of step IDs that can run in parallel)
   */
  topologicalSort() {
    const levels = [];
    const inDegree = new Map(); // stepId → number of dependencies
    const adjList = new Map(); // stepId → [steps that depend on it]

    // Initialize in-degree count and adjacency list
    for (const stepId of this.nodes.keys()) {
      inDegree.set(stepId, 0);
      adjList.set(stepId, []);
    }

    // Build in-degree and adjacency list
    for (const [stepId, deps] of this.edges.entries()) {
      inDegree.set(stepId, deps.length);
      deps.forEach(depId => {
        adjList.get(depId).push(stepId);
      });
    }

    // Find initial roots (in-degree = 0)
    let currentLevel = [];
    for (const [stepId, degree] of inDegree.entries()) {
      if (degree === 0) {
        currentLevel.push(stepId);
      }
    }

    // Process levels
    while (currentLevel.length > 0) {
      levels.push([...currentLevel]);
      const nextLevel = [];

      // For each step in current level
      currentLevel.forEach(stepId => {
        // Decrement in-degree for all dependent steps
        const dependents = adjList.get(stepId) || [];
        dependents.forEach(depStepId => {
          const newDegree = inDegree.get(depStepId) - 1;
          inDegree.set(depStepId, newDegree);

          // If in-degree becomes 0, add to next level
          if (newDegree === 0) {
            nextLevel.push(depStepId);
          }
        });
      });

      currentLevel = nextLevel;
    }

    // Check for cycles (not all nodes processed)
    const processedCount = levels.reduce((sum, level) => sum + level.length, 0);
    if (processedCount < this.nodes.size) {
      throw new Error('Circular dependency detected in plan steps');
    }

    this.levels = levels;
    return levels;
  }

  /**
   * Find critical path (longest path through graph)
   * @returns {Object} Critical path information
   */
  findCriticalPath() {
    // Build reverse adjacency list (step → steps it depends on)
    const reverseAdj = new Map();
    for (const [stepId, deps] of this.edges.entries()) {
      reverseAdj.set(stepId, deps);
    }

    // Calculate longest path to each node
    const distance = new Map();
    const parent = new Map();

    // Initialize all distances to 0
    for (const stepId of this.nodes.keys()) {
      distance.set(stepId, 0);
      parent.set(stepId, null);
    }

    // Process levels in order
    for (const level of this.levels) {
      for (const stepId of level) {
        const deps = reverseAdj.get(stepId) || [];

        // Find max distance from dependencies
        let maxDist = 0;
        let maxParent = null;

        for (const depId of deps) {
          const depDist = distance.get(depId);
          if (depDist >= maxDist) {
            maxDist = depDist;
            maxParent = depId;
          }
        }

        distance.set(stepId, maxDist + 1);
        parent.set(stepId, maxParent);
      }
    }

    // Find leaf with maximum distance
    const leaves = this.findLeaves();
    let maxDist = 0;
    let endStep = null;

    for (const leafId of leaves) {
      const dist = distance.get(leafId);
      if (dist > maxDist) {
        maxDist = dist;
        endStep = leafId;
      }
    }

    // Reconstruct path
    const path = [];
    let current = endStep;
    while (current !== null) {
      path.unshift(current);
      current = parent.get(current);
    }

    return {
      length: maxDist,
      path: path,
      steps: path.map(id => this.nodes.get(id))
    };
  }

  /**
   * Calculate parallelization metrics
   */
  calculateMetrics() {
    const totalSteps = this.nodes.size;
    const totalLevels = this.levels.length;

    if (totalSteps === 0) {
      this.metrics = {
        total_steps: 0,
        total_levels: 0,
        avg_concurrent: 0,
        max_concurrent: 0,
        parallelization_rate: 0,
        critical_path_length: 0
      };
      return;
    }

    // Max concurrent steps
    const maxConcurrent = Math.max(...this.levels.map(level => level.length));

    // Average concurrent steps
    const avgConcurrent = totalSteps / totalLevels;

    // Parallelization rate (% of steps that can run in parallel)
    const sequentialSteps = this.levels.filter(level => level.length === 1).length;
    const parallelSteps = totalSteps - sequentialSteps;
    const parallelizationRate = (parallelSteps / totalSteps) * 100;

    // Critical path
    const criticalPath = this.findCriticalPath();

    this.metrics = {
      total_steps: totalSteps,
      total_levels: totalLevels,
      avg_concurrent: parseFloat(avgConcurrent.toFixed(2)),
      max_concurrent: maxConcurrent,
      parallelization_rate: parseFloat(parallelizationRate.toFixed(1)),
      critical_path_length: criticalPath.length,
      sequential_time: totalSteps, // Assuming 1 time unit per step
      parallel_time: totalLevels,
      speedup: parseFloat((totalSteps / totalLevels).toFixed(2)),
      efficiency: parseFloat(((totalSteps / totalLevels) / maxConcurrent * 100).toFixed(1))
    };
  }

  /**
   * Validate graph for safety constraints
   * @returns {Object} Validation result
   */
  validate() {
    const issues = [];

    // Check 1: No cycles (detect cycles without running full topological sort)
    try {
      // Only check for cycles if we haven't sorted yet
      if (this.levels.length === 0) {
        this.topologicalSort();
      }
    } catch (error) {
      issues.push({
        type: 'cycle',
        message: error.message,
        severity: 'error'
      });
      // Return early - can't continue validation without valid levels
      return {
        valid: false,
        issues: issues
      };
    }

    // Check 2: No write conflicts within same level
    for (let i = 0; i < this.levels.length; i++) {
      const level = this.levels[i];
      const writtenFiles = new Map();

      for (const stepId of level) {
        const node = this.nodes.get(stepId);
        for (const file of node.writes) {
          if (writtenFiles.has(file)) {
            issues.push({
              type: 'write_conflict',
              message: `Write conflict in level ${i}: steps ${writtenFiles.get(file)} and ${stepId} both write to ${file}`,
              severity: 'error',
              level: i,
              steps: [writtenFiles.get(file), stepId],
              file: file
            });
          }
          writtenFiles.set(file, stepId);
        }
      }
    }

    // Check 3: All reads have corresponding writes (data dependency validation)
    const allWrites = new Set();
    for (const node of this.nodes.values()) {
      node.writes.forEach(file => allWrites.add(file));
    }

    for (const node of this.nodes.values()) {
      for (const file of node.reads) {
        if (!allWrites.has(file)) {
          issues.push({
            type: 'missing_dependency',
            message: `Step ${node.id} reads ${file} but no step writes it`,
            severity: 'warning',
            stepId: node.id,
            file: file
          });
        }
      }
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues: issues
    };
  }

  /**
   * Calculate dependent counts for each step
   * Week 3 Day 4: Greedy scheduling optimization
   * @returns {Map} stepId → count of steps that depend on it
   */
  calculateDependentCounts() {
    const dependentCount = new Map();

    // Initialize all steps with 0 dependents
    for (const stepId of this.nodes.keys()) {
      dependentCount.set(stepId, 0);
    }

    // Count how many steps depend on each step
    for (const deps of this.edges.values()) {
      for (const depId of deps) {
        dependentCount.set(depId, dependentCount.get(depId) + 1);
      }
    }

    return dependentCount;
  }

  /**
   * Optimize step execution order using greedy scheduling
   * Week 3 Day 4: Performance optimization
   * Prioritizes steps with more dependents for earlier execution
   * @param {number} maxConcurrency - Maximum concurrent steps
   * @returns {Array} Optimized schedule as array of step batches
   */
  optimizeSchedule(maxConcurrency = 4) {
    if (this.levels.length === 0) {
      this.topologicalSort();
    }

    const schedule = [];
    const dependentCount = this.calculateDependentCounts();

    // Process each level with priority ordering
    for (const level of this.levels) {
      if (level.length <= maxConcurrency) {
        // Level fits in one batch
        schedule.push(level);
      } else {
        // Split level into prioritized batches
        const sortedLevel = [...level].sort((a, b) => {
          // Higher dependent count = higher priority (execute first)
          return dependentCount.get(b) - dependentCount.get(a);
        });

        // Create batches
        for (let i = 0; i < sortedLevel.length; i += maxConcurrency) {
          schedule.push(sortedLevel.slice(i, i + maxConcurrency));
        }
      }
    }

    return {
      schedule: schedule,
      totalBatches: schedule.length,
      optimization: {
        originalLevels: this.levels.length,
        optimizedBatches: schedule.length,
        improvement: schedule.length <= this.levels.length ? 'optimized' : 'expanded'
      }
    };
  }

  /**
   * Get graph statistics for debugging
   * @returns {Object} Graph statistics
   */
  getStats() {
    return {
      nodes: this.nodes.size,
      edges: Array.from(this.edges.values()).reduce((sum, deps) => sum + deps.length, 0),
      roots: this.findRoots().length,
      leaves: this.findLeaves().length,
      levels: this.levels.length,
      metrics: this.metrics
    };
  }
}

module.exports = { DependencyGraph };
