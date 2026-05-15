#!/usr/bin/env node

/**
 * Synthesis Algorithms
 * シンセシスアルゴリズム
 * Thuật Toán Tổng Hợp
 *
 * Purpose: Core algorithms for evidence synthesis and conflict resolution
 *
 * Features:
 * - Semantic similarity detection (NLP-based, cosine similarity)
 * - Conflict resolution strategies (consensus, weighted vote, authority)
 * - Quality-weighted merging
 * - Insight generation from overlaps
 *
 * @version 3.8.0
 * @date 2025-12-24
 */

/**
 * Synthesis Algorithms
 * Core algorithms for evidence synthesis
 */
class SynthesisAlgorithms {
  constructor() {
    // Algorithm configuration
    this.config = {
      semanticSimilarityWeights: {
        title: 0.4,
        content: 0.4,
        source: 0.2
      },
      levenshteinThreshold: 0.8,
      cosineThreshold: 0.7
    };
  }

  /**
   * Calculate semantic similarity between two evidence pieces
   *
   * @param {Object} evidence1 - First evidence piece
   * @param {Object} evidence2 - Second evidence piece
   * @returns {number} Similarity score (0-1)
   */
  calculateSemanticSimilarity(evidence1, evidence2) {
    // Title similarity (40% weight)
    const titleSim = this.calculateLevenshteinSimilarity(
      evidence1.title.toLowerCase(),
      evidence2.title.toLowerCase()
    );

    // Content similarity (40% weight)
    const contentSim = this.calculateCosineSimilarity(
      this.extractKeyTerms(evidence1.content),
      this.extractKeyTerms(evidence2.content)
    );

    // Source similarity (20% weight)
    const sourceSim = this.compareUrls(evidence1.source.url, evidence2.source.url);

    return (titleSim * this.config.semanticSimilarityWeights.title) +
           (contentSim * this.config.semanticSimilarityWeights.content) +
           (sourceSim * this.config.semanticSimilarityWeights.source);
  }

  /**
   * Calculate Levenshtein similarity (normalized)
   *
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateLevenshteinSimilarity(str1, str2) {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    return maxLen === 0 ? 1.0 : 1.0 - (distance / maxLen);
  }

  /**
   * Calculate Levenshtein distance
   *
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
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
   * Calculate cosine similarity between two term sets
   *
   * @param {Array} terms1 - First term set
   * @param {Array} terms2 - Second term set
   * @returns {number} Similarity score (0-1)
   */
  calculateCosineSimilarity(terms1, terms2) {
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
   * Extract key terms from text
   *
   * @param {string} text - Text to extract terms from
   * @returns {Array} Array of key terms
   */
  extractKeyTerms(text) {
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
   * Compare URLs for similarity
   *
   * @param {string} url1 - First URL
   * @param {string} url2 - Second URL
   * @returns {number} Similarity score (0-1)
   */
  compareUrls(url1, url2) {
    if (!url1 || !url2) return 0;

    // Exact match
    if (url1 === url2) return 1.0;

    // Same domain
    const domain1 = this.extractDomain(url1);
    const domain2 = this.extractDomain(url2);

    if (domain1 === domain2) return 0.8;

    // URL contains other URL
    if (url1.includes(url2) || url2.includes(url1)) return 0.6;

    return 0;
  }

  /**
   * Extract domain from URL
   *
   * @param {string} url - URL to extract domain from
   * @returns {string} Domain name
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return '';
    }
  }

  /**
   * Resolve conflict using consensus strategy
   *
   * @param {Object} evidence1 - First evidence piece
   * @param {Object} evidence2 - Second evidence piece
   * @param {Array} thirdPartyEvidence - Third party evidence for consensus
   * @returns {Object} Resolution result
   */
  resolveByConsensus(evidence1, evidence2, thirdPartyEvidence = []) {
    if (thirdPartyEvidence.length === 0) {
      return {
        resolution: 'NEEDS_MANUAL_REVIEW',
        reason: 'No third-party evidence available for consensus',
        confidence: 'LOW'
      };
    }

    // Check which evidence agrees with third party
    const agreesWithEvidence1 = thirdPartyEvidence.filter(e =>
      this.calculateSemanticSimilarity(e, evidence1) > this.config.cosineThreshold
    ).length;

    const agreesWithEvidence2 = thirdPartyEvidence.filter(e =>
      this.calculateSemanticSimilarity(e, evidence2) > this.config.cosineThreshold
    ).length;

    if (agreesWithEvidence1 > agreesWithEvidence2) {
      return {
        resolution: 'ACCEPT_EVIDENCE_1',
        reason: `${agreesWithEvidence1} third sources agree with Evidence 1`,
        confidence: 'HIGH'
      };
    } else if (agreesWithEvidence2 > agreesWithEvidence1) {
      return {
        resolution: 'ACCEPT_EVIDENCE_2',
        reason: `${agreesWithEvidence2} third sources agree with Evidence 2`,
        confidence: 'HIGH'
      };
    }

    return {
      resolution: 'NEEDS_MANUAL_REVIEW',
      reason: 'Third sources split equally',
      confidence: 'LOW'
    };
  }

  /**
   * Resolve conflict using weighted voting strategy
   *
   * @param {Object} evidence1 - First evidence piece
   * @param {Object} evidence2 - Second evidence piece
   * @returns {Object} Resolution result
   */
  resolveByWeightedVoting(evidence1, evidence2) {
    const weight1 = this.calculateEvidenceWeight(evidence1);
    const weight2 = this.calculateEvidenceWeight(evidence2);

    if (weight1 > weight2 * 1.15) {
      return {
        resolution: 'ACCEPT_EVIDENCE_1',
        reason: `Evidence 1 has significantly higher weight (${weight1.toFixed(2)} vs ${weight2.toFixed(2)})`,
        confidence: 'MEDIUM'
      };
    } else if (weight2 > weight1 * 1.15) {
      return {
        resolution: 'ACCEPT_EVIDENCE_2',
        reason: `Evidence 2 has significantly higher weight (${weight2.toFixed(2)} vs ${weight1.toFixed(2)})`,
        confidence: 'MEDIUM'
      };
    }

    return {
      resolution: 'NEEDS_MANUAL_REVIEW',
      reason: 'Evidence weights too similar - manual review required',
      confidence: 'LOW'
    };
  }

  /**
   * Resolve conflict using authority-based strategy
   *
   * @param {Object} evidence1 - First evidence piece
   * @param {Object} evidence2 - Second evidence piece
   * @returns {Object} Resolution result
   */
  resolveByAuthority(evidence1, evidence2) {
    const auth1 = evidence1.quality.sourceAuthority;
    const auth2 = evidence2.quality.sourceAuthority;

    if (auth1 > auth2 + 10) {
      return {
        resolution: 'ACCEPT_EVIDENCE_1',
        reason: `Evidence 1 has higher authority (${auth1} vs ${auth2})`,
        confidence: 'MEDIUM'
      };
    } else if (auth2 > auth1 + 10) {
      return {
        resolution: 'ACCEPT_EVIDENCE_2',
        reason: `Evidence 2 has higher authority (${auth2} vs ${auth1})`,
        confidence: 'MEDIUM'
      };
    }

    return {
      resolution: 'NEEDS_MANUAL_REVIEW',
      reason: 'Sources have similar authority - manual review required',
      confidence: 'LOW'
    };
  }

  /**
   * Calculate evidence weight for weighted voting
   *
   * @param {Object} evidence - Evidence piece
   * @returns {number} Weight score
   */
  calculateEvidenceWeight(evidence) {
    // Weight based on quality dimensions
    return (evidence.quality.sourceAuthority * 0.35) +
           (evidence.quality.recency * 0.20) +
           (evidence.quality.relevance * 0.25) +
           (evidence.quality.depth * 0.10) +
           (evidence.quality.accuracy * 0.10);
  }

  /**
   * Merge insights from overlapping evidence
   *
   * @param {Array} overlaps - Overlapping evidence pairs
   * @returns {Array} Merged insights
   */
  mergeInsights(overlaps) {
    return overlaps.map(overlap => {
      const claudeEv = overlap.claudeEvidence;
      const geminiEv = overlap.geminiEvidence;

      return {
        topic: claudeEv.title,
        agreement: Math.round(overlap.similarity * 100),
        claudePerspective: this.extractMainClaim(claudeEv.content),
        geminiPerspective: this.extractMainClaim(geminiEv.content),
        synthesizedInsight: this.synthesizeInsight(claudeEv, geminiEv),
        confidence: 'HIGH'
      };
    });
  }

  /**
   * Extract main claim from content
   *
   * @param {string} content - Content to extract claim from
   * @returns {string} Main claim
   */
  extractMainClaim(content) {
    const cleaned = content.replace(/\s+/g, ' ').trim();
    return cleaned.length > 200 ? cleaned.substring(0, 200) + '...' : cleaned;
  }

  /**
   * Synthesize insight from two evidence pieces
   *
   * @param {Object} evidence1 - First evidence piece
   * @param {Object} evidence2 - Second evidence piece
   * @returns {string} Synthesized insight
   */
  synthesizeInsight(evidence1, evidence2) {
    // Extract unique key terms from both
    const terms1 = this.extractKeyTerms(evidence1.content);
    const terms2 = this.extractKeyTerms(evidence2.content);

    const commonTerms = terms1.filter(t => terms2.includes(t));
    const uniqueTerms1 = terms1.filter(t => !terms2.includes(t));
    const uniqueTerms2 = terms2.filter(t => !terms1.includes(t));

    const insight = `Both sources agree on: ${commonTerms.slice(0, 5).join(', ')}. ` +
      `Source 1 emphasizes: ${uniqueTerms1.slice(0, 3).join(', ')}. ` +
      `Source 2 emphasizes: ${uniqueTerms2.slice(0, 3).join(', ')}.`;

    return insight;
  }
}

module.exports = SynthesisAlgorithms;
