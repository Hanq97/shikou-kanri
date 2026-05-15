#!/usr/bin/env node

/**
 * Iteration Strategies
 * イテレーション戦略
 * Chiến Lược Lặp
 *
 * Purpose: Progressive depth iteration planning, refinement, and convergence detection
 *
 * Features:
 * - 5-iteration strategy planning (BROAD → NARROW → DEEP → VALIDATE → REFINE)
 * - Query refinement based on previous results
 * - Depth assessment and progression tracking
 * - Convergence detection (quality plateau, saturation, time limit)
 * - Gap analysis and filling logic
 *
 * @version 3.8.0
 * @date 2025-12-24
 */

/**
 * Iteration Strategies
 * Manages iteration planning, refinement, and stopping conditions
 */
class IterationStrategies {
  constructor(options = {}) {
    this.options = {
      maxIterations: options.maxIterations || 5,
      maxTime: options.maxTime || 60000, // 60 seconds
      qualityPlateauThreshold: options.qualityPlateauThreshold || 5, // <5% improvement
      targetEvidenceCount: options.targetEvidenceCount || 10,
      minEvidencePerIteration: options.minEvidencePerIteration || 1,
      ...options
    };

    // Iteration templates
    this.iterationTemplates = {
      1: {
        goal: 'BROAD_OVERVIEW',
        queryType: 'general',
        searchDepth: 'basic',
        sources: ['WebSearch'],
        targetCount: 3,
        targetQuality: 75,
        maxTime: 15
      },
      2: {
        goal: 'NARROW_FOCUS',
        queryType: 'focused',
        searchDepth: 'basic',
        sources: ['WebSearch', 'TavilyBasic'],
        targetCount: 2,
        targetQuality: 80,
        maxTime: 15
      },
      3: {
        goal: 'DEEP_DIVE',
        queryType: 'specific',
        searchDepth: 'advanced',
        sources: ['TavilyAdvanced', 'GitHub'],
        targetCount: 2,
        targetQuality: 85,
        maxTime: 15
      },
      4: {
        goal: 'VALIDATION',
        queryType: 'production',
        searchDepth: 'advanced',
        sources: ['GitHub', 'CaseStudies'],
        targetCount: 1,
        targetQuality: 90,
        maxTime: 10
      },
      5: {
        goal: 'REFINEMENT',
        queryType: 'gap-filling',
        searchDepth: 'targeted',
        sources: ['ExpertBlogs', 'OfficialDocs'],
        targetCount: 1,
        targetQuality: 90,
        maxTime: 5
      }
    };
  }

  /**
   * Plan next iteration based on current context
   *
   * @param {number} iterationNumber - Current iteration (1-5)
   * @param {Object} context - Research context
   * @returns {Object} Iteration plan
   */
  planIteration(iterationNumber, context = {}) {
    if (iterationNumber < 1 || iterationNumber > this.options.maxIterations) {
      throw new Error(`Invalid iteration number: ${iterationNumber}`);
    }

    const template = this.iterationTemplates[iterationNumber];
    const { originalQuery, previousResults = [], allEvidence = [] } = context;

    let query = originalQuery;

    // Refine query based on iteration
    if (iterationNumber === 1) {
      query = this._generateBroadQuery(originalQuery);
    } else if (iterationNumber === 2) {
      query = this._refineQueryNarrow(originalQuery, previousResults);
    } else if (iterationNumber === 3) {
      query = this._deepDiveQuery(originalQuery, allEvidence);
    } else if (iterationNumber === 4) {
      query = this._validationQuery(originalQuery, allEvidence);
    } else if (iterationNumber === 5) {
      const gaps = this._identifyGaps(allEvidence);
      query = this._gapFillingQuery(originalQuery, gaps);
    }

    return {
      iteration: iterationNumber,
      goal: template.goal,
      query: query,
      queryType: template.queryType,
      searchDepth: template.searchDepth,
      sources: template.sources,
      targetCount: template.targetCount,
      targetQuality: template.targetQuality,
      maxTime: template.maxTime,
      metadata: {
        plannedAt: new Date().toISOString(),
        strategy: this._getStrategyDescription(iterationNumber)
      }
    };
  }

  /**
   * Generate broad overview query (Iteration 1)
   * @private
   */
  _generateBroadQuery(originalQuery) {
    const broadTerms = ['overview', 'introduction', 'patterns', 'architecture', 'best practices'];
    return `${originalQuery} ${broadTerms.slice(0, 3).join(' ')}`;
  }

  /**
   * Refine query for narrow focus (Iteration 2)
   * @private
   */
  _refineQueryNarrow(originalQuery, previousResults) {
    if (!previousResults || previousResults.length === 0) {
      return `${originalQuery} detailed guide`;
    }

    // Extract promising patterns from iteration 1
    const patterns = this._extractKeyPatterns(previousResults);
    const topPatterns = patterns.slice(0, 3);

    return `${originalQuery} ${topPatterns.join(' ')}`;
  }

  /**
   * Generate deep dive query (Iteration 3)
   * @private
   */
  _deepDiveQuery(originalQuery, allEvidence) {
    // Find most promising pattern
    const topPattern = this._findTopPattern(allEvidence);

    const deepTerms = ['implementation', 'detailed guide', 'specification', 'technical details'];
    return `${topPattern} ${originalQuery} ${deepTerms.slice(0, 2).join(' ')}`;
  }

  /**
   * Generate validation query (Iteration 4)
   * @private
   */
  _validationQuery(originalQuery, allEvidence) {
    const topPattern = this._findTopPattern(allEvidence);
    return `${topPattern} ${originalQuery} production GitHub example working code`;
  }

  /**
   * Generate gap-filling query (Iteration 5)
   * @private
   */
  _gapFillingQuery(originalQuery, gaps) {
    if (gaps.length === 0) {
      return null; // No gaps, can stop
    }

    const topPattern = originalQuery.split(' ')[0]; // Simple extraction
    return `${topPattern} ${gaps.slice(0, 2).join(' ')}`;
  }

  /**
   * Extract key patterns from evidence
   * @private
   */
  _extractKeyPatterns(evidence) {
    const allContent = evidence.map(e => e.content || e.title).join(' ');

    const commonPatterns = [
      'saga pattern',
      'event sourcing',
      'CQRS',
      'event-driven',
      'circuit breaker',
      'api gateway',
      'service mesh',
      'distributed transaction',
      'microservices',
      'domain-driven design'
    ];

    const counts = commonPatterns.map(pattern => ({
      pattern: pattern,
      count: (allContent.match(new RegExp(pattern, 'gi')) || []).length
    }));

    counts.sort((a, b) => b.count - a.count);

    return counts.filter(c => c.count > 0).map(c => c.pattern);
  }

  /**
   * Find most promising pattern from all evidence
   * @private
   */
  _findTopPattern(allEvidence) {
    if (!allEvidence || allEvidence.length === 0) {
      return 'best practices'; // Fallback
    }

    const patterns = this._extractKeyPatterns(allEvidence);
    return patterns[0] || 'best practices';
  }

  /**
   * Identify gaps in coverage
   * @private
   */
  _identifyGaps(allEvidence) {
    const requiredAspects = [
      'implementation guide',
      'best practices',
      'edge cases',
      'performance considerations',
      'security implications'
    ];

    const covered = requiredAspects.filter(aspect =>
      allEvidence.some(e => (e.content || e.title).toLowerCase().includes(aspect.toLowerCase()))
    );

    return requiredAspects.filter(aspect => !covered.includes(aspect));
  }

  /**
   * Check if research should stop
   *
   * @param {number} currentIteration - Current iteration
   * @param {Object} context - Research context
   * @returns {Object} Stopping decision
   */
  shouldStop(currentIteration, context) {
    const {
      previousIteration = null,
      currentResults = [],
      allEvidence = [],
      startTime = Date.now()
    } = context;

    const conditions = [];

    // Condition 1: Quality Plateau
    if (previousIteration && previousIteration.results) {
      const plateau = this._checkQualityPlateau(currentResults, previousIteration.results);
      if (plateau.met) {
        conditions.push(plateau);
      }
    }

    // Condition 2: Evidence Saturation
    if (currentIteration >= 3) {
      const saturation = this._checkEvidenceSaturation(currentResults, allEvidence);
      if (saturation.met) {
        conditions.push(saturation);
      }
    }

    // Condition 3: Time Limit
    const timeLimit = this._checkTimeLimit(startTime);
    if (timeLimit.met) {
      conditions.push(timeLimit);
    }

    // Condition 4: Target Count Reached
    const targetCount = this._checkTargetCount(allEvidence);
    if (targetCount.met) {
      conditions.push(targetCount);
    }

    // Condition 5: Max Iterations
    if (currentIteration >= this.options.maxIterations) {
      conditions.push({
        met: true,
        type: 'MAX_ITERATIONS',
        reason: `Max iterations reached (${this.options.maxIterations})`
      });
    }

    return {
      shouldStop: conditions.length > 0,
      reasons: conditions.map(c => c.reason),
      conditions: conditions
    };
  }

  /**
   * Check quality plateau condition
   * @private
   */
  _checkQualityPlateau(currentResults, previousResults) {
    const currentAvg = this._calculateAverageQuality(currentResults);
    const previousAvg = this._calculateAverageQuality(previousResults);

    const improvement = currentAvg - previousAvg;

    if (improvement < this.options.qualityPlateauThreshold) {
      return {
        met: true,
        type: 'QUALITY_PLATEAU',
        reason: `Quality plateau reached (improvement: ${improvement.toFixed(1)}% < ${this.options.qualityPlateauThreshold}%)`,
        improvement: improvement
      };
    }

    return { met: false };
  }

  /**
   * Check evidence saturation condition
   * @private
   */
  _checkEvidenceSaturation(currentResults, allPreviousEvidence) {
    if (currentResults.length === 0) {
      return {
        met: true,
        type: 'EVIDENCE_SATURATION',
        reason: 'No new evidence found (saturation)'
      };
    }

    // Check if current results are novel (simplified version)
    // In real implementation, would use semantic similarity
    const novelResults = currentResults.filter(curr => {
      const isNovel = !allPreviousEvidence.some(prev => {
        const titleSimilar = curr.title === prev.title;
        const urlSame = curr.source?.url === prev.source?.url;
        return titleSimilar || urlSame;
      });
      return isNovel;
    });

    if (novelResults.length === 0) {
      return {
        met: true,
        type: 'EVIDENCE_SATURATION',
        reason: 'No new insights found (all duplicates)'
      };
    }

    return { met: false };
  }

  /**
   * Check time limit condition
   * @private
   */
  _checkTimeLimit(startTime) {
    const elapsed = Date.now() - startTime;

    if (elapsed > this.options.maxTime) {
      return {
        met: true,
        type: 'TIME_LIMIT',
        reason: `Time limit reached (${elapsed}ms > ${this.options.maxTime}ms)`,
        elapsed: elapsed
      };
    }

    return { met: false };
  }

  /**
   * Check target count condition
   * @private
   */
  _checkTargetCount(allEvidence) {
    const highQuality = allEvidence.filter(e => e.quality?.overall >= 80);

    if (highQuality.length >= this.options.targetEvidenceCount) {
      return {
        met: true,
        type: 'TARGET_COUNT',
        reason: `Target count reached (${highQuality.length} pieces ≥ ${this.options.targetEvidenceCount})`,
        count: highQuality.length
      };
    }

    return { met: false };
  }

  /**
   * Calculate average quality
   * @private
   */
  _calculateAverageQuality(results) {
    if (!results || results.length === 0) return 0;

    const sum = results.reduce((acc, r) => acc + (r.quality?.overall || 0), 0);
    return sum / results.length;
  }

  /**
   * Get strategy description
   * @private
   */
  _getStrategyDescription(iteration) {
    const descriptions = {
      1: 'Get general landscape and main patterns',
      2: 'Focus on specific promising patterns from iteration 1',
      3: 'Deep dive into most promising approach',
      4: 'Find production examples and case studies',
      5: 'Fill remaining gaps, reach quality plateau'
    };

    return descriptions[iteration] || 'Unknown iteration';
  }

  /**
   * Assess depth progression across iterations
   *
   * @param {Array} iterationResults - Results grouped by iteration
   * @returns {Object} Depth progression analysis
   */
  assessDepthProgression(iterationResults) {
    const progression = iterationResults.map((results, index) => ({
      iteration: index + 1,
      avgDepth: this._calculateAverageDepth(results),
      avgQuality: this._calculateAverageQuality(results),
      count: results.length
    }));

    // Check if depth is increasing
    const improvements = [];
    for (let i = 1; i < progression.length; i++) {
      const depthImprovement = progression[i].avgDepth - progression[i - 1].avgDepth;
      const qualityImprovement = progression[i].avgQuality - progression[i - 1].avgQuality;

      improvements.push({
        iteration: progression[i].iteration,
        depthImprovement: depthImprovement,
        qualityImprovement: qualityImprovement,
        isImproving: depthImprovement > 0 || qualityImprovement > 0
      });
    }

    return {
      progression: progression,
      improvements: improvements,
      isProgressing: improvements.every(i => i.isImproving)
    };
  }

  /**
   * Calculate average depth
   * @private
   */
  _calculateAverageDepth(results) {
    if (!results || results.length === 0) return 0;

    const sum = results.reduce((acc, r) => acc + (r.quality?.depth || 0), 0);
    return sum / results.length;
  }
}

module.exports = IterationStrategies;
