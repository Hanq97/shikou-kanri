"use strict";

/**
 * Research Enricher for /research Command (L2.1)
 *
 * Queries specialists + prior patterns for research phase.
 * DD Reference: §5.4, §3.10.2 (IResearchEnricher)
 *
 * Features:
 * - L2.1.1: Prior pattern discovery
 * - L2.1.2: Specialist loading
 * - L2.1.3: Evidence enrichment
 * - L2.1.4: Output composition
 *
 * @module research-enricher
 */

const GlobalGraphService = require('../rag/global-graph-service');

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

/**
 * Enricher configuration.
 * DD Reference: §5.4.2
 */
const CONFIG = {
  layerPriority: ["eps", "arch"],
  maxResults: 10,
  patternDepth: 1, // §5.4.3 - Research is flat discovery
  minConfidence: 0.5,
};

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

/**
 * @typedef {object} Specialist
 * @property {string} name - Specialist name
 * @property {string} path - File path
 * @property {number} relevance - Relevance score (0-1)
 * @property {string[]} keywords - Matched keywords
 */

/**
 * @typedef {object} Pattern
 * @property {string} id - Pattern ID
 * @property {string} name - Pattern name
 * @property {string} type - Pattern type (DO/DONT/PATTERN)
 * @property {string} source - Source feature/document
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} [snippet] - Code snippet
 */

/**
 * @typedef {object} Evidence
 * @property {string} id - Evidence ID
 * @property {string} type - Evidence type (internal/external)
 * @property {string} source - Source reference
 * @property {string} content - Evidence content
 * @property {number} relevance - Relevance score
 */

/**
 * @typedef {object} ResearchContext
 * @property {Specialist[]} specialists - Matched specialists
 * @property {Pattern[]} patterns - Prior patterns
 * @property {Evidence[]} evidence - Evidence items
 * @property {object} meta - Enrichment metadata
 */

// ─────────────────────────────────────────────────────────────────
// Research Enricher
// ─────────────────────────────────────────────────────────────────

/**
 * Enricher for /research command.
 * Implements IResearchEnricher interface.
 */
class ResearchEnricher {
  /**
   * Create a ResearchEnricher.
   *
   * @param {object} [options] - Options
   * @param {object} [options.graphService] - GlobalGraphService instance
   */
  constructor(options = {}) {
    this._graphService =
      options.graphService || GlobalGraphService.getInstance();
    this._config = { ...CONFIG, ...options.config };
  }

  /**
   * Enrich research context with specialists and patterns.
   * DD Reference: §5.4.1, L2.1.1-L2.1.4
   *
   * @param {string} topic - Research topic
   * @param {object} [options] - Options
   * @returns {Promise<ResearchContext>}
   */
  async enrich(topic, options = {}) {
    const startTime = Date.now();
    const context = {
      specialists: [],
      patterns: [],
      evidence: [],
      meta: {
        topic,
        enrichedAt: new Date().toISOString(),
        duration: 0,
        layersQueried: [],
      },
    };

    try {
      // Parallel queries for specialists and patterns
      const [specialists, patterns] = await Promise.all([
        this._querySpecialists(topic, options),
        this._queryPatterns(topic, options),
      ]);

      context.specialists = specialists;
      context.patterns = patterns;

      // Sequential evidence enrichment (depends on patterns)
      context.evidence = await this._enrichEvidence(topic, patterns, options);

      // Update metadata
      context.meta.duration = Date.now() - startTime;
      context.meta.layersQueried = this._config.layerPriority;
      context.meta.totalResults =
        specialists.length + patterns.length + context.evidence.length;
    } catch (err) {
      // Non-blocking: return partial context on error
      context.meta.error = err.message;
      context.meta.duration = Date.now() - startTime;
    }

    return context;
  }

  /**
   * Query specialists relevant to topic.
   * DD Reference: L2.1.2
   *
   * @param {string} topic - Research topic
   * @param {object} [options] - Options
   * @returns {Promise<Specialist[]>}
   * @private
   */
  async _querySpecialists(topic, options = {}) {
    const specialists = [];

    try {
      const result = await this._graphService.query(topic, {
        layer: "eps",
        type: "specialist",
        limit: options.maxSpecialists || 5,
        depth: this._config.patternDepth,
      });

      if (result && result.nodes) {
        for (const node of result.nodes) {
          if (node.type === "specialist") {
            specialists.push({
              name: node.name || node.id,
              path: node.attributes?.filePath || "",
              relevance: node.score || 0.7,
              keywords: node.attributes?.keywords || [],
            });
          }
        }
      }
    } catch (err) {
      // Log but don't fail
      console.warn(
        `[ResearchEnricher] Specialist query failed: ${err.message}`,
      );
    }

    return specialists;
  }

  /**
   * Query prior patterns relevant to topic.
   * DD Reference: L2.1.1
   *
   * @param {string} topic - Research topic
   * @param {object} [options] - Options
   * @returns {Promise<Pattern[]>}
   * @private
   */
  async _queryPatterns(topic, options = {}) {
    const patterns = [];

    try {
      // Query across priority layers
      for (const layer of this._config.layerPriority) {
        const result = await this._graphService.query(topic, {
          layer,
          type: "pattern",
          limit: Math.ceil(this._config.maxResults / 2),
          depth: this._config.patternDepth,
        });

        if (result && result.nodes) {
          for (const node of result.nodes) {
            if (node.type === "pattern" || node.attributes?.isPattern) {
              patterns.push({
                id: node.id,
                name: node.name || node.id,
                type: node.attributes?.patternType || "PATTERN",
                source: node.attributes?.source || layer,
                confidence: node.score || 0.6,
                snippet: node.attributes?.snippet || undefined,
              });
            }
          }
        }

        // Stop if we have enough results
        if (patterns.length >= this._config.maxResults) {
          break;
        }
      }
    } catch (err) {
      console.warn(`[ResearchEnricher] Pattern query failed: ${err.message}`);
    }

    // Deduplicate and sort by confidence
    return this._deduplicatePatterns(patterns)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this._config.maxResults);
  }

  /**
   * Enrich with evidence items.
   * DD Reference: L2.1.3
   *
   * @param {string} topic - Research topic
   * @param {Pattern[]} patterns - Found patterns
   * @param {object} [options] - Options
   * @returns {Promise<Evidence[]>}
   * @private
   */
  async _enrichEvidence(topic, patterns, options = {}) {
    const evidence = [];

    try {
      // Extract feature references from patterns
      const featureRefs = new Set();
      for (const pattern of patterns) {
        if (pattern.source) {
          featureRefs.add(pattern.source);
        }
      }

      // Query evidence from each referenced feature
      for (const featureId of featureRefs) {
        const result = await this._graphService.query(`${topic} evidence`, {
          layer: "design",
          feature: featureId,
          limit: 3,
        });

        if (result && result.nodes) {
          for (const node of result.nodes) {
            evidence.push({
              id: node.id,
              type: this._classifyEvidenceType(node),
              source: `${featureId}:${node.attributes?.sourceFile || "unknown"}`,
              content: node.attributes?.content || node.name || "",
              relevance: node.score || 0.5,
            });
          }
        }
      }
    } catch (err) {
      console.warn(
        `[ResearchEnricher] Evidence enrichment failed: ${err.message}`,
      );
    }

    return evidence;
  }

  /**
   * Classify evidence type.
   * @private
   */
  _classifyEvidenceType(node) {
    if (node.attributes?.url) return "external";
    if (node.attributes?.sourceFile?.startsWith("http")) return "external";
    return "internal";
  }

  /**
   * Deduplicate patterns by ID.
   * DD Reference: §5.4.4
   * @private
   */
  _deduplicatePatterns(patterns) {
    const seen = new Map();

    for (const pattern of patterns) {
      const key = pattern.id || pattern.name;

      if (!seen.has(key)) {
        seen.set(key, pattern);
      } else {
        // Keep higher confidence
        const existing = seen.get(key);
        if (pattern.confidence > existing.confidence) {
          seen.set(key, pattern);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Format enriched context for display.
   *
   * @param {ResearchContext} context - Enriched context
   * @returns {string}
   */
  static formatContext(context) {
    const lines = [];

    lines.push("=== RESEARCH ENRICHMENT ===");
    lines.push(`Topic: ${context.meta.topic}`);
    lines.push(`Duration: ${context.meta.duration}ms`);
    lines.push("");

    if (context.specialists.length > 0) {
      lines.push("📚 SPECIALISTS:");
      for (const spec of context.specialists) {
        lines.push(`  - ${spec.name} (${(spec.relevance * 100).toFixed(0)}%)`);
        if (spec.keywords.length > 0) {
          lines.push(`    Keywords: ${spec.keywords.slice(0, 5).join(", ")}`);
        }
      }
      lines.push("");
    }

    if (context.patterns.length > 0) {
      lines.push("🔄 PRIOR PATTERNS:");
      for (const pattern of context.patterns) {
        const emoji =
          pattern.type === "DO" ? "✅" : pattern.type === "DONT" ? "❌" : "📋";
        lines.push(
          `  ${emoji} ${pattern.name} [${pattern.type}] (${(pattern.confidence * 100).toFixed(0)}%)`,
        );
        lines.push(`    Source: ${pattern.source}`);
      }
      lines.push("");
    }

    if (context.evidence.length > 0) {
      lines.push("📖 EVIDENCE:");
      for (const ev of context.evidence.slice(0, 5)) {
        lines.push(`  - [${ev.type}] ${ev.content.substring(0, 80)}...`);
        lines.push(`    Source: ${ev.source}`);
      }
    }

    return lines.join("\n");
  }
}

// ─────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────

module.exports = {
  ResearchEnricher,
  CONFIG,
};
