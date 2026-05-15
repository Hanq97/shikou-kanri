"use strict";

/**
 * Innovate Enricher for /innovate Command (L2.2)
 *
 * Injects DO/DON'T patterns and conflict detection for innovate phase.
 * DD Reference: §5.4, §3.10.2 (IInnovateEnricher)
 *
 * Features:
 * - L2.2.1: Pattern injection (DO/DONT)
 * - L2.2.2: Conflict detection from prior features
 * - L2.2.3: Alternative discovery
 * - L2.2.4: Confidence scoring
 *
 * @module innovate-enricher
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
  layerPriority: ["eps", "design"],
  maxResults: 15,
  patternDepth: 2, // §5.4.3 - Innovate needs more context
  minConfidence: 0.5,
  conflictThreshold: 0.7,
};

/**
 * Pattern types for classification.
 */
const PatternType = {
  DO: "DO",
  DONT: "DONT",
  PATTERN: "PATTERN",
  ALTERNATIVE: "ALTERNATIVE",
};

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

/**
 * @typedef {object} Pattern
 * @property {string} id - Pattern ID
 * @property {string} name - Pattern name
 * @property {string} type - DO/DONT/PATTERN/ALTERNATIVE
 * @property {string} source - Source feature
 * @property {number} confidence - Confidence score
 * @property {string} [rationale] - Why this pattern
 * @property {string} [snippet] - Code example
 */

/**
 * @typedef {object} Conflict
 * @property {string} id - Conflict ID
 * @property {string[]} sources - Conflicting sources
 * @property {string} description - Conflict description
 * @property {string} severity - low/medium/high
 * @property {string} [resolution] - Suggested resolution
 */

/**
 * @typedef {object} Alternative
 * @property {string} id - Alternative ID
 * @property {string} name - Alternative name
 * @property {string} source - Source where used
 * @property {string[]} pros - Advantages
 * @property {string[]} cons - Disadvantages
 * @property {number} suitability - Suitability score
 */

/**
 * @typedef {object} InnovateContext
 * @property {Pattern[]} patterns - DO/DONT patterns
 * @property {Conflict[]} conflicts - Detected conflicts
 * @property {Alternative[]} alternatives - Alternative approaches
 * @property {object} meta - Enrichment metadata
 */

// ─────────────────────────────────────────────────────────────────
// Innovate Enricher
// ─────────────────────────────────────────────────────────────────

/**
 * Enricher for /innovate command.
 * Implements IInnovateEnricher interface.
 */
class InnovateEnricher {
  /**
   * Create an InnovateEnricher.
   *
   * @param {object} [options] - Options
   */
  constructor(options = {}) {
    this._graphService =
      options.graphService || GlobalGraphService.getInstance();
    this._config = { ...CONFIG, ...options.config };
  }

  /**
   * Enrich innovate context with patterns and conflicts.
   * DD Reference: §5.4.1, L2.2.1-L2.2.4
   *
   * @param {string} scope - Innovation scope/topic
   * @param {object} [options] - Options
   * @returns {Promise<InnovateContext>}
   */
  async enrich(scope, options = {}) {
    const startTime = Date.now();
    const context = {
      patterns: [],
      conflicts: [],
      alternatives: [],
      meta: {
        scope,
        enrichedAt: new Date().toISOString(),
        duration: 0,
        layersQueried: [],
      },
    };

    try {
      // Query patterns (DO/DONT)
      context.patterns = await this._queryPatterns(scope, options);

      // Detect conflicts from patterns
      context.conflicts = await this._detectConflicts(
        scope,
        context.patterns,
        options,
      );

      // Find alternatives
      context.alternatives = await this._findAlternatives(scope, options);

      // Update metadata
      context.meta.duration = Date.now() - startTime;
      context.meta.layersQueried = this._config.layerPriority;
      context.meta.patternsByType = this._countPatternsByType(context.patterns);
    } catch (err) {
      context.meta.error = err.message;
      context.meta.duration = Date.now() - startTime;
    }

    return context;
  }

  /**
   * Query DO/DONT patterns.
   * DD Reference: L2.2.1
   *
   * @param {string} scope - Scope
   * @param {object} [options] - Options
   * @returns {Promise<Pattern[]>}
   * @private
   */
  async _queryPatterns(scope, options = {}) {
    const patterns = [];

    try {
      // Query for DO patterns
      const doResult = await this._graphService.query(
        `${scope} best practice DO`,
        {
          layer: "eps",
          limit: 8,
          depth: this._config.patternDepth,
        },
      );

      if (doResult && doResult.nodes) {
        for (const node of doResult.nodes) {
          patterns.push(this._nodeToPattern(node, PatternType.DO));
        }
      }

      // Query for DONT patterns
      const dontResult = await this._graphService.query(
        `${scope} anti-pattern DONT avoid`,
        {
          layer: "eps",
          limit: 5,
          depth: this._config.patternDepth,
        },
      );

      if (dontResult && dontResult.nodes) {
        for (const node of dontResult.nodes) {
          patterns.push(this._nodeToPattern(node, PatternType.DONT));
        }
      }

      // Query for general patterns from design layer
      const designResult = await this._graphService.query(`${scope} pattern`, {
        layer: "design",
        limit: 5,
        depth: this._config.patternDepth,
      });

      if (designResult && designResult.nodes) {
        for (const node of designResult.nodes) {
          patterns.push(this._nodeToPattern(node, PatternType.PATTERN));
        }
      }
    } catch (err) {
      console.warn(`[InnovateEnricher] Pattern query failed: ${err.message}`);
    }

    // Deduplicate and sort
    return this._deduplicatePatterns(patterns)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this._config.maxResults);
  }

  /**
   * Convert node to pattern.
   * @private
   */
  _nodeToPattern(node, defaultType) {
    const type =
      node.attributes?.patternType ||
      (node.attributes?.isAntiPattern ? PatternType.DONT : defaultType);

    return {
      id: node.id,
      name: node.name || node.id,
      type,
      source: node.attributes?.source || node.attributes?.feature || "unknown",
      confidence: node.score || 0.6,
      rationale: node.attributes?.rationale || undefined,
      snippet: node.attributes?.snippet || undefined,
    };
  }

  /**
   * Detect conflicts between patterns.
   * DD Reference: L2.2.2
   *
   * @param {string} scope - Scope
   * @param {Pattern[]} patterns - Found patterns
   * @param {object} [options] - Options
   * @returns {Promise<Conflict[]>}
   * @private
   */
  async _detectConflicts(scope, patterns, options = {}) {
    const conflicts = [];

    try {
      // Use graph traversal to find conflicts
      const conflictResult = await this._graphService.query(
        `${scope} conflict contradiction`,
        {
          layer: "design",
          limit: 5,
        },
      );

      if (conflictResult && conflictResult.nodes) {
        for (const node of conflictResult.nodes) {
          if (
            node.type === "conflict" ||
            node.attributes?.isConflict ||
            node.score > this._config.conflictThreshold
          ) {
            conflicts.push({
              id: node.id,
              sources: node.attributes?.conflictingSources || [
                node.attributes?.source,
              ],
              description: node.attributes?.description || node.name,
              severity: this._classifyConflictSeverity(node),
              resolution: node.attributes?.resolution || undefined,
            });
          }
        }
      }

      // Check for pattern conflicts (DO vs DONT on same topic)
      const patternConflicts = this._findPatternConflicts(patterns);
      conflicts.push(...patternConflicts);
    } catch (err) {
      console.warn(
        `[InnovateEnricher] Conflict detection failed: ${err.message}`,
      );
    }

    return conflicts;
  }

  /**
   * Find conflicts within patterns.
   * @private
   */
  _findPatternConflicts(patterns) {
    const conflicts = [];
    const doPatterns = patterns.filter((p) => p.type === PatternType.DO);
    const dontPatterns = patterns.filter((p) => p.type === PatternType.DONT);

    // Simple conflict detection: same name, different type
    for (const doP of doPatterns) {
      for (const dontP of dontPatterns) {
        const similarity = this._calculateSimilarity(doP.name, dontP.name);
        if (similarity > 0.7) {
          conflicts.push({
            id: `conflict-${doP.id}-${dontP.id}`,
            sources: [doP.source, dontP.source],
            description: `Conflicting patterns: "${doP.name}" (DO) vs "${dontP.name}" (DONT)`,
            severity: "medium",
            resolution: `Review both patterns and determine context-appropriate approach`,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Simple string similarity (Jaccard-like).
   * @private
   */
  _calculateSimilarity(str1, str2) {
    const words1 = new Set(str1.toLowerCase().split(/\W+/));
    const words2 = new Set(str2.toLowerCase().split(/\W+/));
    const intersection = [...words1].filter((w) => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Classify conflict severity.
   * @private
   */
  _classifyConflictSeverity(node) {
    const score = node.score || 0;
    if (score > 0.9) return "high";
    if (score > 0.7) return "medium";
    return "low";
  }

  /**
   * Find alternative approaches.
   * DD Reference: L2.2.3
   *
   * @param {string} scope - Scope
   * @param {object} [options] - Options
   * @returns {Promise<Alternative[]>}
   * @private
   */
  async _findAlternatives(scope, options = {}) {
    const alternatives = [];

    try {
      const result = await this._graphService.query(
        `${scope} alternative approach option`,
        {
          layer: "design",
          limit: 5,
        },
      );

      if (result && result.nodes) {
        for (const node of result.nodes) {
          alternatives.push({
            id: node.id,
            name: node.name || node.id,
            source: node.attributes?.source || "unknown",
            pros: node.attributes?.pros || [],
            cons: node.attributes?.cons || [],
            suitability: node.score || 0.5,
          });
        }
      }
    } catch (err) {
      console.warn(
        `[InnovateEnricher] Alternative search failed: ${err.message}`,
      );
    }

    return alternatives;
  }

  /**
   * Count patterns by type.
   * @private
   */
  _countPatternsByType(patterns) {
    const counts = { DO: 0, DONT: 0, PATTERN: 0, ALTERNATIVE: 0 };
    for (const p of patterns) {
      counts[p.type] = (counts[p.type] || 0) + 1;
    }
    return counts;
  }

  /**
   * Deduplicate patterns.
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
   * @param {InnovateContext} context - Enriched context
   * @returns {string}
   */
  static formatContext(context) {
    const lines = [];

    lines.push("=== INNOVATE ENRICHMENT ===");
    lines.push(`Scope: ${context.meta.scope}`);
    lines.push(`Duration: ${context.meta.duration}ms`);
    lines.push("");

    // DO patterns
    const doPatterns = context.patterns.filter(
      (p) => p.type === PatternType.DO,
    );
    if (doPatterns.length > 0) {
      lines.push("✅ DO PATTERNS:");
      for (const pattern of doPatterns) {
        lines.push(
          `  • ${pattern.name} (${(pattern.confidence * 100).toFixed(0)}%)`,
        );
        if (pattern.rationale) {
          lines.push(`    ${pattern.rationale}`);
        }
      }
      lines.push("");
    }

    // DONT patterns
    const dontPatterns = context.patterns.filter(
      (p) => p.type === PatternType.DONT,
    );
    if (dontPatterns.length > 0) {
      lines.push("❌ DON'T PATTERNS:");
      for (const pattern of dontPatterns) {
        lines.push(
          `  • ${pattern.name} (${(pattern.confidence * 100).toFixed(0)}%)`,
        );
        if (pattern.rationale) {
          lines.push(`    ${pattern.rationale}`);
        }
      }
      lines.push("");
    }

    // Conflicts
    if (context.conflicts.length > 0) {
      lines.push("⚠️ CONFLICTS:");
      for (const conflict of context.conflicts) {
        const emoji =
          conflict.severity === "high"
            ? "🔴"
            : conflict.severity === "medium"
              ? "🟡"
              : "🟢";
        lines.push(`  ${emoji} ${conflict.description}`);
        if (conflict.resolution) {
          lines.push(`    Resolution: ${conflict.resolution}`);
        }
      }
      lines.push("");
    }

    // Alternatives
    if (context.alternatives.length > 0) {
      lines.push("🔄 ALTERNATIVES:");
      for (const alt of context.alternatives.slice(0, 3)) {
        lines.push(
          `  • ${alt.name} (${(alt.suitability * 100).toFixed(0)}% suitable)`,
        );
        if (alt.pros.length > 0) {
          lines.push(`    Pros: ${alt.pros.slice(0, 2).join(", ")}`);
        }
        if (alt.cons.length > 0) {
          lines.push(`    Cons: ${alt.cons.slice(0, 2).join(", ")}`);
        }
      }
    }

    return lines.join("\n");
  }
}

// ─────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────

module.exports = {
  InnovateEnricher,
  PatternType,
  CONFIG,
};
