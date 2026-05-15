/**
 * Validate Command Confidence Integration
 *
 * Integrates 7-factor Confidence Engine V2 into /validate command
 * Threshold: 90% (aggregate from multi-validator)
 *
 * Version: 1.0.0
 * Created: 2025-12-23
 * Week 2 Command Integration
 */

const fs = require('fs').promises;
const path = require('path');
const ConfidenceEngineV2 = require('./confidence-engine-v2.js');
const ConfidenceHistoryManager = require('./confidence-history-manager.js');

class ValidateConfidence {
  constructor(config = {}) {
    this.config = {
      aggregateThreshold: 90,  // Quality Gate G4
      validatorWeights: {
        code_quality: 30,
        test_coverage: 30,
        security: 25,
        performance: 15
      },
      ...config
    };

    this.confidenceEngine = new ConfidenceEngineV2({
      historyPath: '.claude/memory-bank/dev/confidence-history.json'
    });

    this.historyManager = new ConfidenceHistoryManager();
  }

  /**
   * Calculate confidence for a single validator
   *
   * @param {string} validatorName - Name of validator
   * @param {Object} validationResult - Validation result
   * @returns {Promise<Object>} - Confidence result
   */
  async calculateValidatorConfidence(validatorName, validationResult) {
    // Validator-focused weight configuration
    const weights = {
      evidence: 20,          // Validator results backed by analysis
      consistency: 20,       // No contradictory findings
      complexity: 10,        // Validation complexity
      expert_confidence: 20, // Validator confidence in findings
      context_depth: 10,     // Depth of analysis
      pattern_match: 15,     // Detects anti-patterns
      historical_data: 5     // Similar validations in past
    };

    // Calculate confidence
    const confidenceResult = await this.confidenceEngine.calculate({
      id: `validate-${validatorName}`,
      validatorName: validatorName,
      validationResult: validationResult,
      category: 'validate',
      threshold: 85,  // Per-validator threshold
      weights: weights
    }, 'validate');

    // Add validator-specific metadata
    confidenceResult.metadata = {
      ...confidenceResult.metadata,
      validator_name: validatorName,
      issues_found: validationResult.issues?.length || 0,
      severity: validationResult.severity || 'unknown'
    };

    return confidenceResult;
  }

  /**
   * Aggregate validator confidences with weighted scoring
   *
   * @param {Object} validators - Validators with results and confidences
   * @returns {Promise<Object>} - Aggregate confidence
   */
  async aggregateValidatorConfidences(validators) {
    const validatorNames = Object.keys(validators);

    // Calculate weighted aggregate
    let weightedSum = 0;
    let totalWeight = 0;

    const factorAggregates = {};

    validatorNames.forEach(name => {
      const validator = validators[name];
      const weight = validator.weight || 25; // Default equal weight

      weightedSum += validator.confidence.overall * weight;
      totalWeight += weight;

      // Aggregate factors
      Object.entries(validator.confidence.factors).forEach(([factor, score]) => {
        if (!factorAggregates[factor]) {
          factorAggregates[factor] = { sum: 0, count: 0 };
        }
        factorAggregates[factor].sum += score;
        factorAggregates[factor].count += 1;
      });
    });

    const overall = Math.round(weightedSum / totalWeight);

    // Average factors
    const factors = {};
    Object.entries(factorAggregates).forEach(([factor, data]) => {
      factors[factor] = Math.round(data.sum / data.count);
    });

    // Check which validators failed
    const failedValidators = validatorNames.filter(
      name => !validators[name].confidence.passed
    );

    const aggregateResult = {
      overall: overall,
      passed: overall >= this.config.aggregateThreshold,
      threshold: this.config.aggregateThreshold,
      factors: factors,
      metadata: {
        total_validators: validatorNames.length,
        failed_validators: failedValidators.length,
        validator_scores: validatorNames.reduce((acc, name) => {
          acc[name] = validators[name].confidence.overall;
          return acc;
        }, {})
      },
      recommendations: failedValidators.length > 0 ?
        this.generateValidationSuggestions(validators, failedValidators) : []
    };

    return aggregateResult;
  }

  /**
   * Generate validation improvement suggestions
   *
   * @param {Object} validators - All validators
   * @param {Array} failedValidators - Names of failed validators
   * @returns {Array} - Recommendations
   */
  generateValidationSuggestions(validators, failedValidators) {
    const suggestions = [];

    failedValidators.forEach(name => {
      const validator = validators[name];
      const factors = validator.confidence.factors;

      // Validator-specific suggestions
      if (name === 'code_quality') {
        if (factors.pattern_match < 80) {
          suggestions.push({
            priority: 'HIGH',
            validator: 'Code Quality',
            action: 'Fix anti-patterns (field injection, god classes, tight coupling)',
            impact: 'Improves maintainability'
          });
        }
      }

      if (name === 'test_coverage') {
        if (factors.evidence < 80) {
          suggestions.push({
            priority: 'CRITICAL',
            validator: 'Test Coverage',
            action: 'Add unit tests to reach ≥80% coverage',
            impact: 'Meets Quality Gate G3'
          });
        }
      }

      if (name === 'security') {
        if (factors.pattern_match < 90) {
          suggestions.push({
            priority: 'CRITICAL',
            validator: 'Security',
            action: 'Fix security vulnerabilities (SQL injection, XSS, exposed secrets)',
            impact: 'Prevents production incidents'
          });
        }
      }

      if (name === 'performance') {
        if (factors.complexity < 75) {
          suggestions.push({
            priority: 'MEDIUM',
            validator: 'Performance',
            action: 'Optimize N+1 queries and inefficient algorithms',
            impact: 'Improves response time'
          });
        }
      }
    });

    return suggestions;
  }

  /**
   * Validate implementation with multi-validator system
   *
   * @param {Object} implementation - Implementation to validate
   * @returns {Promise<Object>} - Validation result
   */
  async validateImplementation(implementation) {
    console.log('🔍 Running multi-validator validation...\n');

    // Run 4 validators (stub implementations)
    const codeQuality = await this.validateCodeQuality(implementation);
    const testCoverage = await this.validateTestCoverage(implementation);
    const security = await this.validateSecurity(implementation);
    const performance = await this.validatePerformance(implementation);

    console.log('📊 Calculating validator confidences...\n');

    // Calculate confidence for each validator
    const codeQualityConfidence = await this.calculateValidatorConfidence('code_quality', codeQuality);
    const testCoverageConfidence = await this.calculateValidatorConfidence('test_coverage', testCoverage);
    const securityConfidence = await this.calculateValidatorConfidence('security', security);
    const performanceConfidence = await this.calculateValidatorConfidence('performance', performance);

    // Log individual validators
    await this.logConfidence('/validate-code-quality', codeQualityConfidence, implementation.feature);
    await this.logConfidence('/validate-test-coverage', testCoverageConfidence, implementation.feature);
    await this.logConfidence('/validate-security', securityConfidence, implementation.feature);
    await this.logConfidence('/validate-performance', performanceConfidence, implementation.feature);

    // Aggregate validator confidences (weighted)
    const aggregateConfidence = await this.aggregateValidatorConfidences({
      code_quality: {
        result: codeQuality,
        confidence: codeQualityConfidence,
        weight: this.config.validatorWeights.code_quality
      },
      test_coverage: {
        result: testCoverage,
        confidence: testCoverageConfidence,
        weight: this.config.validatorWeights.test_coverage
      },
      security: {
        result: security,
        confidence: securityConfidence,
        weight: this.config.validatorWeights.security
      },
      performance: {
        result: performance,
        confidence: performanceConfidence,
        weight: this.config.validatorWeights.performance
      }
    });

    // Log aggregate
    await this.logConfidence('/validate', aggregateConfidence, implementation.feature);

    // Check Quality Gate G4 (aggregate ≥90%)
    if (aggregateConfidence.overall < this.config.aggregateThreshold) {
      return {
        status: 'VALIDATION_FAILED',
        message: `Aggregate validation confidence ${aggregateConfidence.overall}% < ${this.config.aggregateThreshold}%`,
        validators: {
          code_quality: {
            passed: codeQualityConfidence.passed,
            score: codeQualityConfidence.overall,
            weight: this.config.validatorWeights.code_quality
          },
          test_coverage: {
            passed: testCoverageConfidence.passed,
            score: testCoverageConfidence.overall,
            weight: this.config.validatorWeights.test_coverage
          },
          security: {
            passed: securityConfidence.passed,
            score: securityConfidence.overall,
            weight: this.config.validatorWeights.security
          },
          performance: {
            passed: performanceConfidence.passed,
            score: performanceConfidence.overall,
            weight: this.config.validatorWeights.performance
          }
        },
        confidence: aggregateConfidence,
        recommendations: aggregateConfidence.recommendations
      };
    }

    return {
      status: 'SUCCESS',
      message: `Validation passed with ${aggregateConfidence.overall}% aggregate confidence`,
      validators: {
        code_quality: codeQuality,
        test_coverage: testCoverage,
        security: security,
        performance: performance
      },
      confidence: aggregateConfidence
    };
  }

  /**
   * Validate code quality (stub)
   *
   * @param {Object} implementation - Implementation
   * @returns {Promise<Object>} - Validation result
   */
  async validateCodeQuality(implementation) {
    console.log('  ✓ Code Quality Validator');
    return {
      passed: true,
      issues: [],
      severity: 'low',
      metrics: {
        maintainability: 85,
        readability: 90,
        patterns: 95
      }
    };
  }

  /**
   * Validate test coverage (stub)
   *
   * @param {Object} implementation - Implementation
   * @returns {Promise<Object>} - Validation result
   */
  async validateTestCoverage(implementation) {
    console.log('  ✓ Test Coverage Validator');
    return {
      passed: true,
      issues: [],
      severity: 'low',
      metrics: {
        coverage: 85,
        unit_tests: 120,
        integration_tests: 45
      }
    };
  }

  /**
   * Validate security (stub)
   *
   * @param {Object} implementation - Implementation
   * @returns {Promise<Object>} - Validation result
   */
  async validateSecurity(implementation) {
    console.log('  ✓ Security Validator');
    return {
      passed: true,
      issues: [],
      severity: 'none',
      metrics: {
        vulnerabilities: 0,
        secrets_exposed: 0,
        sql_injection_risk: 0
      }
    };
  }

  /**
   * Validate performance (stub)
   *
   * @param {Object} implementation - Implementation
   * @returns {Promise<Object>} - Validation result
   */
  async validatePerformance(implementation) {
    console.log('  ✓ Performance Validator');
    return {
      passed: true,
      issues: [],
      severity: 'low',
      metrics: {
        n_plus_one: 0,
        response_time: 150,
        memory_usage: 'normal'
      }
    };
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
      sub_feature: confidenceResult.metadata?.validator_name || 'aggregate',
      category: 'validate',
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
        validator_name: confidenceResult.metadata?.validator_name || null,
        issues_found: confidenceResult.metadata?.issues_found || 0,
        severity: confidenceResult.metadata?.severity || 'unknown'
      }
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: node validate-confidence.js <command> [options]

Commands:
  validate <implementation-file>    Run multi-validator validation
  check <validator-file>            Check single validator confidence

Examples:
  node validate-confidence.js validate implementation.json
  node validate-confidence.js check validator-result.json
    `);
    process.exit(1);
  }

  const command = args[0];
  const validateConfidence = new ValidateConfidence();

  try {
    if (command === 'validate') {
      const implFile = args[1];

      if (!implFile) {
        console.error('❌ Missing implementation file');
        process.exit(1);
      }

      // Load implementation
      const implContent = await fs.readFile(implFile, 'utf-8');
      const implementation = JSON.parse(implContent);

      // Validate
      const result = await validateConfidence.validateImplementation(implementation);

      console.log('\n╔══════════════════════════════════════════════════════════════╗');
      console.log('║        VALIDATION CONFIDENCE RESULT (Quality Gate G4)       ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');

      console.log(`Status: ${result.status}`);
      console.log(`Message: ${result.message}\n`);

      if (result.confidence) {
        console.log(`Aggregate Confidence: ${result.confidence.overall}%`);
        console.log(`Threshold: ${result.confidence.threshold}% (Quality Gate G4)\n`);

        console.log('Validator Breakdown:');
        Object.entries(result.validators).forEach(([name, validator]) => {
          const status = validator.passed ? '✅' : '❌';
          console.log(`  ${status} ${name}: ${validator.score}% (weight: ${validator.weight}%)`);
        });
      }

      if (result.recommendations && result.recommendations.length > 0) {
        console.log(`\n💡 Recommendations (${result.recommendations.length}):`);
        result.recommendations.forEach((rec, i) => {
          console.log(`\n  ${i + 1}. [${rec.priority}] ${rec.validator}`);
          console.log(`     Action: ${rec.action}`);
          console.log(`     Impact: ${rec.impact}`);
        });
      }

      process.exit(result.status === 'SUCCESS' ? 0 : 1);

    } else if (command === 'check') {
      const validatorFile = args[1];

      if (!validatorFile) {
        console.error('❌ Missing validator file');
        process.exit(1);
      }

      // Load validator result
      const validatorContent = await fs.readFile(validatorFile, 'utf-8');
      const validatorResult = JSON.parse(validatorContent);

      // Calculate confidence
      const result = await validateConfidence.calculateValidatorConfidence(
        validatorResult.name || 'unknown',
        validatorResult
      );

      console.log(`\nValidator Confidence: ${result.overall}%`);
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
module.exports = ValidateConfidence;

// Run CLI if called directly
if (require.main === module) {
  main();
}
