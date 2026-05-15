/**
 * PM Agent Core - Enhanced EPS Framework
 *
 * Project Management Agent with:
 * - Always-active orchestration
 * - PDCA cycle (Plan → Do → Check → Act)
 * - Declarative goal management
 * - Session-aware context management
 * - Auto-initialization hooks
 *
 * Version: 1.0.0
 * Author: EPS Framework Team
 * Date: 2025-12-20
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');
const ContextMemoryManager = require('../memory/context-memory-manager');
const AutoRecoverySystem = require('../memory/auto-recovery');

class PMAgent extends EventEmitter {
  constructor(config = {}) {
    super();

    // Core configuration
    this.config = {
      alwaysActive: config.alwaysActive !== false, // Default true
      autoInit: config.autoInit !== false,         // Default true
      sessionPersistence: config.sessionPersistence !== false,
      pdcaCycleInterval: config.pdcaCycleInterval || 30000, // 30 seconds
      contextCheckInterval: config.contextCheckInterval || 10000, // 10 seconds
      workingDirectory: config.workingDirectory || process.cwd(),
      memoryBankPath: config.memoryBankPath || path.join(process.cwd(), '.claude', 'memory-bank'),
      ...config
    };

    // Session management
    this.session = {
      id: this.generateSessionId(),
      startTime: new Date(),
      goals: [],
      completedGoals: [],
      activePhase: null,
      pdcaCycle: {
        current: 'PLAN',
        history: [],
        metrics: {
          plan: { count: 0, duration: 0 },
          do: { count: 0, duration: 0 },
          check: { count: 0, duration: 0 },
          act: { count: 0, duration: 0 }
        }
      },
      context: {
        manager: null,
        recovery: null,
        overflow: false,
        lastCheck: null
      }
    };

    // Declarative goals parser
    this.declarativeParser = {
      patterns: [
        // Feature implementation
        { regex: /implement\s+(.+)\s+feature/i, type: 'feature', phase: 'EXECUTE' },
        { regex: /add\s+(.+)\s+functionality/i, type: 'feature', phase: 'EXECUTE' },

        // Design generation
        { regex: /generate\s+(.+)\s+(srs|bd|dd|design)/i, type: 'design', phase: 'DESIGN' },
        { regex: /create\s+(.+)\s+specification/i, type: 'design', phase: 'DESIGN' },

        // Research and analysis
        { regex: /analyze\s+(.+)/i, type: 'research', phase: 'RESEARCH' },
        { regex: /research\s+(.+)/i, type: 'research', phase: 'RESEARCH' },
        { regex: /investigate\s+(.+)/i, type: 'research', phase: 'RESEARCH' },

        // Innovation
        { regex: /brainstorm\s+(.+)/i, type: 'innovate', phase: 'INNOVATE' },
        { regex: /explore\s+alternatives\s+for\s+(.+)/i, type: 'innovate', phase: 'INNOVATE' },

        // Planning
        { regex: /plan\s+(.+)\s+implementation/i, type: 'plan', phase: 'PLAN' },
        { regex: /create\s+plan\s+for\s+(.+)/i, type: 'plan', phase: 'PLAN' },

        // Validation
        { regex: /validate\s+(.+)/i, type: 'validate', phase: 'VALIDATE' },
        { regex: /review\s+(.+)/i, type: 'validate', phase: 'VALIDATE' },
        { regex: /test\s+(.+)/i, type: 'validate', phase: 'VALIDATE' }
      ]
    };

    // PDCA cycle state machine
    this.pdcaStateMachine = {
      PLAN: {
        next: 'DO',
        actions: ['analyze_goals', 'prioritize_tasks', 'allocate_resources'],
        validator: () => this.session.goals.length > 0
      },
      DO: {
        next: 'CHECK',
        actions: ['execute_tasks', 'monitor_progress', 'handle_exceptions'],
        validator: () => this.session.activePhase !== null
      },
      CHECK: {
        next: 'ACT',
        actions: ['measure_results', 'compare_targets', 'identify_gaps'],
        validator: () => true
      },
      ACT: {
        next: 'PLAN',
        actions: ['implement_improvements', 'update_processes', 'document_lessons'],
        validator: () => true
      }
    };

    // Workflow phases mapping
    this.workflowPhases = {
      RESEARCH: { priority: 1, dependencies: [] },
      INNOVATE: { priority: 2, dependencies: ['RESEARCH'] },
      DESIGN: { priority: 3, dependencies: ['INNOVATE'] },
      PLAN: { priority: 4, dependencies: ['DESIGN'] },
      EXECUTE: { priority: 5, dependencies: ['PLAN'] },
      VALIDATE: { priority: 6, dependencies: ['EXECUTE'] }
    };

    // Monitoring intervals
    this.intervals = {
      pdca: null,
      context: null,
      session: null
    };

    // Initialize if auto-init enabled
    if (this.config.autoInit) {
      this.initialize().catch(console.error);
    }
  }

  /**
   * Initialize PM Agent
   */
  async initialize() {
    console.log('🚀 Initializing PM Agent...');

    try {
      // Initialize context management
      this.session.context.manager = new ContextMemoryManager({
        maxContextSize: 100000,
        pruningThreshold: 0.8
      });

      this.session.context.recovery = new AutoRecoverySystem();

      // Load previous session if exists
      if (this.config.sessionPersistence) {
        await this.loadSession();
      }

      // Start monitoring if always active
      if (this.config.alwaysActive) {
        this.startMonitoring();
      }

      // Set up event listeners
      this.setupEventListeners();

      // Emit initialized event
      this.emit('initialized', {
        session: this.session.id,
        alwaysActive: this.config.alwaysActive,
        timestamp: new Date()
      });

      console.log('✅ PM Agent initialized successfully');
      console.log(`📊 Session ID: ${this.session.id}`);
      console.log(`⚡ Always Active: ${this.config.alwaysActive}`);

      return true;
    } catch (error) {
      console.error('❌ PM Agent initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start monitoring loops
   */
  startMonitoring() {
    // PDCA cycle monitoring
    this.intervals.pdca = setInterval(() => {
      this.runPDCACycle().catch(console.error);
    }, this.config.pdcaCycleInterval);

    // Context monitoring
    this.intervals.context = setInterval(() => {
      this.checkContext().catch(console.error);
    }, this.config.contextCheckInterval);

    // Session persistence
    if (this.config.sessionPersistence) {
      this.intervals.session = setInterval(() => {
        this.saveSession().catch(console.error);
      }, 60000); // Save every minute
    }

    console.log('👁️ Monitoring started');
  }

  /**
   * Stop monitoring loops
   */
  stopMonitoring() {
    Object.values(this.intervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });

    console.log('🛑 Monitoring stopped');
  }

  /**
   * Run PDCA cycle
   */
  async runPDCACycle() {
    const currentPhase = this.session.pdcaCycle.current;
    const phaseConfig = this.pdcaStateMachine[currentPhase];

    if (!phaseConfig) {
      console.error(`Unknown PDCA phase: ${currentPhase}`);
      return;
    }

    const startTime = Date.now();

    try {
      // Check if can proceed
      if (!phaseConfig.validator()) {
        return; // Skip this cycle
      }

      // Execute phase actions
      for (const action of phaseConfig.actions) {
        await this.executeAction(currentPhase, action);
      }

      // Update metrics
      this.session.pdcaCycle.metrics[currentPhase.toLowerCase()].count++;
      this.session.pdcaCycle.metrics[currentPhase.toLowerCase()].duration += Date.now() - startTime;

      // Move to next phase
      this.session.pdcaCycle.history.push({
        phase: currentPhase,
        timestamp: new Date(),
        duration: Date.now() - startTime
      });

      this.session.pdcaCycle.current = phaseConfig.next;

      // Emit cycle event
      this.emit('pdca-cycle', {
        previousPhase: currentPhase,
        currentPhase: phaseConfig.next,
        duration: Date.now() - startTime
      });

    } catch (error) {
      console.error(`PDCA ${currentPhase} phase error:`, error);
      this.emit('pdca-error', { phase: currentPhase, error });
    }
  }

  /**
   * Execute PDCA action
   */
  async executeAction(phase, action) {
    switch (action) {
      // PLAN actions
      case 'analyze_goals':
        await this.analyzeGoals();
        break;
      case 'prioritize_tasks':
        await this.prioritizeTasks();
        break;
      case 'allocate_resources':
        await this.allocateResources();
        break;

      // DO actions
      case 'execute_tasks':
        await this.executeTasks();
        break;
      case 'monitor_progress':
        await this.monitorProgress();
        break;
      case 'handle_exceptions':
        await this.handleExceptions();
        break;

      // CHECK actions
      case 'measure_results':
        await this.measureResults();
        break;
      case 'compare_targets':
        await this.compareTargets();
        break;
      case 'identify_gaps':
        await this.identifyGaps();
        break;

      // ACT actions
      case 'implement_improvements':
        await this.implementImprovements();
        break;
      case 'update_processes':
        await this.updateProcesses();
        break;
      case 'document_lessons':
        await this.documentLessons();
        break;
    }
  }

  /**
   * Parse declarative goal
   */
  parseDeclarativeGoal(input) {
    for (const pattern of this.declarativeParser.patterns) {
      const match = input.match(pattern.regex);
      if (match) {
        return {
          type: pattern.type,
          phase: pattern.phase,
          description: match[1] ? match[1].trim() : input,
          original: input,
          parsed: true
        };
      }
    }

    // Default if no pattern matches
    return {
      type: 'general',
      phase: 'RESEARCH',
      description: input,
      original: input,
      parsed: false
    };
  }

  /**
   * Add declarative goal
   */
  async addGoal(goalText, metadata = {}) {
    const parsed = this.parseDeclarativeGoal(goalText);

    const goal = {
      id: this.generateGoalId(),
      ...parsed,
      metadata,
      status: 'pending',
      createdAt: new Date(),
      priority: metadata.priority || this.calculatePriority(parsed)
    };

    this.session.goals.push(goal);

    // Add to context manager
    if (this.session.context.manager) {
      await this.session.context.manager.addTask({
        id: goal.id,
        type: 'goal',
        phase: goal.phase,
        priority: goal.priority > 7 ? 'high' : goal.priority > 4 ? 'normal' : 'low',
        content: goal.description
      });
    }

    this.emit('goal-added', goal);

    console.log(`🎯 Goal added: ${goal.description} (${goal.phase})`);

    return goal;
  }

  /**
   * PLAN Phase Actions
   */
  async analyzeGoals() {
    const pendingGoals = this.session.goals.filter(g => g.status === 'pending');

    if (pendingGoals.length === 0) return;

    // Group by phase
    const goalsByPhase = {};
    pendingGoals.forEach(goal => {
      if (!goalsByPhase[goal.phase]) {
        goalsByPhase[goal.phase] = [];
      }
      goalsByPhase[goal.phase].push(goal);
    });

    // Check dependencies
    for (const [phase, goals] of Object.entries(goalsByPhase)) {
      const deps = this.workflowPhases[phase].dependencies;
      const canProceed = deps.every(dep => {
        const depGoals = this.session.completedGoals.filter(g => g.phase === dep);
        return depGoals.length > 0;
      });

      if (!canProceed) {
        goals.forEach(g => g.status = 'blocked');
      } else {
        goals.forEach(g => g.status = 'ready');
      }
    }
  }

  async prioritizeTasks() {
    // Sort goals by priority and phase order
    this.session.goals.sort((a, b) => {
      // First by status (ready > blocked > pending)
      const statusPriority = { ready: 3, pending: 2, blocked: 1 };
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[b.status] - statusPriority[a.status];
      }

      // Then by phase priority
      const phaseA = this.workflowPhases[a.phase].priority;
      const phaseB = this.workflowPhases[b.phase].priority;
      if (phaseA !== phaseB) {
        return phaseA - phaseB;
      }

      // Finally by goal priority
      return b.priority - a.priority;
    });
  }

  async allocateResources() {
    // Check context capacity
    if (this.session.context.manager) {
      const usage = this.session.context.manager.getUsagePercent();
      if (usage > 70) {
        console.log(`⚠️ Context usage high: ${usage}%`);
        await this.session.context.manager.autoPrune();
      }
    }
  }

  /**
   * DO Phase Actions
   */
  async executeTasks() {
    const readyGoals = this.session.goals.filter(g => g.status === 'ready');

    if (readyGoals.length === 0) return;

    // Execute first ready goal
    const goal = readyGoals[0];
    goal.status = 'in_progress';
    this.session.activePhase = goal.phase;

    this.emit('goal-execution', {
      goal,
      phase: goal.phase
    });

    console.log(`⚡ Executing: ${goal.description}`);
  }

  async monitorProgress() {
    const inProgress = this.session.goals.filter(g => g.status === 'in_progress');

    for (const goal of inProgress) {
      // Check if goal has been running too long
      const runtime = Date.now() - new Date(goal.createdAt).getTime();
      if (runtime > 300000) { // 5 minutes
        console.log(`⏰ Goal timeout: ${goal.description}`);
        goal.status = 'timeout';
      }
    }
  }

  async handleExceptions() {
    const failed = this.session.goals.filter(g =>
      g.status === 'failed' || g.status === 'timeout'
    );

    for (const goal of failed) {
      // Create recovery point
      if (this.session.context.recovery) {
        await this.session.context.recovery.createRecoveryPoint(
          this.session.context.manager,
          `Failed goal: ${goal.description}`
        );
      }

      // Retry or escalate
      if (goal.retries < 3) {
        goal.retries = (goal.retries || 0) + 1;
        goal.status = 'pending';
        console.log(`🔄 Retrying goal: ${goal.description} (attempt ${goal.retries})`);
      } else {
        console.log(`❌ Goal failed after 3 retries: ${goal.description}`);
        this.emit('goal-failed', goal);
      }
    }
  }

  /**
   * CHECK Phase Actions
   */
  async measureResults() {
    const completed = this.session.goals.filter(g => g.status === 'completed');
    const failed = this.session.goals.filter(g => g.status === 'failed');
    const total = this.session.goals.length;

    this.session.metrics = {
      completionRate: total > 0 ? (completed.length / total) * 100 : 0,
      failureRate: total > 0 ? (failed.length / total) * 100 : 0,
      avgDuration: this.calculateAverageDuration(),
      contextUsage: this.session.context.manager ?
        this.session.context.manager.getUsagePercent() : 0
    };

    console.log(`📊 Metrics: ${completed.length}/${total} goals completed (${this.session.metrics.completionRate.toFixed(1)}%)`);
  }

  async compareTargets() {
    // Compare actual vs expected performance
    const targets = {
      completionRate: 80, // 80% target
      maxDuration: 180000 // 3 minutes target
    };

    const gaps = {
      completionRate: this.session.metrics.completionRate - targets.completionRate,
      duration: this.session.metrics.avgDuration - targets.maxDuration
    };

    this.session.gaps = gaps;

    if (gaps.completionRate < 0) {
      console.log(`⚠️ Below completion target by ${Math.abs(gaps.completionRate).toFixed(1)}%`);
    }
  }

  async identifyGaps() {
    const improvements = [];

    if (this.session.gaps.completionRate < -10) {
      improvements.push('increase_retry_limit');
      improvements.push('improve_error_handling');
    }

    if (this.session.gaps.duration > 60000) {
      improvements.push('optimize_execution');
      improvements.push('parallel_processing');
    }

    if (this.session.metrics.contextUsage > 80) {
      improvements.push('aggressive_pruning');
      improvements.push('context_compression');
    }

    this.session.improvements = improvements;
  }

  /**
   * ACT Phase Actions
   */
  async implementImprovements() {
    for (const improvement of this.session.improvements || []) {
      switch (improvement) {
        case 'aggressive_pruning':
          if (this.session.context.manager) {
            this.session.context.manager.config.pruningThreshold = 0.7;
            console.log('📉 Lowered pruning threshold to 70%');
          }
          break;

        case 'context_compression':
          if (this.session.context.manager) {
            await this.session.context.manager.compressRelatedTasks();
            console.log('🗜️ Compressed related tasks');
          }
          break;

        case 'parallel_processing':
          // Flag for parallel execution
          this.config.enableParallel = true;
          console.log('⚡ Enabled parallel processing');
          break;
      }
    }
  }

  async updateProcesses() {
    // Update declarative patterns based on common goals
    const commonPatterns = this.analyzeCommonGoals();

    for (const pattern of commonPatterns) {
      if (!this.declarativeParser.patterns.some(p => p.regex.source === pattern.regex.source)) {
        this.declarativeParser.patterns.push(pattern);
        console.log(`➕ Added new pattern: ${pattern.regex.source}`);
      }
    }
  }

  async documentLessons() {
    const lessons = {
      sessionId: this.session.id,
      timestamp: new Date(),
      metrics: this.session.metrics,
      gaps: this.session.gaps,
      improvements: this.session.improvements,
      completedGoals: this.session.completedGoals.length,
      failedGoals: this.session.goals.filter(g => g.status === 'failed').length
    };

    // Save to memory bank
    const lessonsPath = path.join(
      this.config.memoryBankPath,
      'pm-agent',
      `lessons-${this.session.id}.json`
    );

    await fs.mkdir(path.dirname(lessonsPath), { recursive: true });
    await fs.writeFile(lessonsPath, JSON.stringify(lessons, null, 2));

    console.log(`📝 Lessons documented: ${lessonsPath}`);
  }

  /**
   * Context monitoring
   */
  async checkContext() {
    if (!this.session.context.manager) return;

    const usage = this.session.context.manager.getUsagePercent();
    const wasOverflow = this.session.context.overflow;
    this.session.context.overflow = usage > 90;

    if (!wasOverflow && this.session.context.overflow) {
      console.log('🚨 Context overflow detected!');

      // Create recovery point
      if (this.session.context.recovery) {
        await this.session.context.recovery.createRecoveryPoint(
          this.session.context.manager,
          'Context overflow'
        );
      }

      // Emergency pruning
      await this.session.context.manager.emergencyPrune();

      this.emit('context-overflow', { usage });
    }

    this.session.context.lastCheck = new Date();
  }

  /**
   * Session management
   */
  async saveSession() {
    const sessionData = {
      id: this.session.id,
      startTime: this.session.startTime,
      goals: this.session.goals,
      completedGoals: this.session.completedGoals,
      pdcaCycle: this.session.pdcaCycle,
      metrics: this.session.metrics
    };

    const sessionPath = path.join(
      this.config.memoryBankPath,
      'pm-agent',
      'sessions',
      `${this.session.id}.json`
    );

    await fs.mkdir(path.dirname(sessionPath), { recursive: true });
    await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2));
  }

  async loadSession() {
    try {
      const sessionsDir = path.join(this.config.memoryBankPath, 'pm-agent', 'sessions');
      const files = await fs.readdir(sessionsDir);

      if (files.length === 0) return;

      // Load most recent session
      const sessions = await Promise.all(
        files.map(async file => {
          const content = await fs.readFile(path.join(sessionsDir, file), 'utf8');
          return JSON.parse(content);
        })
      );

      sessions.sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      const lastSession = sessions[0];

      // Restore session data
      this.session.goals = lastSession.goals || [];
      this.session.completedGoals = lastSession.completedGoals || [];
      this.session.pdcaCycle = lastSession.pdcaCycle || this.session.pdcaCycle;

      console.log(`📂 Restored session: ${lastSession.id}`);
      console.log(`   Goals: ${this.session.goals.length}`);
      console.log(`   Completed: ${this.session.completedGoals.length}`);

    } catch (error) {
      // No previous session
    }
  }

  /**
   * Utility functions
   */
  generateSessionId() {
    return `pm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateGoalId() {
    return `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  calculatePriority(parsed) {
    // Priority based on phase
    const phasePriority = {
      VALIDATE: 9,
      EXECUTE: 8,
      PLAN: 7,
      DESIGN: 6,
      INNOVATE: 5,
      RESEARCH: 4
    };

    return phasePriority[parsed.phase] || 5;
  }

  calculateAverageDuration() {
    const completed = this.session.completedGoals;
    if (completed.length === 0) return 0;

    const totalDuration = completed.reduce((sum, goal) => {
      const duration = new Date(goal.completedAt).getTime() -
                      new Date(goal.createdAt).getTime();
      return sum + duration;
    }, 0);

    return totalDuration / completed.length;
  }

  analyzeCommonGoals() {
    // Analyze completed goals for patterns
    const patterns = [];
    const phrases = {};

    this.session.completedGoals.forEach(goal => {
      const words = goal.original.toLowerCase().split(/\s+/);
      const bigrams = [];

      for (let i = 0; i < words.length - 1; i++) {
        bigrams.push(`${words[i]} ${words[i + 1]}`);
      }

      bigrams.forEach(bigram => {
        phrases[bigram] = (phrases[bigram] || 0) + 1;
      });
    });

    // Create patterns for common phrases
    Object.entries(phrases)
      .filter(([phrase, count]) => count >= 3)
      .forEach(([phrase, count]) => {
        patterns.push({
          regex: new RegExp(phrase, 'i'),
          type: 'common',
          phase: 'RESEARCH'
        });
      });

    return patterns;
  }

  /**
   * Event listeners setup
   */
  setupEventListeners() {
    // Auto-complete goals
    this.on('goal-execution', async ({ goal }) => {
      // Simulate completion for demo
      setTimeout(() => {
        this.completeGoal(goal.id);
      }, 5000);
    });

    // Handle context overflow
    this.on('context-overflow', async () => {
      // Pause new goals
      this.session.goals.forEach(g => {
        if (g.status === 'pending') {
          g.status = 'paused';
        }
      });
    });
  }

  /**
   * Complete a goal
   */
  async completeGoal(goalId) {
    const goal = this.session.goals.find(g => g.id === goalId);
    if (!goal) return;

    goal.status = 'completed';
    goal.completedAt = new Date();

    // Move to completed
    this.session.completedGoals.push(goal);
    this.session.goals = this.session.goals.filter(g => g.id !== goalId);

    // Mark in context manager
    if (this.session.context.manager) {
      await this.session.context.manager.markCompleted(goalId);
    }

    console.log(`✅ Goal completed: ${goal.description}`);

    this.emit('goal-completed', goal);
  }

  /**
   * Generate PM Agent report
   */
  generateReport() {
    const pdcaMetrics = Object.entries(this.session.pdcaCycle.metrics)
      .reduce((acc, [phase, metrics]) => {
        acc[phase] = {
          count: metrics.count,
          avgDuration: metrics.count > 0 ?
            (metrics.duration / metrics.count / 1000).toFixed(2) + 's' : '0s'
        };
        return acc;
      }, {});

    return {
      session: {
        id: this.session.id,
        uptime: Math.floor((Date.now() - new Date(this.session.startTime).getTime()) / 1000),
        alwaysActive: this.config.alwaysActive
      },
      goals: {
        total: this.session.goals.length + this.session.completedGoals.length,
        pending: this.session.goals.filter(g => g.status === 'pending').length,
        ready: this.session.goals.filter(g => g.status === 'ready').length,
        inProgress: this.session.goals.filter(g => g.status === 'in_progress').length,
        completed: this.session.completedGoals.length,
        failed: this.session.goals.filter(g => g.status === 'failed').length
      },
      pdca: {
        currentPhase: this.session.pdcaCycle.current,
        cyclesCompleted: Math.floor(this.session.pdcaCycle.history.length / 4),
        metrics: pdcaMetrics
      },
      context: {
        usage: this.session.context.manager ?
          this.session.context.manager.getUsagePercent() + '%' : 'N/A',
        overflow: this.session.context.overflow,
        lastCheck: this.session.context.lastCheck
      },
      performance: this.session.metrics || {}
    };
  }

  /**
   * Shutdown PM Agent
   */
  async shutdown() {
    console.log('🔄 Shutting down PM Agent...');

    // Stop monitoring
    this.stopMonitoring();

    // Save final session
    if (this.config.sessionPersistence) {
      await this.saveSession();
    }

    // Shutdown context manager
    if (this.session.context.manager) {
      await this.session.context.manager.shutdown();
    }

    // Document final lessons
    await this.documentLessons();

    this.emit('shutdown');

    console.log('✅ PM Agent shutdown complete');
  }
}

// Export
module.exports = PMAgent;