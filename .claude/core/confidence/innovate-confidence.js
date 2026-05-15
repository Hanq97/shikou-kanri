/**
 * Innovate Command Confidence Integration
 *
 * Integrates 7-factor Confidence Engine V2 into /innovate command
 * Threshold: 75% (alternative viability)
 *
 * Version: 1.0.0
 * Created: 2025-12-23
 * Week 2 Command Integration
 */

const fs = require('fs').promises;
const path = require('path');
const ConfidenceEngineV2 = require('./confidence-engine-v2.js');
const ConfidenceHistoryManager = require('./confidence-history-manager.js');

class InnovateConfidence {
  constructor(config = {}) {
    this.config = {
      threshold: 75,  // Lower threshold to allow creative exploration
      minViableAlternatives: 1,
      ...config
    };

    this.confidenceEngine = new ConfidenceEngineV2({
      historyPath: '.claude/memory-bank/dev/confidence-history.json'
    });

    this.historyManager = new ConfidenceHistoryManager();
  }

  /**
   * Calculate confidence for a single alternative
   *
   * @param {Object} params - Parameters
   * @param {Object} params.alternative - Alternative solution
   * @param {Array} params.evidence - Research evidence
   * @param {Array} params.otherAlternatives - Other alternatives for comparison
   * @returns {Promise<Object>} - Confidence result
   */
  async calculateInnovateConfidence({ alternative, evidence, otherAlternatives = [] }) {
    // Innovate-focused weight configuration
    const weights = {
      evidence: 30,          // Evidence supports this approach
      consistency: 20,       // No contradictions with requirements
      complexity: 20,        // Implementation complexity estimate
      expert_confidence: 20, // Expert opinion on approach viability
      context_depth: 10,     // How deep was the research for this alternative
      pattern_match: 0,      // N/A: No concrete patterns yet
      historical_data: 0     // N/A: No historical data for alternatives
    };

    // Calculate confidence
    const confidenceResult = await this.confidenceEngine.calculate({
      id: `innovate-${alternative.name}`,
      alternative: alternative,
      evidence: evidence,
      category: 'innovate',
      threshold: this.config.threshold,
      weights: weights
    }, 'innovate');

    // Add alternative-specific metadata
    confidenceResult.metadata = {
      ...confidenceResult.metadata,
      alternative_name: alternative.name,
      alternative_score: alternative.score || 0,
      comparison_count: otherAlternatives.length
    };

    return confidenceResult;
  }

  /**
   * Generate multiple alternatives with confidence scoring
   *
   * @param {Object} params - Parameters
   * @param {Array} params.evidence - Research evidence
   * @param {number} params.count - Number of alternatives to generate
   * @param {string} params.feature - Feature name
   * @returns {Promise<Object>} - Alternatives with confidence
   */
  async generateAlternatives({ evidence, count = 3, feature }) {
    const alternatives = [];

    // Simulate alternative generation (in real implementation, this would call AI models)
    // For now, return structure showing how confidence would be integrated
    for (let i = 0; i < count; i++) {
      const alternative = {
        id: `alt-${i + 1}`,
        name: `Alternative ${i + 1}`,
        approach: `Approach description for alternative ${i + 1}`,
        pros: [],
        cons: [],
        score: 0
      };

      // Calculate confidence for this alternative
      const confidenceResult = await this.calculateInnovateConfidence({
        alternative: alternative,
        evidence: evidence,
        otherAlternatives: alternatives
      });

      // Attach confidence to alternative
      alternative.confidence = confidenceResult;

      // Log to history
      await this.logConfidence(`/innovate-alt-${i + 1}`, confidenceResult, feature);

      alternatives.push(alternative);
    }

    // Sort by confidence (highest first)
    alternatives.sort((a, b) => b.confidence.overall - a.confidence.overall);

    // Check if at least 1 alternative passes threshold
    const viableAlternatives = alternatives.filter(a => a.confidence.passed);

    if (viableAlternatives.length === 0) {
      return {
        status: 'NO_VIABLE_ALTERNATIVES',
        message: 'All alternatives have confidence <75%. Regenerate with better evidence.',
        alternatives: alternatives,
        recommendations: this.generateInnovateSuggestions(alternatives),
        viable: 0,
        total: alternatives.length
      };
    }

    return {
      status: 'SUCCESS',
      alternatives: alternatives,
      viable: viableAlternatives.length,
      total: alternatives.length,
      recommended: viableAlternatives[0] // Highest confidence
    };
  }

  /**
   * Generate suggestions to improve alternatives
   *
   * @param {Array} alternatives - List of alternatives with confidence
   * @returns {Array} - Recommendations
   */
  generateInnovateSuggestions(alternatives) {
    const suggestions = [];

    // Analyze common weaknesses across alternatives
    const avgFactors = this.calculateAverageFactors(alternatives);

    // Low evidence support
    if (avgFactors.evidence < 75) {
      suggestions.push({
        priority: 'HIGH',
        factor: 'Evidence Support',
        action: 'Gather more research evidence that validates these approaches',
        current: `${avgFactors.evidence}%`,
        target: '≥75%',
        impact: 'Increases confidence in all alternatives'
      });
    }

    // High complexity
    if (avgFactors.complexity < 70) {
      suggestions.push({
        priority: 'MEDIUM',
        factor: 'Complexity',
        action: 'Simplify alternatives or break down into smaller incremental steps',
        current: `${avgFactors.complexity}%`,
        target: '≥70%',
        impact: 'Makes alternatives more feasible'
      });
    }

    // Low expert confidence
    if (avgFactors.expert_confidence < 70) {
      suggestions.push({
        priority: 'HIGH',
        factor: 'Expert Confidence',
        action: 'Consult domain experts or find OSS examples validating these approaches',
        current: `${avgFactors.expert_confidence}%`,
        target: '≥70%',
        impact: 'Validates technical viability'
      });
    }

    // Insufficient research depth
    if (avgFactors.context_depth < 70) {
      suggestions.push({
        priority: 'MEDIUM',
        factor: 'Research Depth',
        action: 'Return to /research phase to gather more comprehensive evidence',
        current: `${avgFactors.context_depth}%`,
        target: '≥70%',
        impact: 'Improves quality of alternatives'
      });
    }

    return suggestions;
  }

  /**
   * Calculate average factors across alternatives
   *
   * @param {Array} alternatives - List of alternatives
   * @returns {Object} - Average factors
   */
  calculateAverageFactors(alternatives) {
    const factorSums = {
      evidence: 0,
      consistency: 0,
      complexity: 0,
      expert_confidence: 0,
      context_depth: 0
    };

    alternatives.forEach(alt => {
      Object.keys(factorSums).forEach(factor => {
        factorSums[factor] += alt.confidence?.factors[factor] || 0;
      });
    });

    const count = alternatives.length;
    return Object.keys(factorSums).reduce((avg, factor) => {
      avg[factor] = Math.round(factorSums[factor] / count);
      return avg;
    }, {});
  }

  /**
   * Get risk level for alternative based on confidence
   *
   * @param {number} confidence - Confidence score
   * @returns {string} - Risk level
   */
  getRiskLevel(confidence) {
    if (confidence >= 85) return 'LOW';
    if (confidence >= 75) return 'MEDIUM';
    if (confidence >= 60) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Get recommendation label for alternative
   *
   * @param {number} confidence - Confidence score
   * @returns {Object} - Label info
   */
  getRecommendationLabel(confidence) {
    const risk = this.getRiskLevel(confidence);

    const labels = {
      'LOW': {
        icon: '⭐',
        label: 'RECOMMENDED',
        selectable: true,
        warning: null
      },
      'MEDIUM': {
        icon: '✓',
        label: 'VIABLE',
        selectable: true,
        warning: null
      },
      'HIGH': {
        icon: '⚠️',
        label: 'RISKY',
        selectable: true,
        warning: 'Selection requires justification and risk mitigation plan'
      },
      'CRITICAL': {
        icon: '❌',
        label: 'NOT RECOMMENDED',
        selectable: false,
        warning: 'Confidence too low - do not select this alternative'
      }
    };

    return {
      risk: risk,
      ...labels[risk]
    };
  }

  /**
   * Format alternatives for user selection UI
   *
   * @param {Array} alternatives - List of alternatives
   * @returns {string} - Formatted UI
   */
  formatAlternativesUI(alternatives) {
    let ui = '\n╔══════════════════════════════════════════════════════════════╗\n';
    ui += '║        ALTERNATIVE EVALUATION - /innovate                    ║\n';
    ui += '╚══════════════════════════════════════════════════════════════╝\n\n';
    ui += `📊 Generated ${alternatives.length} alternatives (sorted by confidence):\n\n`;

    alternatives.forEach((alt, i) => {
      const label = this.getRecommendationLabel(alt.confidence.overall);

      ui += `[${i + 1}] ${label.icon} ${label.label} - ${alt.name}\n`;
      ui += `    Confidence: ${alt.confidence.overall}% (${label.risk} risk)\n`;
      ui += `    ├─ Evidence:         ${alt.confidence.factors.evidence}%  ${this.drawProgressBar(alt.confidence.factors.evidence)}\n`;
      ui += `    ├─ Consistency:      ${alt.confidence.factors.consistency}%  ${this.drawProgressBar(alt.confidence.factors.consistency)}\n`;
      ui += `    ├─ Complexity:       ${alt.confidence.factors.complexity}%  ${this.drawProgressBar(alt.confidence.factors.complexity)}\n`;
      ui += `    ├─ Expert Opinion:   ${alt.confidence.factors.expert_confidence}%  ${this.drawProgressBar(alt.confidence.factors.expert_confidence)}\n`;
      ui += `    └─ Research Depth:   ${alt.confidence.factors.context_depth}%  ${this.drawProgressBar(alt.confidence.factors.context_depth)}\n\n`;

      if (alt.pros?.length > 0) {
        ui += `    Pros: ${alt.pros.join(', ')}\n`;
      }
      if (alt.cons?.length > 0) {
        ui += `    Cons: ${alt.cons.join(', ')}\n`;
      }
      if (label.warning) {
        ui += `    ⚠️  ${label.warning}\n`;
      }
      ui += '\n';
    });

    ui += '─────────────────────────────────────────────────────────────────\n';
    ui += 'Select alternative (1-' + alternatives.length + '): ';

    return ui;
  }

  /**
   * Draw progress bar for factor score
   *
   * @param {number} value - Score (0-100)
   * @returns {string} - Progress bar
   */
  drawProgressBar(value) {
    const width = 20;
    const filled = Math.round((value / 100) * width);
    const empty = width - filled;

    return '█'.repeat(filled) + '░'.repeat(empty);
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
      sub_feature: confidenceResult.metadata?.alternative_name || 'unknown',
      category: 'innovate',
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
        alternative_score: confidenceResult.metadata?.alternative_score || 0,
        comparison_count: confidenceResult.metadata?.comparison_count || 0
      }
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: node innovate-confidence.js <command> [options]

Commands:
  check <alternative-file>                      Check alternative confidence
  generate <evidence-file> <feature> [count]    Generate alternatives with confidence

Examples:
  node innovate-confidence.js check alternative.json
  node innovate-confidence.js generate evidence.json banking 3
    `);
    process.exit(1);
  }

  const command = args[0];
  const innovateConfidence = new InnovateConfidence();

  try {
    if (command === 'check') {
      const altFile = args[1];

      if (!altFile) {
        console.error('❌ Missing alternative file');
        process.exit(1);
      }

      // Load alternative
      const altContent = await fs.readFile(altFile, 'utf-8');
      const alternative = JSON.parse(altContent);

      // Calculate confidence
      const result = await innovateConfidence.calculateInnovateConfidence({
        alternative: alternative,
        evidence: [],
        otherAlternatives: []
      });

      console.log(`\nConfidence: ${result.overall}%`);
      console.log(`Passed: ${result.passed ? '✅ YES' : '❌ NO'}`);
      console.log(`Threshold: ${result.threshold}%\n`);

      const label = innovateConfidence.getRecommendationLabel(result.overall);
      console.log(`Label: ${label.icon} ${label.label} (${label.risk} risk)`);

      if (label.warning) {
        console.log(`Warning: ${label.warning}`);
      }

      console.log('\nFactors:');
      Object.entries(result.factors).forEach(([factor, score]) => {
        console.log(`  ${factor}: ${score}%`);
      });

      process.exit(result.passed ? 0 : 1);

    } else if (command === 'generate') {
      const evidenceFile = args[1];
      const feature = args[2];
      const count = parseInt(args[3]) || 3;

      if (!evidenceFile || !feature) {
        console.error('❌ Missing arguments');
        process.exit(1);
      }

      // Load evidence
      const evidenceContent = await fs.readFile(evidenceFile, 'utf-8');
      const evidence = JSON.parse(evidenceContent);

      // Generate alternatives
      const result = await innovateConfidence.generateAlternatives({
        evidence: evidence,
        count: count,
        feature: feature
      });

      console.log('\n' + innovateConfidence.formatAlternativesUI(result.alternatives));

      if (result.status === 'NO_VIABLE_ALTERNATIVES') {
        console.log('\n💡 Recommendations:');
        result.recommendations.forEach((rec, i) => {
          console.log(`\n  ${i + 1}. [${rec.priority}] ${rec.factor}`);
          console.log(`     Action: ${rec.action}`);
          console.log(`     Impact: ${rec.impact}`);
        });
        process.exit(1);
      }

      console.log(`\n✅ ${result.viable}/${result.total} viable alternatives`);
      console.log(`📌 Recommended: ${result.recommended.name} (${result.recommended.confidence.overall}%)`);
      process.exit(0);

    } else {
      console.error(`❌ Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use in other modules
module.exports = InnovateConfidence;

// Run CLI if called directly
if (require.main === module) {
  main();
}
