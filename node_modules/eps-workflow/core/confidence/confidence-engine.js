#!/usr/bin/env node

/**
 * Confidence Engine - EPS Framework-Inspired Confidence Calculation
 *
 * Implements automated confidence scoring for EPS workflow:
 * - D4 Gate: Design confidence ≥90%
 * - G2 Gate: Plan confidence ≥90%
 *
 * Based on EPS Framework Framework v4.2 confidence mechanism
 */

const fs = require('fs');
const path = require('path');

class ConfidenceEngine {
  constructor() {
    this.baseConfidence = 0.70; // 70% baseline
    this.weights = {
      sourceCredibility: 0.15,      // Quality of evidence sources
      coverageCompleteness: 0.10,   // Solution completeness
      synthesisCoherence: 0.05      // Logical consistency
    };
  }

  /**
   * Calculate confidence score for a given context
   * @param {Object} context - Validation context
   * @returns {Object} Confidence result with score, risk, and breakdown
   */
  calculate(context) {
    const factors = {
      sourceCredibility: this.evaluateEvidence(context.evidence || []),
      coverageCompleteness: this.evaluateCoverage(context.requirements || [], context.implementation || {}),
      synthesisCoherence: this.evaluateLogic(context.plan || '', context.design || {})
    };

    const confidence = this.baseConfidence +
                       factors.sourceCredibility * this.weights.sourceCredibility +
                       factors.coverageCompleteness * this.weights.coverageCompleteness +
                       factors.synthesisCoherence * this.weights.synthesisCoherence;

    const finalScore = Math.min(confidence, 1.0);

    return {
      score: finalScore,
      percentage: Math.round(finalScore * 100),
      risk: this.mapToRisk(finalScore),
      breakdown: {
        baseConfidence: this.baseConfidence,
        factors: factors,
        contributions: {
          sourceCredibility: factors.sourceCredibility * this.weights.sourceCredibility,
          coverageCompleteness: factors.coverageCompleteness * this.weights.coverageCompleteness,
          synthesisCoherence: factors.synthesisCoherence * this.weights.synthesisCoherence
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Map confidence score to risk level
   * @param {number} confidence - Confidence score (0.0-1.0)
   * @returns {string} Risk level
   */
  mapToRisk(confidence) {
    if (confidence >= 0.90) return 'LOW';
    if (confidence >= 0.75) return 'MEDIUM';
    if (confidence >= 0.60) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Evaluate evidence quality and credibility
   * @param {Array} evidence - Evidence pieces
   * @returns {number} Score (0.0-1.0)
   */
  evaluateEvidence(evidence) {
    if (!Array.isArray(evidence) || evidence.length === 0) {
      return 0.0;
    }

    let totalScore = 0;
    let count = 0;

    for (const item of evidence) {
      let itemScore = 0;

      // Source credibility (0.4)
      if (item.source) {
        if (item.source.includes('official') || item.source.includes('documentation')) {
          itemScore += 0.4;
        } else if (item.source.includes('stackoverflow') || item.source.includes('github')) {
          itemScore += 0.3;
        } else {
          itemScore += 0.2;
        }
      }

      // Quality assessment (0.3)
      if (item.quality) {
        if (typeof item.quality === 'number') {
          itemScore += (item.quality / 100) * 0.3;
        } else if (item.quality === 'high') {
          itemScore += 0.3;
        } else if (item.quality === 'medium') {
          itemScore += 0.2;
        } else {
          itemScore += 0.1;
        }
      }

      // Relevance (0.3)
      if (item.relevance) {
        if (typeof item.relevance === 'number') {
          itemScore += (item.relevance / 100) * 0.3;
        } else if (item.relevance === 'high') {
          itemScore += 0.3;
        } else {
          itemScore += 0.15;
        }
      }

      totalScore += itemScore;
      count++;
    }

    // Penalty for insufficient evidence (require ≥3 pieces)
    const quantityScore = Math.min(count / 3, 1.0);
    const qualityScore = count > 0 ? totalScore / count : 0;

    return quantityScore * qualityScore;
  }

  /**
   * Evaluate coverage completeness
   * @param {Array} requirements - Requirements list
   * @param {Object} implementation - Implementation details
   * @returns {number} Score (0.0-1.0)
   */
  evaluateCoverage(requirements, implementation) {
    if (!Array.isArray(requirements) || requirements.length === 0) {
      return 0.0;
    }

    let coveredCount = 0;
    let partialCount = 0;

    for (const req of requirements) {
      const reqId = req.id || req.code || '';
      if (!reqId) continue;

      // Check if requirement is covered in implementation
      if (implementation.covered && Array.isArray(implementation.covered)) {
        if (implementation.covered.includes(reqId)) {
          coveredCount++;
          continue;
        }
      }

      // Check if requirement is mentioned in design documents
      if (implementation.design) {
        const designContent = JSON.stringify(implementation.design).toLowerCase();
        const reqContent = (req.description || req.title || reqId).toLowerCase();
        if (designContent.includes(reqContent)) {
          partialCount++;
        }
      }
    }

    const coverageRatio = (coveredCount + partialCount * 0.5) / requirements.length;
    return coverageRatio;
  }

  /**
   * Evaluate logical coherence and synthesis
   * @param {string} plan - Implementation plan
   * @param {Object} design - Design documents
   * @returns {number} Score (0.0-1.0)
   */
  evaluateLogic(plan, design) {
    let score = 0.5; // Start at 50%

    // Check if plan exists
    if (!plan || plan.length === 0) {
      return 0.0;
    }

    // Check plan completeness (0.3)
    const planSections = [
      'approach', 'strategy', 'implementation',
      'architecture', 'component', 'module',
      'step', 'phase', 'task'
    ];
    const planLower = plan.toLowerCase();
    const sectionsFound = planSections.filter(section => planLower.includes(section)).length;
    score += (sectionsFound / planSections.length) * 0.3;

    // Check design-plan consistency (0.2)
    if (design && typeof design === 'object') {
      const designKeys = Object.keys(design);
      if (designKeys.length > 0) {
        let consistencyCount = 0;
        for (const key of designKeys) {
          const designContent = JSON.stringify(design[key]).toLowerCase();
          if (planLower.includes(key.toLowerCase()) ||
              this.hasOverlap(designContent, planLower)) {
            consistencyCount++;
          }
        }
        score += (consistencyCount / designKeys.length) * 0.2;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Check if two strings have significant overlap
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {boolean} True if significant overlap exists
   */
  hasOverlap(str1, str2) {
    const words1 = str1.split(/\s+/).filter(w => w.length > 4);
    const words2 = str2.split(/\s+/).filter(w => w.length > 4);

    if (words1.length === 0 || words2.length === 0) return false;

    let matchCount = 0;
    for (const word of words1) {
      if (words2.includes(word)) {
        matchCount++;
      }
    }

    return matchCount / Math.min(words1.length, words2.length) > 0.1;
  }

  /**
   * Load context from file system
   * @param {string} contextPath - Path to context directory
   * @returns {Object} Context object
   */
  loadContext(contextPath) {
    const context = {
      evidence: [],
      requirements: [],
      implementation: {},
      plan: '',
      design: {}
    };

    try {
      // Load evidence files
      const evidencePath = path.join(contextPath, 'evidence');
      if (fs.existsSync(evidencePath)) {
        const evidenceFiles = fs.readdirSync(evidencePath).filter(f => f.endsWith('.md'));
        for (const file of evidenceFiles) {
          const content = fs.readFileSync(path.join(evidencePath, file), 'utf8');
          context.evidence.push({
            source: file,
            content: content,
            quality: this.assessEvidenceQuality(content),
            relevance: 'high'
          });
        }
      }

      // Load SRS for requirements
      const srsPath = path.join(contextPath, 'docs/SRS.md');
      if (fs.existsSync(srsPath)) {
        const srsContent = fs.readFileSync(srsPath, 'utf8');
        context.requirements = this.extractRequirements(srsContent);
        context.design.srs = srsContent;
      }

      // Load Basic Design
      const bdPath = path.join(contextPath, 'docs/BD.md');
      if (fs.existsSync(bdPath)) {
        context.design.bd = fs.readFileSync(bdPath, 'utf8');
      }

      // Load Detail Design
      const ddPath = path.join(contextPath, 'docs/DD.md');
      if (fs.existsSync(ddPath)) {
        context.design.dd = fs.readFileSync(ddPath, 'utf8');
      }

      // Load plan
      const planPath = path.join(contextPath, 'docs/PLAN.md');
      if (fs.existsSync(planPath)) {
        context.plan = fs.readFileSync(planPath, 'utf8');
      }

    } catch (error) {
      console.error('Error loading context:', error.message);
    }

    return context;
  }

  /**
   * Assess evidence quality based on content
   * @param {string} content - Evidence content
   * @returns {number} Quality score (0-100)
   */
  assessEvidenceQuality(content) {
    let score = 50; // Base score

    // Length check (minimum content)
    if (content.length > 500) score += 10;
    if (content.length > 1000) score += 10;

    // Structure check (headers, lists)
    if (content.includes('##')) score += 10;
    if (content.includes('- ') || content.includes('* ')) score += 5;

    // Technical content check
    const technicalTerms = ['api', 'database', 'service', 'component', 'architecture', 'security'];
    const contentLower = content.toLowerCase();
    const termsFound = technicalTerms.filter(term => contentLower.includes(term)).length;
    score += termsFound * 3;

    return Math.min(score, 100);
  }

  /**
   * Extract requirements from SRS content
   * @param {string} srsContent - SRS markdown content
   * @returns {Array} Requirements array
   */
  extractRequirements(srsContent) {
    const requirements = [];
    const lines = srsContent.split('\n');

    for (const line of lines) {
      // Match patterns like "BR-001:", "FR-001:", "NFR-001:"
      const match = line.match(/^(BR|FR|NFR|UC)-(\d+):/i);
      if (match) {
        const reqId = `${match[1].toUpperCase()}-${match[2]}`;
        const description = line.substring(match[0].length).trim();
        requirements.push({
          id: reqId,
          type: match[1].toUpperCase(),
          description: description
        });
      }
    }

    return requirements;
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const engine = new ConfidenceEngine();

  if (command === 'calculate') {
    const contextPath = args[1] || process.cwd();
    console.log(`Loading context from: ${contextPath}`);

    const context = engine.loadContext(contextPath);
    const result = engine.calculate(context);

    console.log('\n=== Confidence Assessment ===');
    console.log(`Score: ${result.percentage}% (${result.score.toFixed(2)})`);
    console.log(`Risk Level: ${result.risk}`);
    console.log('\nBreakdown:');
    console.log(`  Base Confidence: ${(result.breakdown.baseConfidence * 100).toFixed(0)}%`);
    console.log(`  Source Credibility: +${(result.breakdown.contributions.sourceCredibility * 100).toFixed(1)}%`);
    console.log(`  Coverage Completeness: +${(result.breakdown.contributions.coverageCompleteness * 100).toFixed(1)}%`);
    console.log(`  Synthesis Coherence: +${(result.breakdown.contributions.synthesisCoherence * 100).toFixed(1)}%`);
    console.log('\nFactor Details:');
    console.log(`  Evidence Quality: ${(result.breakdown.factors.sourceCredibility * 100).toFixed(1)}%`);
    console.log(`  Coverage: ${(result.breakdown.factors.coverageCompleteness * 100).toFixed(1)}%`);
    console.log(`  Logic Coherence: ${(result.breakdown.factors.synthesisCoherence * 100).toFixed(1)}%`);
    console.log(`\nTimestamp: ${result.timestamp}`);

    // Gate check
    if (result.score >= 0.90) {
      console.log('\n✅ PASSED: Confidence ≥90% - Ready to proceed');
      process.exit(0);
    } else {
      console.log(`\n❌ FAILED: Confidence ${result.percentage}% < 90% - Improvements needed`);
      process.exit(1);
    }

  } else if (command === 'test') {
    // Test with sample data
    const testContext = {
      evidence: [
        { source: 'official documentation', quality: 90, relevance: 'high' },
        { source: 'github example', quality: 80, relevance: 'high' },
        { source: 'stackoverflow', quality: 70, relevance: 'medium' }
      ],
      requirements: [
        { id: 'BR-001', description: 'User authentication' },
        { id: 'BR-002', description: 'Dashboard display' },
        { id: 'FR-001', description: 'Login function' }
      ],
      implementation: {
        covered: ['BR-001', 'FR-001'],
        design: { authentication: 'JWT based', dashboard: 'React component' }
      },
      plan: 'Implementation approach: Create authentication service using JWT. Build dashboard component with React. Include unit tests for both modules.',
      design: {
        authentication: 'JWT token-based authentication with refresh tokens',
        dashboard: 'Server-side rendered React component with data fetching'
      }
    };

    const result = engine.calculate(testContext);
    console.log('\n=== Test Confidence Calculation ===');
    console.log(JSON.stringify(result, null, 2));

  } else {
    console.log('Confidence Engine - EPS Framework-Inspired Confidence Calculation');
    console.log('\nUsage:');
    console.log('  node confidence-engine.js calculate [context-path]');
    console.log('  node confidence-engine.js test');
    console.log('\nExamples:');
    console.log('  node confidence-engine.js calculate <project-root>');
    console.log('  node confidence-engine.js test');
    console.log('\nGate Checks:');
    console.log('  D4 Gate: Design confidence ≥90%');
    console.log('  G2 Gate: Plan confidence ≥90%');
    process.exit(1);
  }
}

module.exports = ConfidenceEngine;
