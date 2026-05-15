/**
 * Auto-Recovery System for Enhanced EPS Framework
 * Recovers context after compaction or loss
 * Version: 1.0.0
 * Date: 2025-12-20
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AutoRecoverySystem {
  constructor(config = {}) {
    // Configuration
    this.recoveryStrategy = config.recoveryStrategy || 'progressive';
    this.maxRecoveryPoints = config.maxRecoveryPoints || 10;
    this.recoveryPath = config.recoveryPath || '.claude/recovery';
    this.archivePath = config.archivePath || '.claude/archive';

    // Recovery points storage
    this.recoveryPoints = new Map();
    this.compactedData = new Map();

    // Task graph for dependency tracking
    this.taskGraph = {
      nodes: new Map(),
      edges: [],
      criticalPaths: []
    };

    // Recovery metrics
    this.metrics = {
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      averageRecoveryTime: 0
    };

    // Initialize
    this.initialize();
  }

  /**
   * Initialize the recovery system
   */
  async initialize() {
    try {
      // Ensure recovery directory exists
      await fs.mkdir(this.recoveryPath, { recursive: true });

      // Load existing recovery points
      await this.loadRecoveryPoints();

      console.log('✅ Auto-Recovery System initialized');
      console.log(`📊 Recovery points available: ${this.recoveryPoints.size}`);
    } catch (error) {
      console.error('❌ Failed to initialize Auto-Recovery:', error);
    }
  }

  /**
   * Load existing recovery points from disk
   */
  async loadRecoveryPoints() {
    try {
      const files = await fs.readdir(this.recoveryPath);
      const recoveryFiles = files.filter(f => f.endsWith('.recovery.json'));

      for (const file of recoveryFiles) {
        const filePath = path.join(this.recoveryPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const recoveryPoint = JSON.parse(content);

        this.recoveryPoints.set(recoveryPoint.id, recoveryPoint);
      }

      // Clean up old recovery points if exceeds max
      if (this.recoveryPoints.size > this.maxRecoveryPoints) {
        await this.cleanupOldRecoveryPoints();
      }
    } catch (error) {
      console.error('Failed to load recovery points:', error);
    }
  }

  /**
   * Create a recovery point before major operations
   */
  async createRecoveryPoint(context, label = '') {
    const startTime = Date.now();

    const recoveryPoint = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      label: label || `Recovery Point ${new Date().toISOString()}`,
      contextSnapshot: await this.snapshotContext(context),
      taskGraph: await this.buildTaskGraph(context.tasks),
      criticalPaths: await this.identifyCriticalPaths(context),
      metadata: {
        size: context.currentSize,
        taskCount: context.tasks ? context.tasks.size : 0,
        phase: context.currentPhase,
        utilizationPercent: Math.round((context.currentSize / context.maxContextSize) * 100)
      }
    };

    // Save to disk
    await this.saveRecoveryPoint(recoveryPoint);

    // Keep in memory
    this.recoveryPoints.set(recoveryPoint.id, recoveryPoint);

    // Clean up old points if needed
    if (this.recoveryPoints.size > this.maxRecoveryPoints) {
      await this.cleanupOldRecoveryPoints();
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Recovery point created: ${recoveryPoint.id} (${duration}ms)`);
    console.log(`   Label: ${recoveryPoint.label}`);
    console.log(`   Tasks: ${recoveryPoint.metadata.taskCount}`);
    console.log(`   Size: ${recoveryPoint.metadata.utilizationPercent}%`);

    return recoveryPoint.id;
  }

  /**
   * Snapshot critical context data
   */
  async snapshotContext(context) {
    const snapshot = {
      timestamp: Date.now(),
      activeTasks: [],
      workflowState: {},
      references: {}
    };

    // Extract active tasks (non-completed)
    if (context.tasks && context.tasks instanceof Map) {
      for (const [taskId, task] of context.tasks) {
        if (task.status !== 'completed' || this.isTaskCritical(task)) {
          snapshot.activeTasks.push({
            id: taskId,
            type: task.type,
            status: task.status,
            priority: task.priority,
            phase: task.phase,
            feature: task.feature,
            dependencies: task.dependencies || [],
            result: task.result ? { summary: task.result.summary || 'No summary' } : null,
            created: task.created,
            data: task.data || {}
          });
        }
      }
    }

    // Capture workflow state
    snapshot.workflowState = {
      currentPhase: context.currentPhase || 'unknown',
      completedPhases: context.completedPhases || [],
      pendingPhases: context.pendingPhases || []
    };

    // Capture critical references
    snapshot.references = {
      evidenceFiles: context.evidenceFiles || [],
      generatedDocs: context.generatedDocs || [],
      selectedOptions: context.selectedOptions || {},
      memoryBankPaths: context.memoryBankPaths || []
    };

    return snapshot;
  }

  /**
   * Build task dependency graph
   */
  async buildTaskGraph(tasks) {
    const graph = {
      nodes: new Map(),
      edges: [],
      clusters: []
    };

    if (!tasks || !(tasks instanceof Map)) {
      return graph;
    }

    // Build nodes
    for (const [taskId, task] of tasks) {
      graph.nodes.set(taskId, {
        id: taskId,
        type: task.type,
        phase: task.phase,
        status: task.status,
        priority: task.priority,
        critical: this.isTaskCritical(task)
      });
    }

    // Build edges (dependencies)
    for (const [taskId, task] of tasks) {
      if (task.dependencies && Array.isArray(task.dependencies)) {
        for (const depId of task.dependencies) {
          graph.edges.push({
            from: depId,
            to: taskId,
            type: 'depends_on'
          });
        }
      }
    }

    // Identify clusters of related tasks
    graph.clusters = await this.identifyClusters(graph);

    return graph;
  }

  /**
   * Identify critical paths in the task graph
   */
  async identifyCriticalPaths(context) {
    const criticalPaths = [];

    // Find paths for high-priority and in-progress tasks
    if (context.tasks && context.tasks instanceof Map) {
      for (const [taskId, task] of context.tasks) {
        if (task.priority === 'critical' ||
            task.priority === 'high' ||
            task.status === 'in_progress') {
          const path = await this.findCriticalPath(taskId, context.tasks);
          if (path.length > 0) {
            criticalPaths.push({
              taskId,
              path,
              priority: task.priority
            });
          }
        }
      }
    }

    return criticalPaths;
  }

  /**
   * Find critical path for a specific task
   */
  async findCriticalPath(taskId, tasks) {
    const path = [taskId];
    const visited = new Set();

    const traverse = (id) => {
      if (visited.has(id)) return;
      visited.add(id);

      const task = tasks.get(id);
      if (task && task.dependencies) {
        for (const depId of task.dependencies) {
          if (!visited.has(depId)) {
            path.push(depId);
            traverse(depId);
          }
        }
      }
    };

    traverse(taskId);
    return path;
  }

  /**
   * Check if a task is critical
   */
  isTaskCritical(task) {
    return task.priority === 'critical' ||
           task.priority === 'high' ||
           task.status === 'in_progress' ||
           task.type === 'milestone' ||
           task.type === 'checkpoint';
  }

  /**
   * Auto-recover after context compaction
   */
  async autoRecover(compactedContext) {
    const startTime = Date.now();
    console.log('🔄 Auto-Recovery initiated...');

    this.metrics.recoveryAttempts++;

    try {
      // Step 1: Find latest recovery point
      const recoveryPoint = await this.findLatestRecoveryPoint();

      if (!recoveryPoint) {
        console.log('⚠️ No recovery point found, using fallback recovery');
        return await this.fallbackRecovery(compactedContext);
      }

      console.log(`📂 Using recovery point: ${recoveryPoint.label}`);

      // Step 2: Restore essential context
      const restoredContext = await this.restoreFromPoint(recoveryPoint);

      // Step 3: Merge with compacted data
      const mergedContext = await this.mergeContexts(restoredContext, compactedContext);

      // Step 4: Rebuild task graph
      await this.rebuildTaskGraph(mergedContext);

      // Step 5: Verify integrity
      const valid = await this.verifyContextIntegrity(mergedContext);

      if (!valid) {
        console.log('⚠️ Integrity check failed, using progressive recovery');
        return await this.progressiveRecovery(recoveryPoint, compactedContext);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Auto-Recovery successful (${duration}ms)`);

      this.metrics.successfulRecoveries++;
      this.updateAverageRecoveryTime(duration);

      return mergedContext;
    } catch (error) {
      console.error('❌ Auto-Recovery failed:', error);
      this.metrics.failedRecoveries++;
      return await this.fallbackRecovery(compactedContext);
    }
  }

  /**
   * Find the latest recovery point
   */
  async findLatestRecoveryPoint() {
    if (this.recoveryPoints.size === 0) {
      return null;
    }

    // Sort by timestamp and get the latest
    const sorted = Array.from(this.recoveryPoints.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    return sorted[0];
  }

  /**
   * Restore context from a recovery point
   */
  async restoreFromPoint(recoveryPoint) {
    const restored = {
      tasks: new Map(),
      currentSize: 0,
      phase: recoveryPoint.metadata.phase,
      workflowState: recoveryPoint.contextSnapshot.workflowState,
      references: recoveryPoint.contextSnapshot.references
    };

    // Restore active tasks
    for (const taskSnapshot of recoveryPoint.contextSnapshot.activeTasks) {
      const task = await this.reconstructTask(taskSnapshot);
      restored.tasks.set(task.id, task);
      restored.currentSize += this.estimateTaskSize(task);
    }

    console.log(`📥 Restored ${restored.tasks.size} tasks from recovery point`);

    return restored;
  }

  /**
   * Reconstruct a task from snapshot
   */
  async reconstructTask(taskSnapshot) {
    const reconstructed = {
      id: taskSnapshot.id,
      type: taskSnapshot.type || 'general',
      status: taskSnapshot.status || 'pending',
      priority: taskSnapshot.priority,
      phase: taskSnapshot.phase,
      feature: taskSnapshot.feature,
      dependencies: taskSnapshot.dependencies || [],
      created: taskSnapshot.created || Date.now(),
      data: taskSnapshot.data || {}
    };

    // Try to restore from archive
    const archived = await this.restoreFromArchive(taskSnapshot.id);
    if (archived) {
      Object.assign(reconstructed, archived);
    } else {
      // Use snapshot data
      reconstructed.result = taskSnapshot.result || {
        summary: 'Recovered from snapshot',
        partial: true
      };
    }

    return reconstructed;
  }

  /**
   * Restore task from archive
   */
  async restoreFromArchive(taskId) {
    try {
      // Search in recent archives
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      for (const date of [today, yesterday]) {
        const archivePath = path.join(this.archivePath, date, `${taskId}.json`);
        const exists = await fs.access(archivePath).then(() => true).catch(() => false);

        if (exists) {
          const content = await fs.readFile(archivePath, 'utf8');
          return JSON.parse(content);
        }
      }
    } catch (error) {
      // Archive not found
    }

    return null;
  }

  /**
   * Merge restored context with compacted context
   */
  async mergeContexts(restored, compacted) {
    const merged = {
      tasks: new Map(restored.tasks),
      currentSize: restored.currentSize,
      phase: restored.phase || compacted.phase,
      workflowState: { ...restored.workflowState, ...compacted.workflowState },
      references: { ...restored.references, ...compacted.references },
      summaries: compacted.summaries || new Map()
    };

    // Add non-duplicate tasks from compacted
    if (compacted.tasks && compacted.tasks instanceof Map) {
      for (const [taskId, task] of compacted.tasks) {
        if (!merged.tasks.has(taskId)) {
          merged.tasks.set(taskId, task);
          merged.currentSize += this.estimateTaskSize(task);
        }
      }
    }

    console.log(`🔄 Merged context: ${merged.tasks.size} tasks total`);

    return merged;
  }

  /**
   * Progressive recovery strategy
   */
  async progressiveRecovery(recoveryPoint, compactedContext) {
    console.log('📈 Starting progressive recovery...');

    const recovered = {
      tasks: new Map(),
      currentSize: 0,
      phase: recoveryPoint.metadata.phase,
      maxSize: compactedContext.maxSize || 100000
    };

    // Phase 1: Restore critical tasks first
    const criticalTasks = recoveryPoint.contextSnapshot.activeTasks
      .filter(task => this.isTaskCritical(task))
      .sort((a, b) => {
        // Sort by priority
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      });

    for (const taskSnapshot of criticalTasks) {
      const task = await this.reconstructTask(taskSnapshot);
      const taskSize = this.estimateTaskSize(task);

      if (recovered.currentSize + taskSize < recovered.maxSize * 0.5) {
        recovered.tasks.set(task.id, task);
        recovered.currentSize += taskSize;
      }
    }

    console.log(`✅ Phase 1: Restored ${recovered.tasks.size} critical tasks`);

    // Phase 2: Restore recent tasks from compacted
    const recentTasks = this.extractRecentTasks(compactedContext);
    for (const task of recentTasks) {
      const taskSize = this.estimateTaskSize(task);

      if (recovered.currentSize + taskSize < recovered.maxSize * 0.7) {
        recovered.tasks.set(task.id, task);
        recovered.currentSize += taskSize;
      }
    }

    console.log(`✅ Phase 2: Added ${recovered.tasks.size - criticalTasks.length} recent tasks`);

    // Phase 3: Restore workflow state
    recovered.workflowState = await this.reconstructWorkflowState(
      recoveryPoint,
      compactedContext
    );

    console.log('✅ Phase 3: Workflow state reconstructed');

    return recovered;
  }

  /**
   * Extract recent tasks from compacted context
   */
  extractRecentTasks(compactedContext) {
    const tasks = [];
    const cutoff = Date.now() - (60 * 60 * 1000); // 1 hour ago

    if (compactedContext.tasks && compactedContext.tasks instanceof Map) {
      for (const [taskId, task] of compactedContext.tasks) {
        if (task.created && task.created > cutoff) {
          tasks.push(task);
        }
      }
    }

    // Sort by creation time (newest first)
    tasks.sort((a, b) => (b.created || 0) - (a.created || 0));

    return tasks;
  }

  /**
   * Reconstruct workflow state
   */
  async reconstructWorkflowState(recoveryPoint, compactedContext) {
    const state = {
      currentPhase: compactedContext.currentPhase ||
                    recoveryPoint.contextSnapshot.workflowState.currentPhase ||
                    'unknown',
      completedPhases: [
        ...(recoveryPoint.contextSnapshot.workflowState.completedPhases || []),
        ...(compactedContext.completedPhases || [])
      ],
      pendingPhases: compactedContext.pendingPhases ||
                     recoveryPoint.contextSnapshot.workflowState.pendingPhases ||
                     []
    };

    // Remove duplicates
    state.completedPhases = [...new Set(state.completedPhases)];

    return state;
  }

  /**
   * Rebuild task graph after recovery
   */
  async rebuildTaskGraph(context) {
    this.taskGraph = await this.buildTaskGraph(context.tasks);
    console.log(`📊 Task graph rebuilt: ${this.taskGraph.nodes.size} nodes, ${this.taskGraph.edges.length} edges`);
  }

  /**
   * Verify context integrity after recovery
   */
  async verifyContextIntegrity(context) {
    const checks = {
      hasActiveTasks: context.tasks && context.tasks.size > 0,
      hasWorkflowState: context.workflowState !== undefined,
      hasValidPhase: this.isValidPhase(context.workflowState?.currentPhase),
      dependenciesValid: await this.validateDependencies(context.tasks),
      sizeWithinLimits: context.currentSize < (context.maxSize || 100000)
    };

    const results = Object.entries(checks);
    const failed = results.filter(([_, pass]) => !pass);

    if (failed.length > 0) {
      console.log('❌ Integrity checks failed:', failed.map(([name]) => name).join(', '));
      return false;
    }

    console.log('✅ All integrity checks passed');
    return true;
  }

  /**
   * Validate task dependencies
   */
  async validateDependencies(tasks) {
    if (!tasks || !(tasks instanceof Map)) {
      return true;
    }

    for (const [taskId, task] of tasks) {
      if (task.dependencies && Array.isArray(task.dependencies)) {
        for (const depId of task.dependencies) {
          if (!tasks.has(depId)) {
            console.log(`⚠️ Missing dependency: ${depId} for task ${taskId}`);
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Check if phase is valid
   */
  isValidPhase(phase) {
    const validPhases = [
      'RESEARCH', 'INNOVATE', 'DESIGN', 'PLAN', 'EXECUTE', 'VALIDATE',
      'RESEARCH_SRS', 'RESEARCH_BD', 'RESEARCH_DD',
      'INNOVATE_SRS', 'INNOVATE_BD', 'INNOVATE_DD',
      'SRS_CREATED', 'BD_CREATED', 'DD_CREATED',
      'PLAN_CREATED', 'EXECUTED', 'COMPLETED',
      'unknown'
    ];

    return validPhases.includes(phase);
  }

  /**
   * Fallback recovery when normal recovery fails
   */
  async fallbackRecovery(context) {
    console.log('⚠️ Using fallback recovery strategy');

    const fallback = {
      tasks: new Map(),
      currentSize: 0,
      phase: 'unknown',
      workflowState: {
        currentPhase: 'unknown',
        completedPhases: [],
        pendingPhases: []
      },
      references: {}
    };

    // Try to salvage what we can
    if (context.tasks && context.tasks instanceof Map) {
      for (const [taskId, task] of context.tasks) {
        if (task.status === 'in_progress' || task.priority === 'critical') {
          fallback.tasks.set(taskId, task);
          fallback.currentSize += this.estimateTaskSize(task);
        }
      }
    }

    console.log(`📦 Fallback recovery: Salvaged ${fallback.tasks.size} critical tasks`);

    return fallback;
  }

  /**
   * Identify task clusters
   */
  async identifyClusters(graph) {
    const clusters = [];
    const visited = new Set();

    const dfs = (nodeId, cluster) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      cluster.nodes.push(nodeId);

      // Find connected nodes
      for (const edge of graph.edges) {
        if (edge.from === nodeId && !visited.has(edge.to)) {
          dfs(edge.to, cluster);
        }
        if (edge.to === nodeId && !visited.has(edge.from)) {
          dfs(edge.from, cluster);
        }
      }
    };

    // Find all clusters
    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const cluster = {
          id: `cluster-${clusters.length}`,
          nodes: []
        };
        dfs(nodeId, cluster);
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Save recovery point to disk
   */
  async saveRecoveryPoint(recoveryPoint) {
    try {
      const fileName = `${recoveryPoint.id}.recovery.json`;
      const filePath = path.join(this.recoveryPath, fileName);
      await fs.writeFile(filePath, JSON.stringify(recoveryPoint, null, 2));
    } catch (error) {
      console.error('Failed to save recovery point:', error);
    }
  }

  /**
   * Clean up old recovery points
   */
  async cleanupOldRecoveryPoints() {
    const sorted = Array.from(this.recoveryPoints.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    // Keep only the most recent points
    const toKeep = sorted.slice(0, this.maxRecoveryPoints);
    const toRemove = sorted.slice(this.maxRecoveryPoints);

    for (const point of toRemove) {
      // Remove from memory
      this.recoveryPoints.delete(point.id);

      // Remove from disk
      try {
        const fileName = `${point.id}.recovery.json`;
        const filePath = path.join(this.recoveryPath, fileName);
        await fs.unlink(filePath);
      } catch (error) {
        console.error(`Failed to remove old recovery point ${point.id}:`, error);
      }
    }

    if (toRemove.length > 0) {
      console.log(`🧹 Cleaned up ${toRemove.length} old recovery points`);
    }
  }

  /**
   * Estimate task size
   */
  estimateTaskSize(task) {
    const json = JSON.stringify(task);
    return Math.ceil(json.length / 4); // Rough estimate: 4 chars = 1 token
  }

  /**
   * Update average recovery time
   */
  updateAverageRecoveryTime(duration) {
    const totalAttempts = this.metrics.successfulRecoveries;
    const currentAvg = this.metrics.averageRecoveryTime;

    this.metrics.averageRecoveryTime = Math.round(
      (currentAvg * (totalAttempts - 1) + duration) / totalAttempts
    );
  }

  /**
   * Generate recovery report
   */
  generateReport() {
    return {
      status: 'operational',
      recoveryPoints: this.recoveryPoints.size,
      maxRecoveryPoints: this.maxRecoveryPoints,
      metrics: this.metrics,
      taskGraph: {
        nodes: this.taskGraph.nodes.size,
        edges: this.taskGraph.edges.length,
        clusters: this.taskGraph.clusters ? this.taskGraph.clusters.length : 0
      },
      strategy: this.recoveryStrategy
    };
  }

  /**
   * Manual recovery trigger
   */
  async manualRecover(recoveryPointId = null) {
    let recoveryPoint;

    if (recoveryPointId) {
      recoveryPoint = this.recoveryPoints.get(recoveryPointId);
      if (!recoveryPoint) {
        console.error(`Recovery point ${recoveryPointId} not found`);
        return null;
      }
    } else {
      recoveryPoint = await this.findLatestRecoveryPoint();
      if (!recoveryPoint) {
        console.error('No recovery points available');
        return null;
      }
    }

    console.log(`🔄 Manual recovery from: ${recoveryPoint.label}`);
    return await this.restoreFromPoint(recoveryPoint);
  }

  /**
   * List available recovery points
   */
  listRecoveryPoints() {
    const points = Array.from(this.recoveryPoints.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(point => ({
        id: point.id,
        label: point.label,
        timestamp: new Date(point.timestamp).toISOString(),
        taskCount: point.metadata.taskCount,
        utilization: point.metadata.utilizationPercent + '%'
      }));

    return points;
  }
}

// Export for use in other modules
module.exports = AutoRecoverySystem;