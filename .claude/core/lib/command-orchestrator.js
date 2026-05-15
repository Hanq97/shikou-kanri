/**
 * Command Orchestrator - Bridge between .md commands and JavaScript engines
 * コマンドオーケストレーター - .mdコマンドとJavaScriptエンジン間のブリッジ
 *
 * Purpose: Ensure commands actually execute engines, not just read instructions
 * Version: 1.0.0
 * Created: 2026-01-07
 */

const fs = require('fs');
const path = require('path');

// Lazy load dependencies
let EnhancedPlanSystem, PlanReviewEngine, PlanOptimizer, enhancedExecuteModule, stateManager;

function loadDependencies() {
  if (!EnhancedPlanSystem) {
    try { EnhancedPlanSystem = require('../plan/enhanced-plan.js').EnhancedPlanSystem; } catch (e) { }
  }
  if (!PlanReviewEngine) {
    try { PlanReviewEngine = require('../plan/plan-review-engine.js').PlanReviewEngine; } catch (e) { }
  }
  if (!PlanOptimizer) {
    try { PlanOptimizer = require('../plan/plan-optimizer.js').PlanOptimizer; } catch (e) { }
  }
  if (!enhancedExecuteModule) {
    try { enhancedExecuteModule = require('../execute/enhanced-execute.js'); } catch (e) { }
  }
  if (!stateManager) {
    try { stateManager = require('../state/state-manager.js'); } catch (e) { }
  }
}

class CommandOrchestrator {
  constructor(options = {}) {
    loadDependencies();
    this.options = { threshold: 90, multiModel: true, strictMode: true, ...options };
    this.contextDir = null;
    this.planSystem = null;
    this.reviewEngine = null;
    this.stats = { plansGenerated: 0, stepsExecuted: 0, rollbacks: 0 };
  }

  findContext() {
    if (stateManager?.findActiveContext) {
      this.contextDir = stateManager.findActiveContext();
    }
    return this.contextDir;
  }

  detectTaskType() {
    if (!this.contextDir) this.findContext();
    if (!this.contextDir) return 'feature';
    const contextFile = path.join(this.contextDir, 'context.md');
    if (!fs.existsSync(contextFile)) return 'feature';
    const content = fs.readFileSync(contextFile, 'utf8');
    const match = content.match(/Task Type:\s*(\w+)/i);
    return match ? match[1].toLowerCase() : 'feature';
  }

  async initPlanEngine(options = {}) {
    if (!this.contextDir) this.findContext();
    const opts = { ...this.options, ...options };
    if (EnhancedPlanSystem) {
      this.planSystem = new EnhancedPlanSystem({ contextDir: this.contextDir, threshold: opts.threshold, multiModel: opts.multiModel });
    }
    if (PlanReviewEngine) {
      this.reviewEngine = new PlanReviewEngine({ threshold: opts.threshold });
    }
    return this.planSystem;
  }

  async generatePlan(input) {
    if (!this.planSystem) await this.initPlanEngine();
    let result = this.planSystem ? await this.planSystem.generatePlan(input) : { selectedPlan: null, confidence: 70 };
    let review = this.reviewEngine && result.selectedPlan ? await this.reviewEngine.review(result.selectedPlan) : null;
    this.stats.plansGenerated++;
    return { ...result, review, meetsThreshold: review ? review.overall >= this.options.threshold : true };
  }

  async executeStep(step, context, options = {}) {
    const opts = { autoRollback: true, strictMode: this.options.strictMode, ...options };
    if (enhancedExecuteModule?.enhancedExecute) {
      const result = await enhancedExecuteModule.enhancedExecute(step, context, opts);
      this.stats.stepsExecuted++;
      if (!result.success && result.rolledBack) this.stats.rollbacks++;
      return result;
    }
    return { success: false, errors: ['Enhanced execute engine not available'] };
  }

  async executeSteps(steps, context, options = {}) {
    if (enhancedExecuteModule?.batchExecute) {
      return await enhancedExecuteModule.batchExecute(steps, context, { stopOnFailure: true, ...options });
    }
    const results = [];
    for (const step of steps) {
      const result = await this.executeStep(step, context, options);
      results.push(result);
      if (!result.success) break;
    }
    return { totalSteps: steps.length, successCount: results.filter(r => r.success).length, steps: results };
  }

  loadPlanBoundaries(planFile) {
    if (!fs.existsSync(planFile)) return { allowedFiles: [], allowedMethods: [], newFilesAllowed: [] };
    const content = fs.readFileSync(planFile, 'utf8');
    const files = (content.match(/\*\*File\*\*:\s*`([^`]+)`/g) || []).map(m => m.match(/`([^`]+)`/)?.[1]).filter(Boolean);
    const methods = (content.match(/\*\*Method\*\*:\s*`([^`]+)`/g) || []).map(m => m.match(/`([^`]+)`/)?.[1]).filter(Boolean);
    return { allowedFiles: [...new Set(files)], allowedMethods: [...new Set(methods)], newFilesAllowed: [] };
  }

  checkBoundaries(action, boundaries) {
    if (action.type === 'modify') {
      const allowed = boundaries.allowedFiles.some(f => action.file.includes(f) || f.includes(action.file));
      return { allowed, reason: allowed ? '' : `File "${action.file}" NOT in plan` };
    }
    if (action.type === 'create') {
      const allowed = boundaries.newFilesAllowed.some(f => action.file.includes(f));
      return { allowed, reason: allowed ? '' : `New file "${action.file}" NOT allowed` };
    }
    return { allowed: false, reason: 'Unknown action type' };
  }

  getStatistics() {
    return { ...this.stats, contextDir: this.contextDir };
  }
}

module.exports = { CommandOrchestrator };
