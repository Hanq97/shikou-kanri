/**
 * Context Memory Manager for Enhanced EPS Framework
 * Auto-manages context to prevent overflow
 * Version: 1.0.0
 * Date: 2025-12-20
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ContextMemoryManager {
  constructor(config = {}) {
    // Configuration
    this.maxContextSize = config.maxContextSize || 100000; // tokens
    this.currentSize = 0;
    this.tasks = new Map();
    this.summaries = new Map();
    this.priority = new PriorityQueue();

    // Thresholds
    this.thresholds = {
      warning: config.warningThreshold || 0.7,      // 70%
      pruning: config.pruningThreshold || 0.8,      // 80%
      emergency: config.emergencyThreshold || 0.9,   // 90%
      critical: config.criticalThreshold || 0.95    // 95%
    };

    // Timings
    this.timings = {
      archiveDelay: config.archiveDelay || 5 * 60 * 1000,        // 5 minutes
      pruneOldTasks: config.pruneOldTasks || 10 * 60 * 1000,     // 10 minutes
      compressionThreshold: config.compressionThreshold || 5,     // 5+ tasks
      checkInterval: config.checkInterval || 30000                // 30 seconds
    };

    // Archive configuration
    this.archivePath = '.claude/archive';
    this.sessionsPath = '.claude/sessions';

    // Monitoring
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.metrics = {
      pruneCount: 0,
      archiveCount: 0,
      compressionCount: 0,
      recoveryCount: 0
    };

    // Initialize
    this.initialize();
  }

  /**
   * Initialize the context manager
   */
  async initialize() {
    try {
      // Create necessary directories
      await this.ensureDirectories();

      // Load previous session if exists
      await this.loadPreviousSession();

      // Start monitoring
      this.startMonitoring();

      console.log('✅ Context Memory Manager initialized');
      console.log(`📊 Context capacity: ${this.maxContextSize} tokens`);
      console.log(`📏 Current usage: ${this.getUsagePercent()}%`);
    } catch (error) {
      console.error('❌ Failed to initialize Context Manager:', error);
    }
  }

  /**
   * Ensure archive and session directories exist
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.archivePath, { recursive: true });
      await fs.mkdir(this.sessionsPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create directories:', error);
    }
  }

  /**
   * Load previous session if exists
   */
  async loadPreviousSession() {
    try {
      const sessionFile = path.join(this.sessionsPath, 'latest.json');
      const exists = await fs.access(sessionFile).then(() => true).catch(() => false);

      if (exists) {
        const sessionData = await fs.readFile(sessionFile, 'utf8');
        const session = JSON.parse(sessionData);

        // Restore critical tasks
        if (session.criticalTasks) {
          for (const task of session.criticalTasks) {
            this.tasks.set(task.id, task);
          }
        }

        // Restore summaries
        if (session.summaries) {
          for (const [id, summary] of Object.entries(session.summaries)) {
            this.summaries.set(id, summary);
          }
        }

        this.currentSize = this.calculateCurrentSize();
        console.log(`📂 Restored ${this.tasks.size} tasks from previous session`);
      }
    } catch (error) {
      console.error('Failed to load previous session:', error);
    }
  }

  /**
   * Start context monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitorInterval = setInterval(async () => {
      await this.checkContextHealth();
    }, this.timings.checkInterval);

    console.log('👁️ Context monitoring started');
  }

  /**
   * Stop context monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.isMonitoring = false;
      console.log('👁️ Context monitoring stopped');
    }
  }

  /**
   * Check context health and take action if needed
   */
  async checkContextHealth() {
    const usage = this.getUsage();

    if (usage > this.thresholds.critical) {
      console.log('🚨 CRITICAL: Context at', Math.round(usage * 100) + '%');
      await this.emergencyPrune();
    } else if (usage > this.thresholds.emergency) {
      console.log('⚠️ EMERGENCY: Context at', Math.round(usage * 100) + '%');
      await this.aggressivePrune();
    } else if (usage > this.thresholds.pruning) {
      console.log('🧹 AUTO-PRUNING: Context at', Math.round(usage * 100) + '%');
      await this.autoPrune();
    } else if (usage > this.thresholds.warning) {
      console.log('📊 WARNING: Context at', Math.round(usage * 100) + '%');
    }
  }

  /**
   * Mark a task as completed (auto-marking feature)
   */
  async markCompleted(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.warn(`Task ${taskId} not found`);
      return false;
    }

    // Update task status
    task.status = 'completed';
    task.completedAt = Date.now();

    console.log(`✓ Task ${taskId} marked as completed`);

    // Schedule for archival
    setTimeout(async () => {
      await this.archiveTask(taskId);
    }, this.timings.archiveDelay);

    // Check if pruning needed
    await this.checkAndPrune();

    return true;
  }

  /**
   * Auto-prune old and completed tasks
   */
  async autoPrune() {
    const startSize = this.currentSize;
    const tenMinutesAgo = Date.now() - this.timings.pruneOldTasks;
    let prunedCount = 0;

    // Phase 1: Remove old completed tasks
    for (const [taskId, task] of this.tasks) {
      if (task.status === 'completed' && task.completedAt < tenMinutesAgo) {
        await this.archiveAndRemove(taskId);
        prunedCount++;
      }
    }

    // Phase 2: Compress related tasks if still too full
    if (this.getUsage() > this.thresholds.pruning) {
      await this.compressRelatedTasks();
    }

    // Phase 3: Emergency measures if still critical
    if (this.getUsage() > this.thresholds.emergency) {
      await this.emergencyPrune();
    }

    const endSize = this.currentSize;
    const saved = startSize - endSize;

    console.log(`🧹 Pruned ${prunedCount} tasks, saved ${saved} tokens`);
    console.log(`📊 Context usage now: ${this.getUsagePercent()}%`);

    this.metrics.pruneCount++;
  }

  /**
   * Aggressive pruning for emergency situations
   */
  async aggressivePrune() {
    console.log('⚡ Aggressive pruning initiated');

    // Remove all completed tasks regardless of age
    for (const [taskId, task] of this.tasks) {
      if (task.status === 'completed') {
        await this.archiveAndRemove(taskId);
      }
    }

    // Compress all groups with 3+ tasks
    await this.compressRelatedTasks(3);

    // Remove low-priority pending tasks
    const sortedTasks = Array.from(this.tasks.entries())
      .sort((a, b) => (a[1].priority || 0) - (b[1].priority || 0));

    while (this.getUsage() > this.thresholds.pruning && sortedTasks.length > 0) {
      const [taskId] = sortedTasks.shift();
      await this.archiveAndRemove(taskId);
    }
  }

  /**
   * Emergency pruning - last resort
   */
  async emergencyPrune() {
    console.log('🚨 Emergency pruning - preserving only critical tasks');

    const criticalTasks = new Map();

    // Keep only critical and high-priority tasks
    for (const [taskId, task] of this.tasks) {
      if (task.priority === 'critical' || task.priority === 'high' || task.status === 'in_progress') {
        criticalTasks.set(taskId, task);
      } else {
        await this.archiveTask(taskId);
      }
    }

    // Replace all tasks with critical only
    this.tasks = criticalTasks;

    // Clear all summaries
    for (const [summaryId, summary] of this.summaries) {
      await this.archiveSummary(summaryId, summary);
    }
    this.summaries.clear();

    this.currentSize = this.calculateCurrentSize();
    console.log(`🚨 Emergency prune complete. Kept ${this.tasks.size} critical tasks`);
  }

  /**
   * Compress related tasks into summaries
   */
  async compressRelatedTasks(threshold = null) {
    const compressionThreshold = threshold || this.timings.compressionThreshold;
    const taskGroups = this.groupRelatedTasks();
    let compressedCount = 0;

    for (const group of taskGroups) {
      if (group.tasks.length >= compressionThreshold) {
        const summary = await this.createSummary(group.tasks);

        // Archive individual tasks
        for (const task of group.tasks) {
          await this.archiveTask(task.id);
          this.tasks.delete(task.id);
        }

        // Store summary
        this.summaries.set(summary.id, summary);
        compressedCount++;
      }
    }

    if (compressedCount > 0) {
      console.log(`📦 Compressed ${compressedCount} task groups into summaries`);
      this.metrics.compressionCount += compressedCount;
    }

    this.currentSize = this.calculateCurrentSize();
  }

  /**
   * Group related tasks by phase and feature
   */
  groupRelatedTasks() {
    const groups = new Map();

    for (const [taskId, task] of this.tasks) {
      const groupKey = `${task.phase || 'general'}-${task.feature || 'misc'}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: groupKey,
          tasks: []
        });
      }

      groups.get(groupKey).tasks.push(task);
    }

    return Array.from(groups.values());
  }

  /**
   * Create a summary from a group of tasks
   */
  async createSummary(tasks) {
    const summary = {
      id: `summary-${crypto.randomUUID()}`,
      type: 'summary',
      created: Date.now(),
      taskCount: tasks.length,
      phase: tasks[0].phase,
      feature: tasks[0].feature,
      completedCount: tasks.filter(t => t.status === 'completed').length,
      content: `Summary of ${tasks.length} tasks for ${tasks[0].feature || 'general'} in ${tasks[0].phase || 'general'} phase`,
      taskIds: tasks.map(t => t.id),
      expandable: true
    };

    // Calculate total time spent
    const totalTime = tasks.reduce((sum, task) => {
      return sum + (task.duration || 0);
    }, 0);

    summary.totalTime = totalTime;
    summary.description = `Completed ${summary.completedCount}/${summary.taskCount} tasks. Total time: ${Math.round(totalTime / 1000)}s`;

    return summary;
  }

  /**
   * Archive and remove a task
   */
  async archiveAndRemove(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    await this.archiveTask(taskId);
    this.tasks.delete(taskId);
    this.currentSize = this.calculateCurrentSize();
  }

  /**
   * Archive a task to disk
   */
  async archiveTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      const date = new Date().toISOString().split('T')[0];
      const archiveDir = path.join(this.archivePath, date);
      await fs.mkdir(archiveDir, { recursive: true });

      const archiveFile = path.join(archiveDir, `${taskId}.json`);
      await fs.writeFile(archiveFile, JSON.stringify(task, null, 2));

      this.metrics.archiveCount++;
    } catch (error) {
      console.error(`Failed to archive task ${taskId}:`, error);
    }
  }

  /**
   * Archive a summary
   */
  async archiveSummary(summaryId, summary) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const archiveDir = path.join(this.archivePath, date, 'summaries');
      await fs.mkdir(archiveDir, { recursive: true });

      const archiveFile = path.join(archiveDir, `${summaryId}.json`);
      await fs.writeFile(archiveFile, JSON.stringify(summary, null, 2));
    } catch (error) {
      console.error(`Failed to archive summary ${summaryId}:`, error);
    }
  }

  /**
   * Check and prune if necessary
   */
  async checkAndPrune() {
    if (this.getUsage() > this.thresholds.pruning) {
      await this.autoPrune();
    }
  }

  /**
   * Calculate current context size
   */
  calculateCurrentSize() {
    let size = 0;

    // Calculate task sizes
    for (const task of this.tasks.values()) {
      size += this.estimateTaskSize(task);
    }

    // Calculate summary sizes
    for (const summary of this.summaries.values()) {
      size += this.estimateSummarySize(summary);
    }

    return size;
  }

  /**
   * Estimate task size in tokens
   */
  estimateTaskSize(task) {
    const json = JSON.stringify(task);
    return Math.ceil(json.length / 4); // Rough estimate: 4 chars = 1 token
  }

  /**
   * Estimate summary size in tokens
   */
  estimateSummarySize(summary) {
    const json = JSON.stringify(summary);
    return Math.ceil(json.length / 4);
  }

  /**
   * Get current usage ratio
   */
  getUsage() {
    this.currentSize = this.calculateCurrentSize();
    return this.currentSize / this.maxContextSize;
  }

  /**
   * Get usage percentage
   */
  getUsagePercent() {
    return Math.round(this.getUsage() * 100);
  }

  /**
   * Add a new task
   */
  async addTask(task) {
    // Check if we have space
    const taskSize = this.estimateTaskSize(task);

    if (this.currentSize + taskSize > this.maxContextSize * this.thresholds.critical) {
      console.log('🛑 Cannot add task - context critical');
      await this.emergencyPrune();
    }

    // Add task with unique ID
    task.id = task.id || crypto.randomUUID();
    task.created = task.created || Date.now();
    task.status = task.status || 'pending';

    this.tasks.set(task.id, task);
    this.currentSize += taskSize;

    // Add to priority queue if has priority
    if (task.priority) {
      this.priority.enqueue(task, task.priority);
    }

    console.log(`📝 Added task ${task.id} (${taskSize} tokens)`);

    // Check context health
    await this.checkAndPrune();

    return task.id;
  }

  /**
   * Get active context for current phase
   */
  async getActiveContext(currentPhase = null) {
    const relevantTasks = [];

    for (const [taskId, task] of this.tasks) {
      // Include if matches phase, is pending, or is high priority
      if ((currentPhase && task.phase === currentPhase) ||
          task.status === 'pending' ||
          task.status === 'in_progress' ||
          task.priority === 'high' ||
          task.priority === 'critical') {
        relevantTasks.push({
          id: taskId,
          ...task
        });
      }
    }

    return {
      currentPhase,
      activeTasks: relevantTasks,
      summaries: Array.from(this.summaries.values()),
      contextSize: this.currentSize,
      maxSize: this.maxContextSize,
      utilizationPercent: this.getUsagePercent(),
      metrics: this.metrics
    };
  }

  /**
   * Save current session
   */
  async saveSession() {
    try {
      const criticalTasks = Array.from(this.tasks.entries())
        .filter(([_, task]) =>
          task.priority === 'critical' ||
          task.priority === 'high' ||
          task.status === 'in_progress'
        )
        .map(([id, task]) => ({ id, ...task }));

      const session = {
        timestamp: Date.now(),
        criticalTasks,
        summaries: Object.fromEntries(this.summaries),
        metrics: this.metrics,
        contextUsage: this.getUsagePercent()
      };

      const sessionFile = path.join(this.sessionsPath, 'latest.json');
      await fs.writeFile(sessionFile, JSON.stringify(session, null, 2));

      console.log('💾 Session saved successfully');
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * Generate usage report
   */
  generateReport() {
    return {
      status: 'healthy',
      usage: {
        current: this.currentSize,
        max: this.maxContextSize,
        percent: this.getUsagePercent()
      },
      tasks: {
        total: this.tasks.size,
        pending: Array.from(this.tasks.values()).filter(t => t.status === 'pending').length,
        inProgress: Array.from(this.tasks.values()).filter(t => t.status === 'in_progress').length,
        completed: Array.from(this.tasks.values()).filter(t => t.status === 'completed').length
      },
      summaries: this.summaries.size,
      metrics: this.metrics,
      thresholds: this.thresholds
    };
  }

  /**
   * Clean up and shutdown
   */
  async shutdown() {
    console.log('🔄 Shutting down Context Memory Manager...');

    // Stop monitoring
    this.stopMonitoring();

    // Save session
    await this.saveSession();

    console.log('✅ Context Memory Manager shutdown complete');
  }
}

/**
 * Priority Queue implementation
 */
class PriorityQueue {
  constructor() {
    this.queue = [];
  }

  enqueue(task, priority) {
    const item = { task, priority };

    // Find insertion point
    let added = false;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < priority) {
        this.queue.splice(i, 0, item);
        added = true;
        break;
      }
    }

    if (!added) {
      this.queue.push(item);
    }
  }

  dequeue() {
    return this.queue.shift();
  }

  peek() {
    return this.queue[0];
  }

  size() {
    return this.queue.length;
  }

  isEmpty() {
    return this.queue.length === 0;
  }
}

// Export for use in other modules
module.exports = ContextMemoryManager;