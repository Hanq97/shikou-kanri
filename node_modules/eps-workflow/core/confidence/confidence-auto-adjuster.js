#!/usr/bin/env node

/**
 * Confidence Auto-Adjuster
 *
 * Automatically adjusts confidence engine weights based on historical accuracy.
 * Uses correlation analysis to identify which factors predict success.
 *
 * Features:
 * - Calculate correlations between factors and success outcomes
 * - Adjust weights by max ±5% per adjustment cycle
 * - Save adjusted weights to configuration file
 * - Track adjustment history for analysis
 * - Provide adjustment recommendations
 *
 * Correlation Logic:
 * - Correlation > 0.8: Increase weight by +5%
 * - Correlation < 0.3: Decrease weight by -5%
 * - Normalize weights to sum to 100%
 *
 * @version 1.0.0
 * @author EPS Framework Team
 * @date 2025-12-22
 */

const ConfidenceHistoryManager = require('./confidence-history-manager.js');
const fs = require('fs').promises;
const path = require('path');

class ConfidenceAutoAdjuster {
  constructor(config = {}) {
    this.config = {
      maxAdjustment: 5,            // Max weight adjustment per cycle (±5%)
      highCorrelation: 0.8,        // Threshold for increasing weight
      lowCorrelation: 0.3,         // Threshold for decreasing weight
      minHistorySize: 10,          // Minimum history entries for adjustment
      adjustmentCooldown: 7,       // Days between adjustments
      ...config
    };

    this.historyManager = new ConfidenceHistoryManager();
    this.weightsPath = path.join(
      process.cwd(),
      '.claude',
      'config',
      'confidence-weights.json'
    );
    this.adjustmentHistoryPath = path.join(
      process.cwd(),
      '.claude',
      'config',
      'adjustment-history.json'
    );
  }

  /**
   * Adjust weights for a specific category based on historical accuracy
   * @param {string} category - Category name (backend/frontend/database/integration)
   * @returns {object} - Adjustment recommendations
   */
  async adjustWeights(category = 'general') {
    console.log(`\n=== Adjusting Weights for Category: ${category} ===\n`);

    // Get history filtered by category
    const history = await this.getHistory(category);

    if (history.length < this.config.minHistorySize) {
      console.log(`Insufficient history (${history.length}/${this.config.minHistorySize}). No adjustments made.`);
      return {
        adjusted: false,
        reason: 'insufficient_history',
        history_size: history.length,
        required_size: this.config.minHistorySize
      };
    }

    // Check cooldown period
    const lastAdjustment = await this.getLastAdjustment(category);
    if (lastAdjustment && !this.canAdjust(lastAdjustment.timestamp)) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastAdjustment.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`Cooldown active (${daysSince}/${this.config.adjustmentCooldown} days). No adjustments made.`);
      return {
        adjusted: false,
        reason: 'cooldown_active',
        days_since_last: daysSince,
        cooldown_period: this.config.adjustmentCooldown
      };
    }

    // Calculate correlations between factors and success
    const correlations = this.calculateCorrelations(history);

    console.log('Factor Correlations with Success:');
    for (const [factor, corr] of Object.entries(correlations)) {
      console.log(`  ${factor}: ${corr.toFixed(3)}`);
    }

    // Calculate weight adjustments
    const adjustments = {};
    for (const [factor, correlation] of Object.entries(correlations)) {
      if (correlation > this.config.highCorrelation) {
        adjustments[factor] = this.config.maxAdjustment; // +5%
        console.log(`  → Increase ${factor} weight by +${this.config.maxAdjustment}% (high correlation)`);

      } else if (correlation < this.config.lowCorrelation) {
        adjustments[factor] = -this.config.maxAdjustment; // -5%
        console.log(`  → Decrease ${factor} weight by -${this.config.maxAdjustment}% (low correlation)`);

      } else {
        adjustments[factor] = 0; // No change
      }
    }

    // Apply adjustments and normalize
    const result = await this.applyAdjustments(adjustments, category);

    // Record adjustment
    await this.recordAdjustment({
      category: category,
      timestamp: new Date().toISOString(),
      correlations: correlations,
      adjustments: adjustments,
      new_weights: result.weights,
      history_size: history.length
    });

    console.log('\n✅ Weights adjusted successfully');

    return result;
  }

  /**
   * Calculate correlations between factors and success outcomes
   * Uses Pearson correlation coefficient
   * @param {Array} history - History entries
   * @returns {object} - Correlations for each factor
   */
  calculateCorrelations(history) {
    const factorNames = [
      'evidence', 'consistency', 'complexity', 'expert_confidence',
      'context_depth', 'pattern_match', 'historical_data'
    ];

    const correlations = {};

    for (const factor of factorNames) {
      // Extract factor scores and outcomes
      const data = history
        .filter(h => {
          const hasFactorScore = h.confidence?.factors?.[factor] !== undefined;
          const hasOutcome = h.outcome?.status && h.outcome.status !== 'pending';
          return hasFactorScore && hasOutcome;
        })
        .map(h => ({
          score: h.confidence.factors[factor],
          success: h.outcome.status === 'success' ? 1 : 0
        }));

      if (data.length < 5) {
        correlations[factor] = 0.5; // Neutral if insufficient data
        continue;
      }

      // Calculate Pearson correlation
      correlations[factor] = this.pearsonCorrelation(
        data.map(d => d.score),
        data.map(d => d.success)
      );
    }

    return correlations;
  }

  /**
   * Calculate Pearson correlation coefficient
   * @param {Array} x - First variable array
   * @param {Array} y - Second variable array
   * @returns {number} - Correlation (-1 to 1)
   */
  pearsonCorrelation(x, y) {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    if (denominator === 0) return 0;

    return Math.max(-1, Math.min(1, numerator / denominator));
  }

  /**
   * Apply adjustments to weights and save to config
   * @param {object} adjustments - Weight adjustments
   * @param {string} category - Category name
   * @returns {object} - Result with new weights
   */
  async applyAdjustments(adjustments, category) {
    // Load current weights or use defaults
    let config = await this.loadWeights();

    // Get current weights for category
    const currentWeights = config.categoryWeights?.[category] || config.baseWeights;

    // Apply adjustments
    const newWeights = { ...currentWeights };
    for (const [factor, adjustment] of Object.entries(adjustments)) {
      const currentWeight = newWeights[factor] || 0;
      newWeights[factor] = currentWeight + adjustment;
    }

    // Normalize to sum to 100
    const sum = Object.values(newWeights).reduce((a, b) => a + b, 0);
    const normalized = {};
    for (const [factor, weight] of Object.entries(newWeights)) {
      normalized[factor] = Math.round((weight / sum) * 100);
    }

    // Final adjustment to ensure exactly 100
    const finalSum = Object.values(normalized).reduce((a, b) => a + b, 0);
    if (finalSum !== 100) {
      const diff = 100 - finalSum;
      // Add difference to largest weight
      const largest = Object.keys(normalized).reduce((a, b) =>
        normalized[a] > normalized[b] ? a : b
      );
      normalized[largest] += diff;
    }

    // Update config
    if (!config.categoryWeights) config.categoryWeights = {};
    config.categoryWeights[category] = normalized;
    config.last_updated = new Date().toISOString();
    config.last_adjustment = {
      category: category,
      timestamp: new Date().toISOString(),
      previous_weights: currentWeights,
      adjustments: adjustments
    };

    // Save to file
    await this.saveWeights(config);

    console.log('\nNew Weights (Normalized to 100):');
    for (const [factor, weight] of Object.entries(normalized)) {
      const change = weight - (currentWeights[factor] || 0);
      const changeStr = change > 0 ? `+${change}` : change.toString();
      console.log(`  ${factor}: ${weight}% (${changeStr})`);
    }

    return {
      adjusted: true,
      category: category,
      weights: normalized,
      previous_weights: currentWeights,
      adjustments: adjustments
    };
  }

  /**
   * Load weights configuration
   * @returns {object} - Weights config
   */
  async loadWeights() {
    try {
      const content = await fs.readFile(this.weightsPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      // Return default configuration
      return {
        version: '1.0',
        last_updated: new Date().toISOString(),
        baseWeights: {
          evidence: 15,
          consistency: 15,
          complexity_score: 20,
          expert_confidence: 20,
          context_depth: 10,
          pattern_match: 15,
          historical_data: 5
        },
        categoryWeights: {}
      };
    }
  }

  /**
   * Save weights configuration
   * @param {object} config - Weights config
   */
  async saveWeights(config) {
    const dir = path.dirname(this.weightsPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(
      this.weightsPath,
      JSON.stringify(config, null, 2),
      'utf8'
    );

    console.log(`\n✅ Weights saved: ${this.weightsPath}`);
  }

  /**
   * Get history filtered by category
   * @param {string} category - Category name
   * @returns {Array} - Filtered history entries
   */
  async getHistory(category) {
    const history = await this.historyManager.loadHistory();

    if (category === 'general') {
      return history.history;
    }

    return history.history.filter(h => h.category === category);
  }

  /**
   * Get last adjustment for category
   * @param {string} category - Category name
   * @returns {object|null} - Last adjustment or null
   */
  async getLastAdjustment(category) {
    try {
      const content = await fs.readFile(this.adjustmentHistoryPath, 'utf8');
      const adjustments = JSON.parse(content);

      const categoryAdjustments = adjustments.history.filter(a =>
        a.category === category
      );

      if (categoryAdjustments.length === 0) return null;

      return categoryAdjustments[categoryAdjustments.length - 1];
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if adjustment is allowed (cooldown expired)
   * @param {string} lastTimestamp - Last adjustment timestamp
   * @returns {boolean} - True if can adjust
   */
  canAdjust(lastTimestamp) {
    const daysSince = (Date.now() - new Date(lastTimestamp).getTime()) /
                     (1000 * 60 * 60 * 24);
    return daysSince >= this.config.adjustmentCooldown;
  }

  /**
   * Record adjustment to history
   * @param {object} adjustment - Adjustment record
   */
  async recordAdjustment(adjustment) {
    let adjustments = {
      version: '1.0',
      last_updated: new Date().toISOString(),
      history: []
    };

    try {
      const content = await fs.readFile(this.adjustmentHistoryPath, 'utf8');
      adjustments = JSON.parse(content);
    } catch (error) {
      // File doesn't exist, use default
    }

    adjustments.history.push(adjustment);
    adjustments.last_updated = new Date().toISOString();

    const dir = path.dirname(this.adjustmentHistoryPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(
      this.adjustmentHistoryPath,
      JSON.stringify(adjustments, null, 2),
      'utf8'
    );
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const adjuster = new ConfidenceAutoAdjuster();

  (async () => {
    try {
      if (command === 'adjust') {
        const category = args[1] || 'backend';
        const result = await adjuster.adjustWeights(category);

        console.log('\n=== Adjustment Result ===');
        console.log(JSON.stringify(result, null, 2));

      } else if (command === 'show') {
        const category = args[1] || 'backend';
        const config = await adjuster.loadWeights();
        const weights = config.categoryWeights?.[category] || config.baseWeights;

        console.log(`\n=== Current Weights (${category}) ===\n`);
        for (const [factor, weight] of Object.entries(weights)) {
          console.log(`  ${factor}: ${weight}%`);
        }

        console.log(`\nLast Updated: ${config.last_updated}`);

      } else if (command === 'history') {
        const category = args[1];

        try {
          const content = await fs.readFile(adjuster.adjustmentHistoryPath, 'utf8');
          const adjustments = JSON.parse(content);

          let filtered = adjustments.history;
          if (category) {
            filtered = filtered.filter(a => a.category === category);
          }

          console.log('\n=== Adjustment History ===\n');
          filtered.slice(-5).forEach((adj, i) => {
            console.log(`${i + 1}. ${adj.category} - ${adj.timestamp}`);
            console.log(`   History Size: ${adj.history_size}`);
            console.log(`   Adjustments:`);
            for (const [factor, change] of Object.entries(adj.adjustments)) {
              if (change !== 0) {
                console.log(`     ${factor}: ${change > 0 ? '+' : ''}${change}%`);
              }
            }
            console.log();
          });
        } catch (error) {
          console.log('No adjustment history found.');
        }

      } else {
        console.log('Confidence Auto-Adjuster');
        console.log('\nUsage:');
        console.log('  node confidence-auto-adjuster.js adjust <category>');
        console.log('  node confidence-auto-adjuster.js show <category>');
        console.log('  node confidence-auto-adjuster.js history [category]');
        console.log('\nExamples:');
        console.log('  node confidence-auto-adjuster.js adjust backend');
        console.log('  node confidence-auto-adjuster.js show frontend');
        console.log('  node confidence-auto-adjuster.js history backend');
        console.log('\nDescription:');
        console.log('  adjust  - Adjust weights based on historical accuracy');
        console.log('  show    - Display current weights for a category');
        console.log('  history - Show adjustment history');
      }
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  })();
}

module.exports = ConfidenceAutoAdjuster;
