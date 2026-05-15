#!/usr/bin/env node

/**
 * Evidence Aggregator
 * エビデンスアグリゲーター
 * Bộ Tập Hợp Bằng Chứng
 *
 * Purpose: Aggregate, deduplicate, rank, and format evidence for downstream consumption
 *
 * Features:
 * - Aggregate by confidence level (HIGH/MEDIUM/LOW)
 * - Deduplicate similar evidence (>80% similar → merge)
 * - Rank by quality score (authority + recency + relevance + depth)
 * - Format for evidence.md structure
 * - Track aggregation statistics
 *
 * @version 3.8.0
 * @date 2025-12-24
 */

const SynthesisAlgorithms = require('../lib/synthesis-algorithms');

/**
 * Evidence Aggregator
 * Aggregates and formats evidence for downstream consumption
 */
class EvidenceAggregator {
  constructor(options = {}) {
    this.options = {
      deduplicationThreshold: options.deduplicationThreshold || 0.80, // 80% similarity for dedup
      minQualityThreshold: options.minQualityThreshold || 50, // Minimum quality to include
      maxEvidencePerLevel: options.maxEvidencePerLevel || 10, // Max evidence per confidence level
      includeModelInsights: options.includeModelInsights !== false, // Include model-specific insights
      ...options
    };

    // Synthesis algorithms for similarity calculation
    this.algorithms = new SynthesisAlgorithms();

    // Aggregation metrics
    this.metrics = {
      totalInput: 0,
      totalOutput: 0,
      deduplicatedCount: 0,
      filteredByQuality: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      aggregationTime: 0
    };
  }

  /**
   * Aggregate evidence
   *
   * @param {Array} evidence - Evidence pieces to aggregate
   * @returns {Promise<Object>} Aggregated results
   */
  async aggregate(evidence) {
    const startTime = Date.now();

    try {
      console.log(`\n📊 Starting Evidence Aggregation...`);
      console.log(`  - Input Evidence: ${evidence.length} pieces`);

      this.metrics.totalInput = evidence.length;

      // Step 1: Filter by minimum quality
      const qualityFiltered = this._filterByQuality(evidence);
      this.metrics.filteredByQuality = evidence.length - qualityFiltered.length;

      // Step 2: Aggregate by confidence level
      const byConfidence = this._aggregateByConfidence(qualityFiltered);

      // Step 3: Deduplicate within each confidence level
      const deduplicated = {
        HIGH: this._deduplicateEvidence(byConfidence.HIGH),
        MEDIUM: this._deduplicateEvidence(byConfidence.MEDIUM),
        LOW: this._deduplicateEvidence(byConfidence.LOW)
      };

      const deduplicatedCount =
        (byConfidence.HIGH.length - deduplicated.HIGH.length) +
        (byConfidence.MEDIUM.length - deduplicated.MEDIUM.length) +
        (byConfidence.LOW.length - deduplicated.LOW.length);
      this.metrics.deduplicatedCount = deduplicatedCount;

      // Step 4: Rank by quality within each level
      const ranked = {
        HIGH: this._rankByQuality(deduplicated.HIGH),
        MEDIUM: this._rankByQuality(deduplicated.MEDIUM),
        LOW: this._rankByQuality(deduplicated.LOW)
      };

      // Step 5: Limit evidence count per level
      const limited = {
        HIGH: ranked.HIGH.slice(0, this.options.maxEvidencePerLevel),
        MEDIUM: ranked.MEDIUM.slice(0, this.options.maxEvidencePerLevel),
        LOW: ranked.LOW.slice(0, this.options.maxEvidencePerLevel)
      };

      // Update metrics
      this.metrics.highConfidence = limited.HIGH.length;
      this.metrics.mediumConfidence = limited.MEDIUM.length;
      this.metrics.lowConfidence = limited.LOW.length;
      this.metrics.totalOutput = limited.HIGH.length + limited.MEDIUM.length + limited.LOW.length;
      this.metrics.aggregationTime = Date.now() - startTime;

      // Step 6: Format for output
      const formatted = this._formatForOutput(limited);

      console.log(`\n✅ Evidence Aggregation Complete:`);
      console.log(`  - Total Input: ${this.metrics.totalInput} pieces`);
      console.log(`  - Filtered by Quality: ${this.metrics.filteredByQuality} pieces removed`);
      console.log(`  - Deduplicated: ${this.metrics.deduplicatedCount} pieces merged`);
      console.log(`  - Total Output: ${this.metrics.totalOutput} pieces`);
      console.log(`  - HIGH Confidence: ${this.metrics.highConfidence} pieces`);
      console.log(`  - MEDIUM Confidence: ${this.metrics.mediumConfidence} pieces`);
      console.log(`  - LOW Confidence: ${this.metrics.lowConfidence} pieces`);
      console.log(`  - Aggregation Time: ${this.metrics.aggregationTime}ms`);

      return {
        evidence: [...limited.HIGH, ...limited.MEDIUM, ...limited.LOW],
        byConfidence: limited,
        formatted: formatted,
        statistics: {
          totalInput: this.metrics.totalInput,
          totalOutput: this.metrics.totalOutput,
          deduplicatedCount: this.metrics.deduplicatedCount,
          filteredByQuality: this.metrics.filteredByQuality,
          highConfidence: this.metrics.highConfidence,
          mediumConfidence: this.metrics.mediumConfidence,
          lowConfidence: this.metrics.lowConfidence,
          avgQuality: this._calculateAvgQuality([...limited.HIGH, ...limited.MEDIUM, ...limited.LOW])
        },
        metrics: { ...this.metrics }
      };

    } catch (error) {
      console.error(`\n❌ Evidence aggregation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Filter evidence by minimum quality threshold
   * @private
   */
  _filterByQuality(evidence) {
    return evidence.filter(e => e.quality.overall >= this.options.minQualityThreshold);
  }

  /**
   * Aggregate evidence by confidence level
   * @private
   */
  _aggregateByConfidence(evidence) {
    const byConfidence = { HIGH: [], MEDIUM: [], LOW: [] };

    evidence.forEach(e => {
      const conf = e.crossValidation?.confidence || 'MEDIUM';
      byConfidence[conf].push(e);
    });

    return byConfidence;
  }

  /**
   * Deduplicate evidence using semantic similarity
   * @private
   */
  _deduplicateEvidence(evidence) {
    if (evidence.length === 0) return [];

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
        // Merge duplicates into highest quality version
        const merged = this._mergeWithDuplicates(e, duplicates);
        unique.push(merged);
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
   * Merge evidence with its duplicates
   * @private
   */
  _mergeWithDuplicates(primary, duplicates) {
    // Keep primary evidence but track duplicates in metadata
    return {
      ...primary,
      metadata: {
        ...primary.metadata,
        mergedFrom: duplicates.map(d => ({
          id: d.id,
          title: d.title,
          quality: d.quality.overall,
          source: d.source.url
        }))
      }
    };
  }

  /**
   * Rank evidence by quality score
   * @private
   */
  _rankByQuality(evidence) {
    return [...evidence].sort((a, b) => {
      // Primary sort by overall quality
      if (b.quality.overall !== a.quality.overall) {
        return b.quality.overall - a.quality.overall;
      }

      // Secondary sort by source authority
      if (b.quality.sourceAuthority !== a.quality.sourceAuthority) {
        return b.quality.sourceAuthority - a.quality.sourceAuthority;
      }

      // Tertiary sort by recency
      return b.quality.recency - a.quality.recency;
    });
  }

  /**
   * Format evidence for output (evidence.md structure)
   * @private
   */
  _formatForOutput(byConfidence) {
    const sections = [];

    // HIGH confidence section
    if (byConfidence.HIGH.length > 0) {
      sections.push(this._formatSection('HIGH CONFIDENCE (Cross-Validated)', byConfidence.HIGH, true));
    }

    // MEDIUM confidence section
    if (byConfidence.MEDIUM.length > 0) {
      sections.push(this._formatSection('MEDIUM CONFIDENCE', byConfidence.MEDIUM, false));
    }

    // LOW confidence section
    if (byConfidence.LOW.length > 0) {
      sections.push(this._formatSection('LOW CONFIDENCE (Needs Review)', byConfidence.LOW, false));
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Format a confidence level section
   * @private
   */
  _formatSection(title, evidence, isPrimary) {
    const star = isPrimary ? ' ⭐' : '';
    let section = `## ${title}${star}\n\n`;

    evidence.forEach((e, index) => {
      section += this._formatEvidence(e, index + 1);
      section += '\n\n---\n\n';
    });

    return section.trim();
  }

  /**
   * Format a single evidence piece
   * @private
   */
  _formatEvidence(evidence, index) {
    const e = evidence;
    let formatted = `### Evidence ${index}: ${e.title}\n\n`;

    // Source information
    formatted += `- **Source**: ${e.source.url}\n`;
    formatted += `- **Type**: ${e.source.type}\n`;
    formatted += `- **Publication Date**: ${e.source.publicationDate || 'N/A'}\n`;

    // Quality scores
    formatted += `- **Quality**: ${e.quality.overall}% (Authority: ${e.quality.sourceAuthority}%, `;
    formatted += `Recency: ${e.quality.recency}%, Relevance: ${e.quality.relevance}%, `;
    formatted += `Depth: ${e.quality.depth}%, Accuracy: ${e.quality.accuracy}%)\n`;

    // Cross-validation info
    if (e.crossValidation) {
      formatted += `- **Confidence**: ${e.crossValidation.confidence}`;

      if (e.crossValidation.foundBy && e.crossValidation.foundBy.length > 0) {
        formatted += ` (found by ${e.crossValidation.foundBy.join(', ')})`;
      }

      if (e.crossValidation.agreement !== null && e.crossValidation.agreement !== undefined) {
        formatted += ` [${e.crossValidation.agreement}% agreement]`;
      }

      formatted += '\n';
    }

    // Summary
    formatted += `- **Summary**:\n  ${this._formatContent(e.content)}\n`;

    // Model insights (if available and enabled)
    if (this.options.includeModelInsights && e.modelInsights) {
      formatted += '\n';
      if (e.modelInsights.claude && e.modelInsights.claude.found) {
        formatted += `  **[Claude emphasis]**: ${e.modelInsights.claude.emphasis}\n`;
      }
      if (e.modelInsights.gemini && e.modelInsights.gemini.found) {
        formatted += `  **[Gemini emphasis]**: ${e.modelInsights.gemini.emphasis}\n`;
      }
    }

    // Merged information (if available)
    if (e.metadata?.mergedFrom && e.metadata.mergedFrom.length > 0) {
      formatted += `\n- **Merged From**: ${e.metadata.mergedFrom.length} similar source(s)\n`;
    }

    return formatted;
  }

  /**
   * Format content for display
   * @private
   */
  _formatContent(content) {
    const cleaned = content.replace(/\s+/g, ' ').trim();

    // Split into sentences
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];

    // Take first 3 sentences or 300 chars, whichever is shorter
    let summary = sentences.slice(0, 3).join(' ');

    if (summary.length > 300) {
      summary = summary.substring(0, 300) + '...';
    }

    return summary;
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
   * Get aggregation metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get statistics summary
   */
  getStatistics() {
    return {
      totalInput: this.metrics.totalInput,
      totalOutput: this.metrics.totalOutput,
      deduplicatedCount: this.metrics.deduplicatedCount,
      filteredByQuality: this.metrics.filteredByQuality,
      highConfidence: this.metrics.highConfidence,
      mediumConfidence: this.metrics.mediumConfidence,
      lowConfidence: this.metrics.lowConfidence,
      deduplicationRate: this.metrics.totalInput > 0
        ? Math.round((this.metrics.deduplicatedCount / this.metrics.totalInput) * 100)
        : 0,
      aggregationTime: this.metrics.aggregationTime
    };
  }
}

module.exports = EvidenceAggregator;
