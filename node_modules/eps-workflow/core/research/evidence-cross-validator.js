#!/usr/bin/env node

/**
 * Evidence Cross-Validator
 * エビデンスクロス検証
 * Trình Xác Thực Chéo Bằng Chứng
 *
 * Purpose: Cross-validate evidence from Claude and Gemini models
 *
 * Features:
 * - Overlap detection (semantic similarity >80%)
 * - Unique evidence identification
 * - Contradiction detection (same topic, different claims)
 * - Confidence scoring (HIGH/MEDIUM/LOW)
 * - Similarity scoring using semantic comparison
 *
 * @version 3.8.0
 * @date 2025-12-24
 */

/**
 * Evidence Cross-Validator
 * Validates evidence from two models and detects overlaps/contradictions
 */
class EvidenceCrossValidator {
  constructor(options = {}) {
    this.options = {
      overlapThreshold: options.overlapThreshold || 0.80, // 80% similarity for overlap
      contradictionTopicThreshold: options.contradictionTopicThreshold || 0.70, // 70% topic similarity
      contradictionClaimThreshold: options.contradictionClaimThreshold || 0.30, // <30% claim similarity
      ...options
    };

    // Validation metrics
    this.metrics = {
      overlaps: 0,
      uniqueClaude: 0,
      uniqueGemini: 0,
      contradictions: 0,
      validationTime: 0
    };
  }

  /**
   * Cross-validate evidence from two models
   *
   * @param {Array} claudeEvidence - Evidence from Claude
   * @param {Array} geminiEvidence - Evidence from Gemini
   * @returns {Promise<Object>} Validation results
   */
  async validate(claudeEvidence, geminiEvidence) {
    const startTime = Date.now();

    try {
      console.log(`\n🔍 Starting Cross-Validation...`);
      console.log(`  - Claude Evidence: ${claudeEvidence.length} pieces`);
      console.log(`  - Gemini Evidence: ${geminiEvidence.length} pieces`);

      // Step 1: Find overlaps (semantic similarity > 80%)
      const overlaps = this.findSemanticOverlaps(claudeEvidence, geminiEvidence);
      this.metrics.overlaps = overlaps.length;

      // Step 2: Find unique evidence from each model
      const uniqueClaude = this.findUnique(claudeEvidence, overlaps, 'claude');
      const uniqueGemini = this.findUnique(geminiEvidence, overlaps, 'gemini');
      this.metrics.uniqueClaude = uniqueClaude.length;
      this.metrics.uniqueGemini = uniqueGemini.length;

      // Step 3: Detect contradictions
      const contradictions = this.detectContradictions(claudeEvidence, geminiEvidence);
      this.metrics.contradictions = contradictions.length;

      this.metrics.validationTime = Date.now() - startTime;

      console.log(`\n✅ Cross-Validation Complete:`);
      console.log(`  - Overlaps: ${overlaps.length} pieces (HIGH confidence)`);
      console.log(`  - Unique Claude: ${uniqueClaude.length} pieces`);
      console.log(`  - Unique Gemini: ${uniqueGemini.length} pieces`);
      console.log(`  - Contradictions: ${contradictions.length} pieces`);

      return {
        overlaps,
        uniqueClaude,
        uniqueGemini,
        contradictions,
        metrics: { ...this.metrics }
      };

    } catch (error) {
      console.error(`\n❌ Cross-validation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Find semantic overlaps between Claude and Gemini evidence
   *
   * @param {Array} claudeEvidence - Evidence from Claude
   * @param {Array} geminiEvidence - Evidence from Gemini
   * @returns {Array} Overlapping evidence pairs
   */
  findSemanticOverlaps(claudeEvidence, geminiEvidence) {
    const overlaps = [];
    const processed = new Set();

    for (const ce of claudeEvidence) {
      for (const ge of geminiEvidence) {
        // Skip if already processed
        const pairId = `${ce.id}-${ge.id}`;
        if (processed.has(pairId)) continue;

        // Calculate semantic similarity
        const similarity = this._calculateSemanticSimilarity(ce, ge);

        if (similarity > this.options.overlapThreshold) {
          overlaps.push({
            claudeEvidence: ce,
            geminiEvidence: ge,
            similarity: similarity,
            type: 'OVERLAP'
          });
          processed.add(pairId);
        }
      }
    }

    return overlaps;
  }

  /**
   * Find evidence unique to one model
   *
   * @param {Array} evidence - Evidence from one model
   * @param {Array} overlaps - Already identified overlaps
   * @param {string} modelName - 'claude' or 'gemini'
   * @returns {Array} Unique evidence pieces
   */
  findUnique(evidence, overlaps, modelName) {
    const overlapIds = new Set();

    overlaps.forEach(overlap => {
      if (modelName === 'claude') {
        overlapIds.add(overlap.claudeEvidence.id);
      } else {
        overlapIds.add(overlap.geminiEvidence.id);
      }
    });

    return evidence.filter(e => !overlapIds.has(e.id));
  }

  /**
   * Detect contradictory evidence between models
   *
   * @param {Array} claudeEvidence - Evidence from Claude
   * @param {Array} geminiEvidence - Evidence from Gemini
   * @returns {Array} Contradictory evidence pairs
   */
  detectContradictions(claudeEvidence, geminiEvidence) {
    const contradictions = [];
    const processed = new Set();

    for (const ce of claudeEvidence) {
      for (const ge of geminiEvidence) {
        const pairId = `${ce.id}-${ge.id}`;
        if (processed.has(pairId)) continue;

        // Check if they're about the same topic but disagree
        const topicSimilarity = this._calculateTopicSimilarity(ce, ge);
        const claimSimilarity = this._calculateClaimSimilarity(ce, ge);

        if (topicSimilarity > this.options.contradictionTopicThreshold &&
            claimSimilarity < this.options.contradictionClaimThreshold) {

          // Same topic, different claims → Contradiction
          contradictions.push({
            id: `evidence-contradiction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: `${ce.title} (CONTRADICTION DETECTED)`,
            content: `CONTRADICTION: Models disagree on this topic. Manual review required.`,
            source: {
              url: null,
              type: 'contradiction',
              authority: 0,
              publicationDate: new Date().toISOString()
            },
            quality: {
              overall: 0,
              sourceAuthority: 0,
              recency: 0,
              relevance: 0,
              depth: 0,
              accuracy: 0
            },
            crossValidation: {
              confidence: 'LOW',
              foundBy: ['claude', 'gemini'],
              agreement: Math.round(claimSimilarity * 100),
              contradictions: [
                {
                  model: 'claude',
                  claim: this._extractMainClaim(ce.content),
                  quality: ce.quality.overall
                },
                {
                  model: 'gemini',
                  claim: this._extractMainClaim(ge.content),
                  quality: ge.quality.overall
                }
              ],
              synthesized: false,
              resolution: 'NEEDS_MANUAL_REVIEW',
              resolutionStrategy: this._suggestResolutionStrategy(ce, ge)
            },
            metadata: {
              topicSimilarity: Math.round(topicSimilarity * 100),
              claimSimilarity: Math.round(claimSimilarity * 100),
              createdAt: new Date().toISOString()
            }
          });

          processed.add(pairId);
        }
      }
    }

    return contradictions;
  }

  /**
   * Calculate semantic similarity between two evidence pieces
   * @private
   */
  _calculateSemanticSimilarity(evidence1, evidence2) {
    // Title similarity (40% weight)
    const titleSim = this._levenshteinSimilarity(
      evidence1.title.toLowerCase(),
      evidence2.title.toLowerCase()
    );

    // Content similarity (40% weight) - cosine similarity of key terms
    const contentSim = this._cosineSimilarity(
      this._extractKeyTerms(evidence1.content),
      this._extractKeyTerms(evidence2.content)
    );

    // Source similarity (20% weight)
    const sourceSim = this._compareUrls(evidence1.source.url, evidence2.source.url);

    return (titleSim * 0.4) + (contentSim * 0.4) + (sourceSim * 0.2);
  }

  /**
   * Calculate topic similarity (title + key terms)
   * @private
   */
  _calculateTopicSimilarity(evidence1, evidence2) {
    const title1Terms = this._extractKeyTerms(evidence1.title);
    const title2Terms = this._extractKeyTerms(evidence2.title);

    return this._cosineSimilarity(title1Terms, title2Terms);
  }

  /**
   * Calculate claim similarity (main content comparison)
   * @private
   */
  _calculateClaimSimilarity(evidence1, evidence2) {
    const claim1 = this._extractMainClaim(evidence1.content);
    const claim2 = this._extractMainClaim(evidence2.content);

    return this._levenshteinSimilarity(claim1.toLowerCase(), claim2.toLowerCase());
  }

  /**
   * Extract main claim (first 200 chars of content)
   * @private
   */
  _extractMainClaim(content) {
    const cleaned = content.replace(/\s+/g, ' ').trim();
    return cleaned.length > 200 ? cleaned.substring(0, 200) : cleaned;
  }

  /**
   * Suggest resolution strategy for contradiction
   * @private
   */
  _suggestResolutionStrategy(claudeEv, geminiEv) {
    const strategies = [];

    // Strategy 1: Authority-based
    if (Math.abs(claudeEv.quality.sourceAuthority - geminiEv.quality.sourceAuthority) > 20) {
      const winner = claudeEv.quality.sourceAuthority > geminiEv.quality.sourceAuthority ? 'Claude' : 'Gemini';
      strategies.push({
        name: 'Authority-Based',
        recommendation: `Prefer ${winner}'s evidence (higher source authority)`,
        confidence: 'MEDIUM'
      });
    }

    // Strategy 2: Recency-based
    if (Math.abs(claudeEv.quality.recency - geminiEv.quality.recency) > 20) {
      const winner = claudeEv.quality.recency > geminiEv.quality.recency ? 'Claude' : 'Gemini';
      strategies.push({
        name: 'Recency-Based',
        recommendation: `Prefer ${winner}'s evidence (more recent)`,
        confidence: 'MEDIUM'
      });
    }

    // Strategy 3: Quality-based
    if (Math.abs(claudeEv.quality.overall - geminiEv.quality.overall) > 15) {
      const winner = claudeEv.quality.overall > geminiEv.quality.overall ? 'Claude' : 'Gemini';
      strategies.push({
        name: 'Quality-Based',
        recommendation: `Prefer ${winner}'s evidence (higher overall quality)`,
        confidence: 'MEDIUM'
      });
    }

    // Default: Manual review
    if (strategies.length === 0) {
      strategies.push({
        name: 'Manual Review',
        recommendation: 'Sources have similar quality - manual review required',
        confidence: 'LOW'
      });
    }

    return strategies;
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
   * Levenshtein distance algorithm
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
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Extract key terms from text (words > 3 chars, no stopwords)
   * @private
   */
  _extractKeyTerms(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    const stopWords = new Set([
      'this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
      'will', 'they', 'what', 'when', 'where', 'which', 'while', 'would',
      'should', 'could', 'about', 'after', 'before', 'during', 'through'
    ]);

    return words.filter(w => !stopWords.has(w));
  }

  /**
   * Cosine similarity between two term sets
   * @private
   */
  _cosineSimilarity(terms1, terms2) {
    if (terms1.length === 0 || terms2.length === 0) return 0;

    const set1 = new Set(terms1);
    const set2 = new Set(terms2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    const dotProduct = intersection.size;
    const magnitude1 = Math.sqrt(set1.size);
    const magnitude2 = Math.sqrt(set2.size);

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Compare URLs for similarity
   * @private
   */
  _compareUrls(url1, url2) {
    if (!url1 || !url2) return 0;

    // Exact match
    if (url1 === url2) return 1.0;

    // Same domain
    const domain1 = this._extractDomain(url1);
    const domain2 = this._extractDomain(url2);

    if (domain1 === domain2) return 0.8;

    // URL contains other URL
    if (url1.includes(url2) || url2.includes(url1)) return 0.6;

    return 0;
  }

  /**
   * Extract domain from URL
   * @private
   */
  _extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return '';
    }
  }

  /**
   * Get validation summary
   *
   * @returns {Object} Summary of validation metrics
   */
  getSummary() {
    return {
      overlaps: this.metrics.overlaps,
      uniqueClaude: this.metrics.uniqueClaude,
      uniqueGemini: this.metrics.uniqueGemini,
      contradictions: this.metrics.contradictions,
      totalEvidence: this.metrics.overlaps + this.metrics.uniqueClaude + this.metrics.uniqueGemini,
      validationTime: this.metrics.validationTime,
      crossValidationRate: this.metrics.overlaps > 0
        ? Math.round((this.metrics.overlaps / (this.metrics.overlaps + this.metrics.uniqueClaude + this.metrics.uniqueGemini)) * 100)
        : 0
    };
  }
}

module.exports = EvidenceCrossValidator;
