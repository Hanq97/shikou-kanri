/**
 * Research Command Confidence Integration
 *
 * Integrates 7-factor Confidence Engine V2 into /research command
 * Threshold: 80% (evidence-focused)
 *
 * Version: 1.0.0
 * Created: 2025-12-23
 * Week 2 Command Integration
 */

const fs = require('fs').promises;
const path = require('path');
const ConfidenceEngineV2 = require('./confidence-engine-v2.js');
const ConfidenceHistoryManager = require('./confidence-history-manager.js');

class ResearchConfidence {
  constructor(config = {}) {
    this.config = {
      threshold: 80,  // Lower threshold for exploratory research
      category: 'research',
      ...config
    };

    this.confidenceEngine = new ConfidenceEngineV2({
      historyPath: '.claude/memory-bank/dev/confidence-history.json'
    });

    this.historyManager = new ConfidenceHistoryManager();
  }

  /**
   * Calculate confidence for research evidence collection
   *
   * @param {Object} research - Research data
   * @param {Array} research.evidence - Evidence pieces collected
   * @param {Array} research.requirements - Extracted requirements
   * @param {string} research.feature - Feature name
   * @param {string} research.phase - Research phase (SRS/BD/DD)
   * @returns {Promise<Object>} - Confidence result
   */
  async calculateResearchConfidence(research) {
    const { evidence = [], requirements = [], feature, phase } = research;

    // Evidence-focused weight configuration for research
    const weights = {
      evidence: 70,          // PRIMARY: Quality of evidence sources
      consistency: 20,       // Terminology consistency across evidence
      complexity: 10,        // Research task complexity
      expert_confidence: 0,  // N/A: No expert consultation in research
      context_depth: 0,      // N/A: Not applicable for research phase
      pattern_match: 0,      // N/A: No patterns to match in research
      historical_data: 0     // N/A: No historical data for research
    };

    // Calculate confidence
    const confidenceResult = await this.confidenceEngine.calculate({
      id: `research-${feature}-${phase}`,
      evidence: evidence,
      requirements: requirements,
      category: 'research',
      threshold: this.config.threshold,
      weights: weights
    }, 'research');

    // Generate research-specific recommendations
    if (!confidenceResult.passed) {
      confidenceResult.recommendations = this.generateResearchSuggestions(confidenceResult);
    }

    return confidenceResult;
  }

  /**
   * Generate actionable research improvement suggestions
   *
   * @param {Object} confidenceResult - Confidence calculation result
   * @returns {Array} - List of recommendations
   */
  generateResearchSuggestions(confidenceResult) {
    const suggestions = [];
    const factors = confidenceResult.factors;

    // Low evidence score
    if (factors.evidence < 80) {
      const evidenceGap = 80 - factors.evidence;
      const impact = this.calculateImpact('evidence', evidenceGap, confidenceResult);

      suggestions.push({
        priority: 'HIGH',
        factor: 'Evidence Quality',
        action: 'Add official documentation sources (Spring Boot Docs, Next.js Docs, PostgreSQL Manual)',
        current: `${factors.evidence}%`,
        target: '≥80%',
        impact: `+${impact}%`
      });
    }

    // Low consistency score
    if (factors.consistency < 80) {
      const consistencyGap = 80 - factors.consistency;
      const impact = this.calculateImpact('consistency', consistencyGap, confidenceResult);

      suggestions.push({
        priority: 'MEDIUM',
        factor: 'Consistency',
        action: 'Standardize terminology across evidence pieces (create glossary)',
        current: `${factors.consistency}%`,
        target: '≥80%',
        impact: `+${impact}%`
      });
    }

    // High complexity
    if (factors.complexity < 70) {
      const complexityGap = 70 - factors.complexity;
      const impact = this.calculateImpact('complexity', complexityGap, confidenceResult);

      suggestions.push({
        priority: 'LOW',
        factor: 'Complexity',
        action: 'Break down complex research into smaller focused areas',
        current: `${factors.complexity}%`,
        target: '≥70%',
        impact: `+${impact}%`
      });
    }

    // Insufficient evidence count
    if (confidenceResult.metadata?.evidence_count < 3) {
      suggestions.push({
        priority: 'CRITICAL',
        factor: 'Evidence Count',
        action: `Add ${3 - confidenceResult.metadata.evidence_count} more evidence pieces (minimum 3 required)`,
        current: `${confidenceResult.metadata.evidence_count} pieces`,
        target: '≥3 pieces',
        impact: '+significant'
      });
    }

    return suggestions;
  }

  /**
   * Calculate impact of improving a factor
   *
   * @param {string} factor - Factor name
   * @param {number} improvement - Points to improve
   * @param {Object} confidenceResult - Current confidence result
   * @returns {number} - Overall confidence impact
   */
  calculateImpact(factor, improvement, confidenceResult) {
    const weights = {
      evidence: 70,
      consistency: 20,
      complexity: 10
    };

    const weight = weights[factor] || 0;
    return Math.round((improvement * weight) / 100);
  }

  /**
   * Validate research completion and transition to next phase
   *
   * @param {Object} evidence - Collected evidence
   * @param {string} feature - Feature name
   * @param {string} phase - Research phase
   * @returns {Promise<Object>} - Validation result
   */
  async completeResearch(evidence, feature, phase) {
    // Validate evidence structure
    const validEvidence = this.validateEvidence(evidence);

    // Calculate confidence
    const confidenceResult = await this.calculateResearchConfidence({
      evidence: validEvidence,
      requirements: this.extractRequirements(validEvidence),
      feature: feature,
      phase: phase
    });

    // Log to history
    await this.logConfidence('/research', confidenceResult, feature, phase);

    // Check threshold
    if (!confidenceResult.passed) {
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        confidence: confidenceResult.overall,
        threshold: confidenceResult.threshold,
        message: `Evidence confidence ${confidenceResult.overall}% < ${confidenceResult.threshold}%`,
        recommendations: confidenceResult.recommendations,
        current: validEvidence.length,
        required: Math.ceil(validEvidence.length * 1.3), // Suggest 30% more evidence
        factors: confidenceResult.factors
      };
    }

    // Success - allow transition to INNOVATE
    return {
      status: 'SUCCESS',
      confidence: confidenceResult.overall,
      threshold: confidenceResult.threshold,
      evidence: validEvidence,
      message: `Research complete with ${confidenceResult.overall}% confidence`,
      next_phase: 'INNOVATE'
    };
  }

  /**
   * Validate evidence structure and quality
   *
   * @param {Array} evidence - Evidence array
   * @returns {Array} - Validated evidence
   */
  validateEvidence(evidence) {
    if (!Array.isArray(evidence)) {
      throw new Error('Evidence must be an array');
    }

    return evidence.filter(item => {
      // Must have source and content
      if (!item.source || !item.content) {
        return false;
      }

      // Must have quality score
      if (typeof item.quality !== 'number' || item.quality < 0 || item.quality > 100) {
        return false;
      }

      return true;
    });
  }

  /**
   * Extract requirements from evidence
   *
   * @param {Array} evidence - Evidence array
   * @returns {Array} - Extracted requirements
   */
  extractRequirements(evidence) {
    const requirements = [];

    evidence.forEach(item => {
      if (item.requirements && Array.isArray(item.requirements)) {
        requirements.push(...item.requirements);
      }
    });

    return requirements;
  }

  /**
   * Log confidence result to history
   *
   * @param {string} command - Command name
   * @param {Object} confidenceResult - Confidence result
   * @param {string} feature - Feature name
   * @param {string} phase - Research phase
   */
  async logConfidence(command, confidenceResult, feature, phase) {
    await this.historyManager.addEntry({
      id: `conf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      command: command,
      feature: feature,
      sub_feature: phase,
      category: 'research',
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
        evidence_count: confidenceResult.metadata?.evidence_count || 0,
        avg_quality: confidenceResult.metadata?.avg_quality || 0,
        phase: phase
      }
    });
  }

  /**
   * Get risk level based on confidence score
   *
   * @param {number} confidence - Confidence score
   * @returns {string} - Risk level
   */
  getRiskLevel(confidence) {
    if (confidence >= 80) return 'LOW';
    if (confidence >= 70) return 'MEDIUM';
    if (confidence >= 60) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Get action based on confidence and risk level
   *
   * @param {number} confidence - Confidence score
   * @returns {Object} - Action recommendation
   */
  getAction(confidence) {
    const risk = this.getRiskLevel(confidence);

    const actions = {
      'LOW': {
        allow: true,
        message: '✅ Allow transition to /innovate',
        warning: null
      },
      'MEDIUM': {
        allow: true,
        message: '⚠️  Allow with warning, recommend more evidence',
        warning: 'Consider adding 1-2 more high-quality evidence pieces'
      },
      'HIGH': {
        allow: false,
        message: '❌ Block transition, require 2+ more evidence pieces',
        warning: 'Evidence quality or quantity is insufficient'
      },
      'CRITICAL': {
        allow: false,
        message: '❌ Block transition, require restart with better sources',
        warning: 'Evidence is critically insufficient - restart research with official documentation'
      }
    };

    return {
      risk: risk,
      ...actions[risk]
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: node research-confidence.js <command> [options]

Commands:
  validate <evidence-file> <feature> <phase>   Validate research evidence
  check <evidence-file>                        Check evidence confidence only

Examples:
  node research-confidence.js validate evidence.json banking SRS
  node research-confidence.js check evidence.json
    `);
    process.exit(1);
  }

  const command = args[0];
  const researchConfidence = new ResearchConfidence();

  try {
    if (command === 'validate') {
      const evidenceFile = args[1];
      const feature = args[2];
      const phase = args[3];

      if (!evidenceFile || !feature || !phase) {
        console.error('❌ Missing arguments for validate command');
        process.exit(1);
      }

      // Load evidence
      const evidenceContent = await fs.readFile(evidenceFile, 'utf-8');
      const evidence = JSON.parse(evidenceContent);

      // Validate
      const result = await researchConfidence.completeResearch(evidence, feature, phase);

      console.log('\n╔══════════════════════════════════════════════════════════════╗');
      console.log('║           RESEARCH CONFIDENCE VALIDATION RESULT              ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');

      console.log(`Status: ${result.status}`);
      console.log(`Confidence: ${result.confidence}%`);
      console.log(`Threshold: ${result.threshold}%`);
      console.log(`Message: ${result.message}\n`);

      if (result.status === 'SUCCESS') {
        console.log(`✅ Next Phase: ${result.next_phase}`);
      } else {
        console.log(`\n📊 Factor Breakdown:`);
        Object.entries(result.factors).forEach(([factor, score]) => {
          console.log(`  ${factor}: ${score}%`);
        });

        console.log(`\n💡 Recommendations (${result.recommendations.length}):`);
        result.recommendations.forEach((rec, i) => {
          console.log(`\n  ${i + 1}. [${rec.priority}] ${rec.factor}`);
          console.log(`     Action: ${rec.action}`);
          console.log(`     Impact: ${rec.impact}`);
        });
      }

      process.exit(result.status === 'SUCCESS' ? 0 : 1);

    } else if (command === 'check') {
      const evidenceFile = args[1];

      if (!evidenceFile) {
        console.error('❌ Missing evidence file');
        process.exit(1);
      }

      // Load evidence
      const evidenceContent = await fs.readFile(evidenceFile, 'utf-8');
      const evidence = JSON.parse(evidenceContent);

      // Calculate confidence
      const result = await researchConfidence.calculateResearchConfidence({
        evidence: evidence,
        requirements: [],
        feature: 'unknown',
        phase: 'unknown'
      });

      console.log(`\nConfidence: ${result.overall}%`);
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
    process.exit(1);
  }
}

// Export for use in other modules
module.exports = ResearchConfidence;

// Run CLI if called directly
if (require.main === module) {
  main();
}
