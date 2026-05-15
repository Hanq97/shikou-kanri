/**
 * Execute Command Confidence Integration
 *
 * Integrates 7-factor Confidence Engine V2 into /execute command
 * Threshold: 85% (per step), 90% (aggregate)
 *
 * Version: 1.0.0
 * Created: 2025-12-23
 * Week 2 Command Integration
 */

const fs = require('fs').promises;
const path = require('path');
const ConfidenceEngineV2 = require('./confidence-engine-v2.js');
const ConfidenceHistoryManager = require('./confidence-history-manager.js');

class ExecuteConfidence {
  constructor(config = {}) {
    this.config = {
      stepThreshold: 85,  // Per-step confidence threshold
      aggregateThreshold: 90,  // Overall implementation threshold
      maxRetries: 1,  // Max retries per step
      ...config
    };

    this.confidenceEngine = new ConfidenceEngineV2({
      historyPath: '.claude/memory-bank/dev/confidence-history.json'
    });

    this.historyManager = new ConfidenceHistoryManager();
  }

  /**
   * Validate plan confidence before execution
   *
   * @param {Object} plan - Plan object
   * @returns {Promise<Object>} - Validation result
   */
  async validatePlanConfidence(plan) {
    // Load plan confidence from history or calculate
    const planConfidence = plan.confidence || await this.loadPlanConfidence(plan.id);

    if (!planConfidence || planConfidence.overall < this.config.aggregateThreshold) {
      return {
        valid: false,
        confidence: planConfidence?.overall || 0,
        required: this.config.aggregateThreshold,
        message: `Plan confidence ${planConfidence?.overall || 0}% < ${this.config.aggregateThreshold}%. Re-run /plan first.`
      };
    }

    return {
      valid: true,
      confidence: planConfidence.overall,
      message: `Plan confidence ${planConfidence.overall}% meets threshold`
    };
  }

  /**
   * Load plan confidence from history
   *
   * @param {string} planId - Plan ID
   * @returns {Promise<Object|null>} - Confidence data
   */
  async loadPlanConfidence(planId) {
    try {
      const history = await this.historyManager.loadHistory();
      const planEntry = history.entries.find(e =>
        e.command === '/plan' && e.feature === planId
      );
      return planEntry?.confidence || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate confidence for implementation code (per step)
   *
   * @param {Object} params - Parameters
   * @param {Object} params.step - Plan step
   * @param {Object} params.implementation - Implementation code/result
   * @param {Object} params.plan - Full plan
   * @param {Array} params.previousSteps - Previously executed steps
   * @returns {Promise<Object>} - Confidence result
   */
  async calculateCodeConfidence({ step, implementation, plan, previousSteps = [] }) {
    // Execute-focused weight configuration
    const weights = {
      evidence: 10,          // Code matches plan specification
      consistency: 20,       // Code consistent with existing codebase
      complexity: 15,        // Code complexity (simpler is better)
      expert_confidence: 20, // Expert validation of code patterns
      context_depth: 5,      // Research depth for implementation
      pattern_match: 25,     // Uses approved coding patterns (DI, components, etc.)
      historical_data: 5     // Similar code implementations in past
    };

    // Calculate confidence
    const confidenceResult = await this.confidenceEngine.calculate({
      id: `execute-step-${step.id || step.description}`,
      step: step,
      implementation: implementation,
      plan: plan,
      previousSteps: previousSteps,
      category: 'execute',
      threshold: this.config.stepThreshold,
      weights: weights
    }, 'execute');

    // Add implementation-specific metadata
    confidenceResult.metadata = {
      ...confidenceResult.metadata,
      step_id: step.id,
      step_description: step.description,
      files_modified: implementation.files?.length || 0,
      loc_added: implementation.loc_added || 0
    };

    return confidenceResult;
  }

  /**
   * Calculate aggregate confidence across all implemented steps
   *
   * @param {Array} results - Array of step results with confidence
   * @returns {Promise<Object>} - Aggregate confidence
   */
  async calculateAggregateConfidence(results) {
    // Extract confidence scores
    const confidences = results.map(r => r.confidence.overall);

    // Calculate aggregate metrics
    const overall = Math.round(
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    );

    // Calculate factor averages
    const factorAverages = {};
    const factorKeys = Object.keys(results[0].confidence.factors);

    factorKeys.forEach(factor => {
      const values = results.map(r => r.confidence.factors[factor]);
      factorAverages[factor] = Math.round(
        values.reduce((sum, v) => sum + v, 0) / values.length
      );
    });

    // Count flagged steps
    const flaggedCount = results.filter(r => r.flagged).length;
    const retriedCount = results.filter(r => r.retried).length;

    const aggregateResult = {
      overall: overall,
      passed: overall >= this.config.aggregateThreshold,
      threshold: this.config.aggregateThreshold,
      factors: factorAverages,
      metadata: {
        total_steps: results.length,
        flagged_steps: flaggedCount,
        retried_steps: retriedCount,
        min_confidence: Math.min(...confidences),
        max_confidence: Math.max(...confidences)
      }
    };

    return aggregateResult;
  }

  /**
   * Execute plan with confidence validation
   *
   * @param {Object} plan - Plan to execute
   * @returns {Promise<Object>} - Execution result
   */
  async executePlan(plan) {
    // 1. Pre-execution validation: Check plan confidence
    const planValidation = await this.validatePlanConfidence(plan);
    if (!planValidation.valid) {
      return {
        status: 'PLAN_CONFIDENCE_TOO_LOW',
        message: planValidation.message,
        required: planValidation.required,
        actual: planValidation.confidence
      };
    }

    const results = [];

    // 2. During execution: Validate each step
    for (const [index, step] of (plan.detailedSteps || []).entries()) {
      console.log(`\n🔨 Executing step ${index + 1}/${plan.detailedSteps.length}: ${step.description}`);

      // Execute step (in real implementation, this would write code)
      const implementation = await this.executeStep(step);

      // Calculate code confidence for this step
      const codeConfidence = await this.calculateCodeConfidence({
        step: step,
        implementation: implementation,
        plan: plan,
        previousSteps: results
      });

      // Log to history
      await this.logConfidence(`/execute-step-${index + 1}`, codeConfidence, plan.project);

      // Check step confidence threshold (85%)
      if (codeConfidence.overall < this.config.stepThreshold) {
        console.log(`⚠️  Step ${index + 1} confidence ${codeConfidence.overall}% < ${this.config.stepThreshold}%, retrying...`);

        // Retry step with recommendations
        const retryImplementation = await this.retryStepWithSuggestions(
          step,
          codeConfidence.recommendations || this.generateCodeSuggestions(codeConfidence)
        );

        const retryConfidence = await this.calculateCodeConfidence({
          step: step,
          implementation: retryImplementation,
          plan: plan,
          previousSteps: results
        });

        if (retryConfidence.overall < this.config.stepThreshold) {
          // Still low after retry, flag for review
          console.log(`⚠️  Step ${index + 1} still low confidence after retry, flagging for review`);
          results.push({
            step: step,
            implementation: retryImplementation,
            confidence: retryConfidence,
            flagged: true,
            reason: 'Low confidence after retry'
          });
        } else {
          console.log(`✅ Step ${index + 1} passed after retry (${retryConfidence.overall}%)`);
          results.push({
            step: step,
            implementation: retryImplementation,
            confidence: retryConfidence,
            retried: true
          });
        }
      } else {
        console.log(`✅ Step ${index + 1} passed (${codeConfidence.overall}%)`);
        results.push({
          step: step,
          implementation: implementation,
          confidence: codeConfidence
        });
      }
    }

    // 3. Post-execution validation: Aggregate confidence
    const aggregateConfidence = await this.calculateAggregateConfidence(results);

    // Log to history
    await this.logConfidence('/execute', aggregateConfidence, plan.project);

    console.log(`\n📊 Aggregate confidence: ${aggregateConfidence.overall}% (threshold: ${aggregateConfidence.threshold}%)`);

    if (aggregateConfidence.overall < this.config.aggregateThreshold) {
      return {
        status: 'IMPLEMENTATION_CONFIDENCE_LOW',
        message: `Aggregate confidence ${aggregateConfidence.overall}% < ${this.config.aggregateThreshold}%. Review flagged steps.`,
        results: results,
        flagged: results.filter(r => r.flagged),
        confidence: aggregateConfidence
      };
    }

    return {
      status: 'SUCCESS',
      message: `Implementation complete with ${aggregateConfidence.overall}% confidence`,
      results: results,
      confidence: aggregateConfidence
    };
  }

  /**
   * Execute a single step (stub implementation)
   *
   * @param {Object} step - Step to execute
   * @returns {Promise<Object>} - Implementation result
   */
  async executeStep(step) {
    // Stub implementation - in real system, this would write code
    return {
      files: [`src/${step.description.replace(/\s+/g, '_')}.js`],
      loc_added: 50,
      status: 'success'
    };
  }

  /**
   * Retry step with suggestions
   *
   * @param {Object} step - Step to retry
   * @param {Array} recommendations - Recommendations to apply
   * @returns {Promise<Object>} - Retry implementation result
   */
  async retryStepWithSuggestions(step, recommendations) {
    // Stub implementation - apply recommendations and retry
    console.log(`  Applying ${recommendations.length} recommendations...`);
    return this.executeStep(step);
  }

  /**
   * Generate code improvement suggestions
   *
   * @param {Object} confidenceResult - Confidence result
   * @returns {Array} - Recommendations
   */
  generateCodeSuggestions(confidenceResult) {
    const suggestions = [];
    const factors = confidenceResult.factors;

    if (factors.pattern_match < 85) {
      suggestions.push({
        priority: 'HIGH',
        factor: 'Pattern Match',
        action: 'Use approved coding patterns (constructor injection, component composition)',
        impact: 'Improves code quality'
      });
    }

    if (factors.consistency < 85) {
      suggestions.push({
        priority: 'HIGH',
        factor: 'Consistency',
        action: 'Align code style with existing codebase (naming, structure)',
        impact: 'Improves maintainability'
      });
    }

    if (factors.complexity < 75) {
      suggestions.push({
        priority: 'MEDIUM',
        factor: 'Complexity',
        action: 'Simplify code - break down complex functions',
        impact: 'Improves readability'
      });
    }

    return suggestions;
  }

  /**
   * Log confidence result to history
   *
   * @param {string} command - Command name
   * @param {Object} confidenceResult - Confidence result
   * @param {string} feature - Feature name
   */
  async logConfidence(command, confidenceResult, feature) {
    await this.historyManager.addEntry({
      id: `conf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      command: command,
      feature: feature,
      sub_feature: confidenceResult.metadata?.step_description || 'aggregate',
      category: 'execute',
      confidence: {
        overall: confidenceResult.overall,
        factors: confidenceResult.factors,
        passed: confidenceResult.passed,
        threshold: confidenceResult.threshold
      },
      outcome: {
        status: 'pending',
        execution_time: null,
        tokens_used: null,
        quality_score: null
      },
      metadata: {
        step_id: confidenceResult.metadata?.step_id || null,
        files_modified: confidenceResult.metadata?.files_modified || 0,
        loc_added: confidenceResult.metadata?.loc_added || 0
      }
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: node execute-confidence.js <command> [options]

Commands:
  validate-plan <plan-file>     Validate plan confidence before execution
  execute <plan-file>            Execute plan with confidence validation
  check-step <step-file>         Check single step implementation confidence

Examples:
  node execute-confidence.js validate-plan plan.json
  node execute-confidence.js execute plan.json
  node execute-confidence.js check-step step.json
    `);
    process.exit(1);
  }

  const command = args[0];
  const executeConfidence = new ExecuteConfidence();

  try {
    if (command === 'validate-plan') {
      const planFile = args[1];

      if (!planFile) {
        console.error('❌ Missing plan file');
        process.exit(1);
      }

      // Load plan
      const planContent = await fs.readFile(planFile, 'utf-8');
      const plan = JSON.parse(planContent);

      // Validate
      const result = await executeConfidence.validatePlanConfidence(plan);

      console.log(`\nPlan Confidence Validation:`);
      console.log(`Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`Confidence: ${result.confidence}%`);
      console.log(`Required: ${result.required}%`);
      console.log(`Message: ${result.message}`);

      process.exit(result.valid ? 0 : 1);

    } else if (command === 'execute') {
      const planFile = args[1];

      if (!planFile) {
        console.error('❌ Missing plan file');
        process.exit(1);
      }

      // Load plan
      const planContent = await fs.readFile(planFile, 'utf-8');
      const plan = JSON.parse(planContent);

      // Execute
      const result = await executeConfidence.executePlan(plan);

      console.log('\n╔══════════════════════════════════════════════════════════════╗');
      console.log('║           EXECUTION CONFIDENCE RESULT                        ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');

      console.log(`Status: ${result.status}`);
      console.log(`Message: ${result.message}\n`);

      if (result.confidence) {
        console.log(`Aggregate Confidence: ${result.confidence.overall}%`);
        console.log(`Threshold: ${result.confidence.threshold}%`);
        console.log(`\nSteps:`);
        console.log(`  Total: ${result.confidence.metadata.total_steps}`);
        console.log(`  Flagged: ${result.confidence.metadata.flagged_steps}`);
        console.log(`  Retried: ${result.confidence.metadata.retried_steps}`);
      }

      if (result.flagged && result.flagged.length > 0) {
        console.log(`\n⚠️  Flagged Steps (${result.flagged.length}):`);
        result.flagged.forEach((s, i) => {
          console.log(`  ${i + 1}. ${s.step.description} - ${s.reason}`);
        });
      }

      process.exit(result.status === 'SUCCESS' ? 0 : 1);

    } else if (command === 'check-step') {
      const stepFile = args[1];

      if (!stepFile) {
        console.error('❌ Missing step file');
        process.exit(1);
      }

      // Load step
      const stepContent = await fs.readFile(stepFile, 'utf-8');
      const stepData = JSON.parse(stepContent);

      // Calculate confidence
      const result = await executeConfidence.calculateCodeConfidence({
        step: stepData.step,
        implementation: stepData.implementation,
        plan: {},
        previousSteps: []
      });

      console.log(`\nStep Confidence: ${result.overall}%`);
      console.log(`Passed: ${result.passed ? '✅ YES' : '❌ NO'}`);
      console.log(`Threshold: ${result.threshold}%\n`);

      console.log('Factors:');
      Object.entries(result.factors).forEach(([factor, score]) => {
        console.log(`  ${factor}: ${score}%`);
      });

      process.exit(result.passed ? 0 : 1);

    } else {
      console.error(`❌ Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Export for use in other modules
module.exports = ExecuteConfidence;

// Run CLI if called directly
if (require.main === module) {
  main();
}
