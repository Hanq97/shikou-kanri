#!/usr/bin/env node

/**
 * Research Synthesizer
 * 研究シンセサイザー
 * Bộ Tổng Hợp Nghiên Cứu
 *
 * Purpose: Merge evidence from Claude + Gemini intelligently with contradiction resolution
 *
 * Features:
 * - Merge overlapping evidence (HIGH confidence)
 * - Mark unique evidence (MEDIUM confidence)
 * - Resolve contradictions using weighted voting
 * - Generate synthesized insights
 * - Handle edge cases (all overlap, no overlap, contradictions)
 *
 * @version 3.8.0
 * @date 2025-12-24
 */

const SynthesisAlgorithms = require('../lib/synthesis-algorithms');

/**
 * Research Synthesizer
 * Merges evidence from Claude and Gemini models intelligently
 */
class ResearchSynthesizer {
  constructor(options = {}) {
    this.options = {
      deduplicationThreshold: options.deduplicationThreshold || 0.95, // 95% similarity for dedup
      contradictionResolutionStrategy: options.contradictionResolutionStrategy || 'consensus', // consensus | weighted | authority
      includeContradictions: options.includeContradictions !== false, // Include LOW confidence contradictions
      minConfidenceForInclusion: options.minConfidenceForInclusion || 'LOW', // HIGH | MEDIUM | LOW
      ...options
    };

    // Synthesis algorithms
    this.algorithms = new SynthesisAlgorithms();

    // Synthesis metrics
    this.metrics = {
      mergedCount: 0,
      uniqueClaudeCount: 0,
      uniqueGeminiCount: 0,
      contradictionsCount: 0,
      deduplicatedCount: 0,
      synthesisTime: 0
    };
  }

  /**
   * Synthesize evidence from validation results
   *
   * @param {Object} validation - Cross-validation results
   * @param {Array} validation.overlaps - Overlapping evidence
   * @param {Array} validation.uniqueClaude - Unique Claude evidence
   * @param {Array} validation.uniqueGemini - Unique Gemini evidence
   * @param {Array} validation.contradictions - Contradictory evidence
   * @returns {Promise<Object>} Synthesized results
   */
  async synthesize(validation) {
    const startTime = Date.now();

    try {
      console.log(`\n🔀 Starting Synthesis...`);

      // Step 1: Merge overlapping evidence → HIGH confidence
      const mergedOverlaps = this._mergeOverlaps(validation.overlaps);
      this.metrics.mergedCount = mergedOverlaps.length;

      // Step 2: Mark unique evidence → MEDIUM confidence
      const uniqueClaudeMarked = this._markUniqueEvidence(validation.uniqueClaude, 'claude');
      const uniqueGeminiMarked = this._markUniqueEvidence(validation.uniqueGemini, 'gemini');
      this.metrics.uniqueClaudeCount = uniqueClaudeMarked.length;
      this.metrics.uniqueGeminiCount = uniqueGeminiMarked.length;

      // Step 3: Resolve contradictions → HIGH/MEDIUM/LOW based on resolution
      const resolvedContradictions = await this._resolveContradictions(validation.contradictions);
      this.metrics.contradictionsCount = resolvedContradictions.length;

      // Step 4: Aggregate all evidence
      const allEvidence = [
        ...mergedOverlaps,
        ...uniqueClaudeMarked,
        ...uniqueGeminiMarked,
        ...(this.options.includeContradictions ? resolvedContradictions : [])
      ];

      // Step 5: Deduplicate (>95% similarity)
      const beforeDedup = allEvidence.length;
      const deduplicated = this._deduplicateEvidence(allEvidence);
      this.metrics.deduplicatedCount = beforeDedup - deduplicated.length;

      // Step 6: Rank by confidence → quality
      const ranked = this._rankEvidence(deduplicated);

      // Step 7: Generate synthesized insights
      const insights = this._generateInsights(ranked, validation);

      this.metrics.synthesisTime = Date.now() - startTime;

      console.log(`\n✅ Synthesis Complete:`);
      console.log(`  - Merged: ${this.metrics.mergedCount} pieces`);
      console.log(`  - Unique Claude: ${this.metrics.uniqueClaudeCount} pieces`);
      console.log(`  - Unique Gemini: ${this.metrics.uniqueGeminiCount} pieces`);
      console.log(`  - Contradictions: ${this.metrics.contradictionsCount} pieces`);
      console.log(`  - Deduplicated: ${this.metrics.deduplicatedCount} pieces removed`);
      console.log(`  - Total Evidence: ${ranked.length} pieces`);
      console.log(`  - Synthesis Time: ${this.metrics.synthesisTime}ms`);

      return {
        evidence: ranked,
        insights: insights,
        statistics: {
          total: ranked.length,
          highConfidence: ranked.filter(e => e.crossValidation.confidence === 'HIGH').length,
          mediumConfidence: ranked.filter(e => e.crossValidation.confidence === 'MEDIUM').length,
          lowConfidence: ranked.filter(e => e.crossValidation.confidence === 'LOW').length,
          avgQuality: this._calculateAvgQuality(ranked),
          crossValidationRate: this._calculateCrossValidationRate(ranked),
          mergedCount: this.metrics.mergedCount,
          uniqueClaudeCount: this.metrics.uniqueClaudeCount,
          uniqueGeminiCount: this.metrics.uniqueGeminiCount,
          contradictionsCount: this.metrics.contradictionsCount,
          deduplicatedCount: this.metrics.deduplicatedCount
        },
        metrics: { ...this.metrics }
      };

    } catch (error) {
      console.error(`\n❌ Synthesis failed:`, error.message);
      throw error;
    }
  }

  /**
   * Merge overlapping evidence pieces
   * @private
   */
  _mergeOverlaps(overlaps) {
    return overlaps.map(overlap => {
      const claudeEv = overlap.claudeEvidence;
      const geminiEv = overlap.geminiEvidence;
      const similarity = overlap.similarity;

      return {
        id: `evidence-merged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: this._selectBestTitle(claudeEv, geminiEv),
        content: this._mergeContent(claudeEv.content, geminiEv.content),
        source: this._selectBestSource(claudeEv.source, geminiEv.source),
        quality: {
          overall: Math.round((claudeEv.quality.overall + geminiEv.quality.overall) / 2),
          sourceAuthority: Math.max(claudeEv.quality.sourceAuthority, geminiEv.quality.sourceAuthority),
          recency: Math.max(claudeEv.quality.recency, geminiEv.quality.recency),
          relevance: Math.round((claudeEv.quality.relevance + geminiEv.quality.relevance) / 2),
          depth: Math.max(claudeEv.quality.depth, geminiEv.quality.depth),
          accuracy: Math.max(claudeEv.quality.accuracy, geminiEv.quality.accuracy)
        },
        crossValidation: {
          confidence: 'HIGH',
          foundBy: ['claude', 'gemini'],
          agreement: Math.round(similarity * 100),
          contradictions: [],
          synthesized: true
        },
        modelInsights: {
          claude: {
            found: true,
            quality: claudeEv.quality.overall,
            emphasis: this._extractKeyInsight(claudeEv.content)
          },
          gemini: {
            found: true,
            quality: geminiEv.quality.overall,
            emphasis: this._extractKeyInsight(geminiEv.content)
          }
        },
        metadata: {
          researchPhase: claudeEv.metadata?.researchPhase || 'RESEARCH',
          researchMode: 'multi-model',
          createdAt: new Date().toISOString(),
          tags: [...new Set([...(claudeEv.metadata?.tags || []), ...(geminiEv.metadata?.tags || [])])]
        }
      };
    });
  }

  /**
   * Select best title from two evidence pieces
   * @private
   */
  _selectBestTitle(claudeEv, geminiEv) {
    // Prefer longer, more descriptive title
    if (claudeEv.title.length > geminiEv.title.length + 10) {
      return claudeEv.title;
    } else if (geminiEv.title.length > claudeEv.title.length + 10) {
      return geminiEv.title;
    }

    // Prefer higher quality evidence's title
    return claudeEv.quality.overall >= geminiEv.quality.overall
      ? claudeEv.title
      : geminiEv.title;
  }

  /**
   * Select best source from two evidence pieces
   * @private
   */
  _selectBestSource(claudeSource, geminiSource) {
    // Prefer higher authority source
    return claudeSource.authority >= geminiSource.authority
      ? claudeSource
      : geminiSource;
  }

  /**
   * Merge content from two evidence pieces
   * @private
   */
  _mergeContent(content1, content2) {
    const sentences1 = content1.match(/[^.!?]+[.!?]+/g) || [content1];
    const sentences2 = content2.match(/[^.!?]+[.!?]+/g) || [content2];

    const uniqueSentences = new Set([...sentences1, ...sentences2]);

    // Remove near-duplicate sentences
    const deduplicated = Array.from(uniqueSentences).filter((s, i, arr) => {
      return !arr.some((other, j) => {
        if (i === j) return false;
        return this.algorithms.calculateLevenshteinSimilarity(s.trim(), other.trim()) > 0.9;
      });
    });

    return deduplicated.join(' ').trim();
  }

  /**
   * Extract key insight from content
   * @private
   */
  _extractKeyInsight(content) {
    const cleaned = content.replace(/\s+/g, ' ').trim();
    return cleaned.length > 150 ? cleaned.substring(0, 150) + '...' : cleaned;
  }

  /**
   * Mark unique evidence with MEDIUM confidence
   * @private
   */
  _markUniqueEvidence(evidence, modelName) {
    return evidence.map(e => ({
      ...e,
      crossValidation: {
        confidence: e.quality.overall >= 85 ? 'MEDIUM' : 'LOW', // High quality unique → MEDIUM
        foundBy: [modelName],
        agreement: null,
        contradictions: [],
        synthesized: false
      }
    }));
  }

  /**
   * Resolve contradictions using configured strategy
   * @private
   */
  async _resolveContradictions(contradictions) {
    const strategy = this.options.contradictionResolutionStrategy;

    return contradictions.map(contradiction => {
      const claudeEv = contradiction.crossValidation.contradictions.find(c => c.model === 'claude');
      const geminiEv = contradiction.crossValidation.contradictions.find(c => c.model === 'gemini');

      if (!claudeEv || !geminiEv) {
        // Malformed contradiction
        return {
          ...contradiction,
          crossValidation: {
            ...contradiction.crossValidation,
            confidence: 'LOW',
            resolution: 'NEEDS_MANUAL_REVIEW'
          }
        };
      }

      // Apply resolution strategy
      let resolution;
      if (strategy === 'consensus') {
        resolution = this._resolveByConsensus(claudeEv, geminiEv, contradiction);
      } else if (strategy === 'weighted') {
        resolution = this._resolveByWeightedVoting(claudeEv, geminiEv, contradiction);
      } else if (strategy === 'authority') {
        resolution = this._resolveByAuthority(claudeEv, geminiEv, contradiction);
      } else {
        resolution = { winner: null, confidence: 'LOW', reason: 'Unknown strategy' };
      }

      return {
        ...contradiction,
        crossValidation: {
          ...contradiction.crossValidation,
          confidence: resolution.confidence,
          resolution: resolution.winner ? `RESOLVED_${resolution.winner.toUpperCase()}` : 'NEEDS_MANUAL_REVIEW',
          resolutionReason: resolution.reason,
          resolutionStrategy: strategy
        }
      };
    });
  }

  /**
   * Resolve contradiction by consensus (third sources)
   * @private
   */
  _resolveByConsensus(claudeEv, geminiEv, contradiction) {
    // For now, fall back to authority if no third sources
    // In real implementation, would check third sources from evidence pool
    return this._resolveByAuthority(claudeEv, geminiEv, contradiction);
  }

  /**
   * Resolve contradiction by weighted voting (quality-weighted)
   * @private
   */
  _resolveByWeightedVoting(claudeEv, geminiEv, contradiction) {
    const claudeWeight = claudeEv.quality / 100;
    const geminiWeight = geminiEv.quality / 100;

    if (claudeWeight > geminiWeight + 0.15) {
      return {
        winner: 'claude',
        confidence: 'MEDIUM',
        reason: `Claude evidence has higher quality (${claudeEv.quality}% vs ${geminiEv.quality}%)`
      };
    } else if (geminiWeight > claudeWeight + 0.15) {
      return {
        winner: 'gemini',
        confidence: 'MEDIUM',
        reason: `Gemini evidence has higher quality (${geminiEv.quality}% vs ${claudeEv.quality}%)`
      };
    }

    // Too close
    return {
      winner: null,
      confidence: 'LOW',
      reason: 'Quality scores too similar - manual review required'
    };
  }

  /**
   * Resolve contradiction by source authority
   * @private
   */
  _resolveByAuthority(claudeEv, geminiEv, contradiction) {
    // Extract authority from contradiction metadata if available
    // For now, use quality as proxy for authority

    if (claudeEv.quality > geminiEv.quality + 15) {
      return {
        winner: 'claude',
        confidence: 'MEDIUM',
        reason: `Claude source has higher authority (quality ${claudeEv.quality}% vs ${geminiEv.quality}%)`
      };
    } else if (geminiEv.quality > claudeEv.quality + 15) {
      return {
        winner: 'gemini',
        confidence: 'MEDIUM',
        reason: `Gemini source has higher authority (quality ${geminiEv.quality}% vs ${claudeEv.quality}%)`
      };
    }

    return {
      winner: null,
      confidence: 'LOW',
      reason: 'Sources have similar authority - manual review required'
    };
  }

  /**
   * Deduplicate evidence using semantic similarity
   * @private
   */
  _deduplicateEvidence(evidence) {
    const unique = [];
    const processed = new Set();

    // Sort by quality (highest first)
    const sorted = [...evidence].sort((a, b) => b.quality.overall - a.quality.overall);

    for (const e of sorted) {
      if (processed.has(e.id)) continue;

      // Find near-duplicates
      const duplicates = evidence.filter(other => {
        if (e.id === other.id) return false;
        if (processed.has(other.id)) return false;
        return this.algorithms.calculateSemanticSimilarity(e, other) > this.options.deduplicationThreshold;
      });

      if (duplicates.length > 0) {
        // Keep highest quality version
        unique.push(e);
        processed.add(e.id);
        duplicates.forEach(d => processed.add(d.id));
      } else {
        unique.push(e);
        processed.add(e.id);
      }
    }

    return unique;
  }

  /**
   * Rank evidence by confidence then quality
   * @private
   */
  _rankEvidence(evidence) {
    const byConfidence = { HIGH: [], MEDIUM: [], LOW: [] };

    evidence.forEach(e => {
      const conf = e.crossValidation?.confidence || 'MEDIUM';
      byConfidence[conf].push(e);
    });

    // Sort each group by quality
    Object.keys(byConfidence).forEach(conf => {
      byConfidence[conf].sort((a, b) => b.quality.overall - a.quality.overall);
    });

    return [...byConfidence.HIGH, ...byConfidence.MEDIUM, ...byConfidence.LOW];
  }

  /**
   * Generate synthesized insights from evidence
   * @private
   */
  _generateInsights(evidence, validation) {
    const insights = {
      summary: '',
      keyFindings: [],
      agreements: [],
      disagreements: [],
      recommendations: []
    };

    // Summary
    const highConfidence = evidence.filter(e => e.crossValidation.confidence === 'HIGH');
    insights.summary = `Found ${evidence.length} pieces of evidence. ` +
      `${highConfidence.length} pieces are cross-validated with HIGH confidence (both models agree). ` +
      `${validation.contradictions.length} contradictions detected and ${this.metrics.contradictionsCount} resolved.`;

    // Key findings (HIGH confidence evidence)
    insights.keyFindings = highConfidence.slice(0, 5).map(e => ({
      title: e.title,
      quality: e.quality.overall,
      agreement: e.crossValidation.agreement,
      summary: this._extractKeyInsight(e.content)
    }));

    // Agreements (what both models found)
    insights.agreements = validation.overlaps.slice(0, 3).map(overlap => ({
      topic: overlap.claudeEvidence.title,
      similarity: Math.round(overlap.similarity * 100),
      claudeView: this._extractKeyInsight(overlap.claudeEvidence.content),
      geminiView: this._extractKeyInsight(overlap.geminiEvidence.content)
    }));

    // Disagreements (contradictions)
    insights.disagreements = validation.contradictions.slice(0, 3).map(c => ({
      topic: c.title,
      claudeClaim: c.crossValidation.contradictions.find(x => x.model === 'claude')?.claim || 'N/A',
      geminiClaim: c.crossValidation.contradictions.find(x => x.model === 'gemini')?.claim || 'N/A',
      resolution: c.crossValidation.resolution
    }));

    // Recommendations
    if (highConfidence.length >= 3) {
      insights.recommendations.push('Strong consensus found - proceed with confidence');
    }
    if (validation.contradictions.length > 0) {
      insights.recommendations.push(`Review ${validation.contradictions.length} contradictions before finalizing`);
    }
    if (validation.uniqueClaude.length > validation.uniqueGemini.length + 2) {
      insights.recommendations.push('Claude found significantly more evidence - consider Gemini query refinement');
    } else if (validation.uniqueGemini.length > validation.uniqueClaude.length + 2) {
      insights.recommendations.push('Gemini found significantly more evidence - consider Claude query refinement');
    }

    return insights;
  }

  /**
   * Calculate average quality
   * @private
   */
  _calculateAvgQuality(evidence) {
    if (evidence.length === 0) return 0;
    const sum = evidence.reduce((acc, e) => acc + e.quality.overall, 0);
    return Math.round(sum / evidence.length);
  }

  /**
   * Calculate cross-validation rate
   * @private
   */
  _calculateCrossValidationRate(evidence) {
    if (evidence.length === 0) return 0;
    const crossValidated = evidence.filter(e =>
      e.crossValidation?.foundBy?.length >= 2
    ).length;
    return Math.round((crossValidated / evidence.length) * 100);
  }

  /**
   * Get synthesis metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
}

module.exports = ResearchSynthesizer;
