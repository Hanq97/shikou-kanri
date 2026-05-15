#!/usr/bin/env node

/**
 * Multi-Model Research Engine
 * マルチモデル研究エンジン
 * Engine Nghiên Cứu Đa Mô Hình
 *
 * Purpose: Orchestrate parallel research using Claude + Gemini models
 *
 * Features:
 * - Parallel execution (Claude + Gemini via Promise.all)
 * - Quality scoring per model (0-100 scale)
 * - Error handling (fallback to single model if one fails)
 * - Performance optimization (async/await, parallel execution)
 * - Evidence metadata collection
 * - Tech Stack Aware: Focus on project's tech stack
 *
 * @version 3.9.0
 * @date 2026-01-04
 */

const path = require('path');
const fs = require('fs');
const { getTechStackContext } = require('../state/tech-stack-context');

/**
 * Multi-Model Research Engine
 * Orchestrates parallel research using Claude + Gemini
 *
 * Tech Stack Aware:
 * - STACK_DEFINED: Focus research on specific tech (C#, Java, etc.)
 * - STACK_SELECTION: Compare all available tech stacks
 */
class MultiModelResearchEngine {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 60000, // 60 seconds max
      fallbackToSingle: options.fallbackToSingle !== false, // true by default
      minQuality: options.minQuality || 50, // Minimum quality threshold
      maxEvidence: options.maxEvidence || 10, // Maximum evidence per model
      ...options
    };

    // Initialize strategies (will be injected via setStrategies)
    this.claudeStrategy = null;
    this.geminiStrategy = null;
    this.crossValidator = null;

    // Tech stack context - loaded before research
    this.techStackContext = null;

    // Performance metrics
    this.metrics = {
      startTime: null,
      endTime: null,
      claudeTime: 0,
      geminiTime: 0,
      validationTime: 0,
      synthesisTime: 0,
      totalTime: 0
    };
  }

  /**
   * Set research strategies
   * @param {Object} strategies - { claude, gemini, crossValidator }
   */
  setStrategies(strategies) {
    this.claudeStrategy = strategies.claude;
    this.geminiStrategy = strategies.gemini;
    this.crossValidator = strategies.crossValidator;
  }

  /**
   * Execute multi-model research
   *
   * @param {string} query - Research query
   * @param {string} researchFocus - RESEARCH_SRS | RESEARCH_BD | RESEARCH_DD
   * @param {Object} context - Research context (feature, developer, etc.)
   * @returns {Promise<Object>} Research results with synthesized evidence
   */
  async research(query, researchFocus, context = {}) {
    this.metrics.startTime = Date.now();

    // Load tech stack context FIRST
    this.techStackContext = await getTechStackContext();
    const stackSummary = this.techStackContext.getSummary();

    // Enhance query with tech stack context
    const enhancedQuery = this.techStackContext.enhanceQuery(query);

    try {
      console.log(`\n🔬 Multi-Model Research Started`);
      console.log(`Query: "${query}"`);
      console.log(`Focus: ${researchFocus}`);
      console.log(`Tech Stack: ${stackSummary.status === 'DEFINED' ? stackSummary.stack : 'NOT DEFINED'}`);
      if (enhancedQuery !== query) {
        console.log(`Enhanced Query: "${enhancedQuery}"`);
      }

      // Use enhanced query for research
      context.originalQuery = query;
      context.enhancedQuery = enhancedQuery;
      context.techStackContext = this.techStackContext.getPromptContext();

      // Validate strategies are set
      this._validateStrategies();

      // Step 1: Parallel research execution
      console.log(`\n⚡ Step 1: Parallel Research Execution...`);
      const { claudeEvidence, geminiEvidence, errors } = await this._executeParallelResearch(
        query,
        researchFocus,
        context
      );

      // Check if we have at least one model's results
      if (claudeEvidence.length === 0 && geminiEvidence.length === 0) {
        throw new Error('Both models failed to produce evidence. ' +
          `Claude: ${errors.claude}, Gemini: ${errors.gemini}`);
      }

      console.log(`\n✅ Parallel Research Complete:`);
      console.log(`  - Claude: ${claudeEvidence.length} pieces (${this.metrics.claudeTime}ms)`);
      console.log(`  - Gemini: ${geminiEvidence.length} pieces (${this.metrics.geminiTime}ms)`);

      // Step 2: Cross-validation
      console.log(`\n🔍 Step 2: Cross-Validation...`);
      const validationStart = Date.now();
      const validation = await this.crossValidator.validate(claudeEvidence, geminiEvidence);
      this.metrics.validationTime = Date.now() - validationStart;

      console.log(`\n✅ Cross-Validation Complete (${this.metrics.validationTime}ms):`);
      console.log(`  - Overlaps: ${validation.overlaps.length} pieces (HIGH confidence)`);
      console.log(`  - Unique Claude: ${validation.uniqueClaude.length} pieces`);
      console.log(`  - Unique Gemini: ${validation.uniqueGemini.length} pieces`);
      console.log(`  - Contradictions: ${validation.contradictions.length} pieces (LOW confidence)`);

      // Step 3: Synthesis
      console.log(`\n🔀 Step 3: Synthesis...`);
      const synthesisStart = Date.now();
      const synthesized = await this._synthesize(validation);
      this.metrics.synthesisTime = Date.now() - synthesisStart;

      console.log(`\n✅ Synthesis Complete (${this.metrics.synthesisTime}ms)`);

      // Calculate final metrics
      this.metrics.endTime = Date.now();
      this.metrics.totalTime = this.metrics.endTime - this.metrics.startTime;

      // Prepare results
      const results = {
        evidence: synthesized.evidence,
        statistics: {
          total: synthesized.evidence.length,
          highConfidence: synthesized.evidence.filter(e => e.crossValidation.confidence === 'HIGH').length,
          mediumConfidence: synthesized.evidence.filter(e => e.crossValidation.confidence === 'MEDIUM').length,
          lowConfidence: synthesized.evidence.filter(e => e.crossValidation.confidence === 'LOW').length,
          avgQuality: this._calculateAvgQuality(synthesized.evidence),
          crossValidationRate: this._calculateCrossValidationRate(synthesized.evidence),
          claudeEvidence: claudeEvidence.length,
          geminiEvidence: geminiEvidence.length,
          claudeErrors: errors.claude ? 1 : 0,
          geminiErrors: errors.gemini ? 1 : 0
        },
        metrics: { ...this.metrics },
        validation: {
          overlaps: validation.overlaps.length,
          uniqueClaude: validation.uniqueClaude.length,
          uniqueGemini: validation.uniqueGemini.length,
          contradictions: validation.contradictions.length
        }
      };

      // Display summary
      this._displaySummary(results);

      return results;

    } catch (error) {
      console.error(`\n❌ Multi-Model Research Failed:`, error.message);
      throw error;
    }
  }

  /**
   * Execute parallel research with Claude and Gemini
   * @private
   */
  async _executeParallelResearch(query, researchFocus, context) {
    const errors = { claude: null, gemini: null };
    let claudeEvidence = [];
    let geminiEvidence = [];

    try {
      // Execute both models in parallel with timeout
      const claudeStart = Date.now();
      const geminiStart = Date.now();

      const results = await Promise.allSettled([
        this._executeWithTimeout(
          () => this.claudeStrategy.research(query, researchFocus, context),
          this.options.timeout,
          'Claude'
        ),
        this._executeWithTimeout(
          () => this.geminiStrategy.research(query, researchFocus, context),
          this.options.timeout,
          'Gemini'
        )
      ]);

      // Process Claude results
      if (results[0].status === 'fulfilled') {
        claudeEvidence = results[0].value || [];
        this.metrics.claudeTime = Date.now() - claudeStart;
      } else {
        errors.claude = results[0].reason.message;
        console.warn(`⚠️  Claude research failed: ${errors.claude}`);
      }

      // Process Gemini results
      if (results[1].status === 'fulfilled') {
        geminiEvidence = results[1].value || [];
        this.metrics.geminiTime = Date.now() - geminiStart;
      } else {
        errors.gemini = results[1].reason.message;
        console.warn(`⚠️  Gemini research failed: ${errors.gemini}`);
      }

      // Filter by minimum quality
      claudeEvidence = claudeEvidence.filter(e => e.quality.overall >= this.options.minQuality);
      geminiEvidence = geminiEvidence.filter(e => e.quality.overall >= this.options.minQuality);

      // Limit evidence count
      claudeEvidence = claudeEvidence.slice(0, this.options.maxEvidence);
      geminiEvidence = geminiEvidence.slice(0, this.options.maxEvidence);

    } catch (error) {
      console.error(`❌ Parallel research execution error:`, error);
      throw error;
    }

    return { claudeEvidence, geminiEvidence, errors };
  }

  /**
   * Execute function with timeout
   * @private
   */
  async _executeWithTimeout(fn, timeout, modelName) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${modelName} timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Synthesize evidence from validation results
   * @private
   */
  async _synthesize(validation) {
    const { overlaps, uniqueClaude, uniqueGemini, contradictions } = validation;

    // Merge overlapping evidence (HIGH confidence)
    const mergedOverlaps = overlaps.map(overlap => this._mergeEvidence(
      overlap.claudeEvidence,
      overlap.geminiEvidence,
      overlap.similarity
    ));

    // Mark unique evidence (MEDIUM confidence)
    const uniqueClaudeMarked = uniqueClaude.map(e => ({
      ...e,
      crossValidation: {
        confidence: 'MEDIUM',
        foundBy: ['claude'],
        agreement: null,
        contradictions: [],
        synthesized: false
      }
    }));

    const uniqueGeminiMarked = uniqueGemini.map(e => ({
      ...e,
      crossValidation: {
        confidence: 'MEDIUM',
        foundBy: ['gemini'],
        agreement: null,
        contradictions: [],
        synthesized: false
      }
    }));

    // Mark contradictions (LOW confidence)
    const contradictionsMarked = contradictions.map(c => ({
      ...c,
      crossValidation: {
        confidence: 'LOW',
        foundBy: ['claude', 'gemini'],
        agreement: c.agreement,
        contradictions: c.contradictions,
        synthesized: false,
        resolution: 'NEEDS_MANUAL_REVIEW'
      }
    }));

    // Aggregate all evidence
    const allEvidence = [
      ...mergedOverlaps,
      ...uniqueClaudeMarked,
      ...uniqueGeminiMarked,
      ...contradictionsMarked
    ];

    // Deduplicate (>95% similarity)
    const deduplicated = this._deduplicateEvidence(allEvidence, 0.95);

    // Rank by quality within confidence levels
    const ranked = this._rankEvidence(deduplicated);

    return {
      evidence: ranked,
      avgQuality: this._calculateAvgQuality(ranked),
      crossValidationRate: this._calculateCrossValidationRate(ranked)
    };
  }

  /**
   * Merge two overlapping evidence pieces
   * @private
   */
  _mergeEvidence(claudeEv, geminiEv, similarity) {
    return {
      id: `evidence-merged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: claudeEv.title.length > geminiEv.title.length ? claudeEv.title : geminiEv.title,
      content: this._mergeContent(claudeEv.content, geminiEv.content),
      source: claudeEv.source.authority > geminiEv.source.authority ? claudeEv.source : geminiEv.source,
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
  }

  /**
   * Merge content from two evidence pieces
   * @private
   */
  _mergeContent(content1, content2) {
    const sentences1 = content1.match(/[^.!?]+[.!?]+/g) || [];
    const sentences2 = content2.match(/[^.!?]+[.!?]+/g) || [];

    const uniqueSentences = new Set([...sentences1, ...sentences2]);
    const deduplicated = Array.from(uniqueSentences).filter((s, i, arr) => {
      return !arr.some((other, j) => {
        if (i === j) return false;
        return this._levenshteinSimilarity(s.trim(), other.trim()) > 0.9;
      });
    });

    return deduplicated.join(' ').trim();
  }

  /**
   * Extract key insight from content (first 100 chars)
   * @private
   */
  _extractKeyInsight(content) {
    const cleaned = content.replace(/\s+/g, ' ').trim();
    return cleaned.length > 100 ? cleaned.substring(0, 100) + '...' : cleaned;
  }

  /**
   * Deduplicate evidence with similarity threshold
   * @private
   */
  _deduplicateEvidence(evidence, threshold) {
    const unique = [];
    const processed = new Set();

    const sorted = [...evidence].sort((a, b) => b.quality.overall - a.quality.overall);

    for (const e of sorted) {
      if (processed.has(e.id)) continue;

      const duplicates = evidence.filter(other => {
        if (e.id === other.id) return false;
        if (processed.has(other.id)) return false;
        return this._calculateSemanticSimilarity(e, other) > threshold;
      });

      if (duplicates.length > 0) {
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
   * Rank evidence by confidence and quality
   * @private
   */
  _rankEvidence(evidence) {
    const byConfidence = { HIGH: [], MEDIUM: [], LOW: [] };

    evidence.forEach(e => {
      const conf = e.crossValidation?.confidence || 'MEDIUM';
      byConfidence[conf].push(e);
    });

    Object.keys(byConfidence).forEach(conf => {
      byConfidence[conf].sort((a, b) => b.quality.overall - a.quality.overall);
    });

    return [...byConfidence.HIGH, ...byConfidence.MEDIUM, ...byConfidence.LOW];
  }

  /**
   * Calculate semantic similarity between two evidence pieces
   * @private
   */
  _calculateSemanticSimilarity(evidence1, evidence2) {
    const titleSim = this._levenshteinSimilarity(
      evidence1.title.toLowerCase(),
      evidence2.title.toLowerCase()
    );

    const contentSim = this._cosineSimilarity(
      this._extractKeyTerms(evidence1.content),
      this._extractKeyTerms(evidence2.content)
    );

    const sourceSim = evidence1.source.url === evidence2.source.url ? 1.0 : 0.0;

    return (titleSim * 0.4) + (contentSim * 0.4) + (sourceSim * 0.2);
  }

  /**
   * Levenshtein similarity (normalized)
   * @private
   */
  _levenshteinSimilarity(str1, str2) {
    const distance = this._levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    return maxLen === 0 ? 1.0 : 1.0 - (distance / maxLen);
  }

  /**
   * Levenshtein distance
   * @private
   */
  _levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  /**
   * Extract key terms from text
   * @private
   */
  _extractKeyTerms(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    const stopWords = new Set(['this', 'that', 'these', 'those', 'with', 'from', 'have', 'been', 'will']);
    return words.filter(w => !stopWords.has(w));
  }

  /**
   * Cosine similarity
   * @private
   */
  _cosineSimilarity(terms1, terms2) {
    if (terms1.length === 0 || terms2.length === 0) return 0;

    const set1 = new Set(terms1);
    const set2 = new Set(terms2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    return intersection.size / Math.sqrt(set1.size * set2.size);
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
   * Validate strategies are set
   * @private
   */
  _validateStrategies() {
    if (!this.claudeStrategy) {
      throw new Error('Claude strategy not set. Call setStrategies() first.');
    }
    if (!this.geminiStrategy) {
      throw new Error('Gemini strategy not set. Call setStrategies() first.');
    }
    if (!this.crossValidator) {
      throw new Error('Cross validator not set. Call setStrategies() first.');
    }
  }

  /**
   * Display summary
   * @private
   */
  _displaySummary(results) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ MULTI-MODEL RESEARCH COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\n📊 Statistics:`);
    console.log(`  - Total Evidence: ${results.statistics.total} pieces`);
    console.log(`  - HIGH Confidence: ${results.statistics.highConfidence} pieces (cross-validated)`);
    console.log(`  - MEDIUM Confidence: ${results.statistics.mediumConfidence} pieces`);
    console.log(`  - LOW Confidence: ${results.statistics.lowConfidence} pieces`);
    console.log(`  - Average Quality: ${results.statistics.avgQuality}%`);
    console.log(`  - Cross-Validation Rate: ${results.statistics.crossValidationRate}%`);
    console.log(`\n⏱️  Performance:`);
    console.log(`  - Claude Time: ${results.metrics.claudeTime}ms`);
    console.log(`  - Gemini Time: ${results.metrics.geminiTime}ms`);
    console.log(`  - Validation Time: ${results.metrics.validationTime}ms`);
    console.log(`  - Synthesis Time: ${results.metrics.synthesisTime}ms`);
    console.log(`  - Total Time: ${results.metrics.totalTime}ms`);
    console.log(`${'='.repeat(60)}\n`);
  }
}

module.exports = MultiModelResearchEngine;
