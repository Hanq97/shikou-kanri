"use strict";

/**
 * Plan Context Loader for /plan Command (L2.4)
 *
 * Per-step RAG enrichment with patterns, edges, and confidence.
 * DD Reference: §5.4, §3.10.2 (IPlanContextLoader)
 *
 * Features:
 * - L2.4.1: Step context enrichment
 * - L2.4.2: Confidence score calculation
 * - L2.4.3: Dependency ordering
 * - L2.4.4: Risk analysis
 *
 * @module plan-context-loader
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
  layerPriority: ["code", "design"],
  maxResultsPerStep: 5,
  patternDepth: 2, // §5.4.3 - Plan needs code context
  minConfidence: 0.5,
};

/**
 * Risk categories.
 * DD Reference: §3.10.2 (RiskCategory)
 */
const RiskCategory = {
  BREAKING_CHANGE: "breaking_change",
  PERFORMANCE: "performance",
  SECURITY: "security",
  COMPATIBILITY: "compatibility",
  COMPLEXITY: "complexity",
};

/**
 * Risk levels.
 */
const RiskLevel = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

/**
 * @typedef {object} Pattern
 * @property {string} id - Pattern ID
 * @property {string} name - Pattern name
 * @property {string} type - Pattern type
 * @property {number} confidence - Confidence
 * @property {string} source - Source
 * @property {string} [snippet] - Code snippet
 */

/**
 * @typedef {object} Edge
 * @property {string} id - Edge ID
 * @property {string} source - Source node
 * @property {string} target - Target node
 * @property {string} type - Edge type
 */

/**
 * @typedef {object} RiskAssessment
 * @property {string} category - RiskCategory
 * @property {string} level - RiskLevel
 * @property {string} description - Description
 * @property {string} mitigation - Mitigation strategy
 * @property {string[]} affectedComponents - Affected components
 */

/**
 * @typedef {object} Dependency
 * @property {string} stepId - Dependent step ID
 * @property {string} dependsOn - Required step ID
 * @property {string} type - Dependency type (requires/optional)
 * @property {string} [reason] - Reason for dependency
 */

/**
 * @typedef {object} PlanStep
 * @property {string} id - Step ID
 * @property {string} title - Step title
 * @property {string} description - Step description
 * @property {string[]} files - Files to modify
 * @property {string[]} [methods] - Methods to modify
 */

/**
 * @typedef {object} StepContext
 * @property {Pattern[]} patterns - Matched patterns
 * @property {Edge[]} edges - Relevant edges
 * @property {number} confidence - Confidence score (0-100)
 * @property {RiskAssessment[]} risks - Risk assessments
 * @property {Dependency[]} dependencies - Dependencies
 */

// ─────────────────────────────────────────────────────────────────
// Plan Context Loader
// ─────────────────────────────────────────────────────────────────

/**
 * Context loader for /plan command.
 * Implements IPlanContextLoader interface.
 */
class PlanContextLoader {
  /**
   * Create a PlanContextLoader.
   *
   * @param {object} [options] - Options
   */
  constructor(options = {}) {
    this._graphService =
      options.graphService || GlobalGraphService.getInstance();
    this._config = { ...CONFIG, ...options.config };
    this._stepCache = new Map();
  }

  /**
   * Enrich a plan step with context.
   * DD Reference: §5.4.1, L2.4.1-L2.4.4
   *
   * @param {PlanStep} step - Plan step
   * @param {object} [options] - Options
   * @returns {Promise<StepContext>}
   */
  async enrichStep(step, options = {}) {
    const cacheKey = step.id;

    // Check cache
    if (this._stepCache.has(cacheKey)) {
      return this._stepCache.get(cacheKey);
    }

    const context = {
      patterns: [],
      edges: [],
      confidence: 0,
      risks: [],
      dependencies: [],
    };

    try {
      // Query patterns for step files
      const patterns = await this._queryPatternsForStep(step, options);
      context.patterns = patterns;

      // Get related edges
      const edges = await this._getRelatedEdges(step, patterns, options);
      context.edges = edges;

      // Calculate confidence
      context.confidence = this._calculateConfidence(step, patterns, edges);

      // Assess risks
      context.risks = await this.assessRisks(step, patterns, options);

      // Identify dependencies
      context.dependencies = await this._identifyDependencies(step, options);

      // Cache result
      this._stepCache.set(cacheKey, context);
    } catch (err) {
      console.warn(
        `[PlanContextLoader] Step enrichment failed for ${step.id}: ${err.message}`,
      );
      context.confidence = 50; // Default confidence on error
    }

    return context;
  }

  /**
   * Query patterns for a step.
   * DD Reference: L2.4.1
   *
   * @param {PlanStep} step - Plan step
   * @param {object} [options] - Options
   * @returns {Promise<Pattern[]>}
   * @private
   */
  async _queryPatternsForStep(step, options = {}) {
    const patterns = [];

    try {
      // Query based on step files and description
      const queryText = `${step.title} ${step.description} ${(step.files || []).join(" ")}`;

      for (const layer of this._config.layerPriority) {
        const result = await this._graphService.query(queryText, {
          layer,
          limit: this._config.maxResultsPerStep,
          depth: this._config.patternDepth,
        });

        if (result && result.nodes) {
          for (const node of result.nodes) {
            patterns.push({
              id: node.id,
              name: node.name || node.id,
              type: node.type || "pattern",
              confidence: node.score || 0.5,
              source: node.attributes?.source || layer,
              snippet: node.attributes?.snippet || undefined,
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[PlanContextLoader] Pattern query failed: ${err.message}`);
    }

    // Deduplicate and limit
    return this._deduplicatePatterns(patterns).slice(
      0,
      this._config.maxResultsPerStep,
    );
  }

  /**
   * Get related edges for step.
   *
   * @param {PlanStep} step - Plan step
   * @param {Pattern[]} patterns - Found patterns
   * @param {object} [options] - Options
   * @returns {Promise<Edge[]>}
   * @private
   */
  async _getRelatedEdges(step, patterns, options = {}) {
    const edges = [];

    try {
      // Get edges from patterns
      const patternIds = patterns.map((p) => p.id);

      for (const patternId of patternIds.slice(0, 3)) {
        const traverseResult = await this._graphService.traverse(patternId, {
          depth: 1,
          direction: "both",
        });

        if (traverseResult && traverseResult.edges) {
          edges.push(...traverseResult.edges);
        }
      }
    } catch (err) {
      console.warn(`[PlanContextLoader] Edge query failed: ${err.message}`);
    }

    // Deduplicate edges
    return this._deduplicateEdges(edges);
  }

  /**
   * Calculate confidence score.
   * DD Reference: L2.4.2
   *
   * @param {PlanStep} step - Plan step
   * @param {Pattern[]} patterns - Found patterns
   * @param {Edge[]} edges - Found edges
   * @returns {number} Confidence score (0-100)
   * @private
   */
  _calculateConfidence(step, patterns, edges) {
    let score = 50; // Base score

    // Pattern coverage adds confidence
    if (patterns.length > 0) {
      const avgPatternConfidence =
        patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
      score += avgPatternConfidence * 30; // Up to +30
    }

    // Edge coverage adds confidence
    if (edges.length > 0) {
      score += Math.min(edges.length * 5, 15); // Up to +15
    }

    // File coverage
    const filesWithPatterns = new Set();
    for (const pattern of patterns) {
      if (pattern.source) {
        filesWithPatterns.add(pattern.source);
      }
    }
    const fileCoverage = step.files
      ? filesWithPatterns.size / Math.max(step.files.length, 1)
      : 0;
    score += fileCoverage * 5; // Up to +5

    return Math.min(Math.round(score), 100);
  }

  /**
   * Assess risks for a step.
   * DD Reference: L2.4.4
   *
   * @param {PlanStep} step - Plan step
   * @param {Pattern[]} [patterns] - Optional patterns
   * @param {object} [options] - Options
   * @returns {Promise<RiskAssessment[]>}
   */
  async assessRisks(step, patterns = [], options = {}) {
    const risks = [];

    try {
      // Check for breaking change risk
      if (step.files && step.files.length > 3) {
        risks.push({
          category: RiskCategory.BREAKING_CHANGE,
          level: step.files.length > 5 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
          description: `Step modifies ${step.files.length} files, increasing risk of breaking changes`,
          mitigation:
            "Run full test suite after changes, review cross-file dependencies",
          affectedComponents: step.files,
        });
      }

      // Check for complexity risk
      if (patterns.length < 2) {
        risks.push({
          category: RiskCategory.COMPLEXITY,
          level: RiskLevel.MEDIUM,
          description:
            "Few matching patterns found - implementation may require more research",
          mitigation:
            "Consult additional documentation or team members before implementing",
          affectedComponents: step.files || [],
        });
      }

      // Query for known risks
      const riskResult = await this._graphService.query(
        `${step.title} risk security vulnerability`,
        {
          layer: "design",
          limit: 3,
        },
      );

      if (riskResult && riskResult.nodes) {
        for (const node of riskResult.nodes) {
          if (node.type === "risk" || node.attributes?.isRisk) {
            risks.push({
              category: this._classifyRiskCategory(node),
              level: this._classifyRiskLevel(node),
              description: node.attributes?.description || node.name,
              mitigation:
                node.attributes?.mitigation ||
                "Review and address before proceeding",
              affectedComponents: node.attributes?.affectedComponents || [],
            });
          }
        }
      }
    } catch (err) {
      console.warn(
        `[PlanContextLoader] Risk assessment failed: ${err.message}`,
      );
    }

    return risks;
  }

  /**
   * Classify risk category from node.
   * @private
   */
  _classifyRiskCategory(node) {
    const name = (node.name || "").toLowerCase();
    const desc = (node.attributes?.description || "").toLowerCase();
    const combined = `${name} ${desc}`;

    if (combined.includes("security") || combined.includes("auth")) {
      return RiskCategory.SECURITY;
    }
    if (combined.includes("performance") || combined.includes("slow")) {
      return RiskCategory.PERFORMANCE;
    }
    if (combined.includes("breaking") || combined.includes("backwards")) {
      return RiskCategory.BREAKING_CHANGE;
    }
    if (combined.includes("compatibility") || combined.includes("cross")) {
      return RiskCategory.COMPATIBILITY;
    }
    return RiskCategory.COMPLEXITY;
  }

  /**
   * Classify risk level from node.
   * @private
   */
  _classifyRiskLevel(node) {
    const score = node.score || 0.5;
    if (score > 0.9) return RiskLevel.CRITICAL;
    if (score > 0.7) return RiskLevel.HIGH;
    if (score > 0.5) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Identify dependencies for step.
   * DD Reference: L2.4.3
   *
   * @param {PlanStep} step - Plan step
   * @param {object} [options] - Options
   * @returns {Promise<Dependency[]>}
   * @private
   */
  async _identifyDependencies(step, options = {}) {
    const dependencies = [];

    try {
      // Query for dependency relationships
      const depResult = await this._graphService.traverse(step.id, {
        depth: 1,
        edgeTypes: ["DEPENDS_ON", "REQUIRES"],
        direction: "outgoing",
      });

      if (depResult && depResult.edges) {
        for (const edge of depResult.edges) {
          dependencies.push({
            stepId: step.id,
            dependsOn: edge.target,
            type: edge.type === "REQUIRES" ? "requires" : "optional",
            reason: edge.attributes?.reason || undefined,
          });
        }
      }
    } catch (err) {
      // Non-blocking
    }

    return dependencies;
  }

  /**
   * Deduplicate patterns.
   * @private
   */
  _deduplicatePatterns(patterns) {
    const seen = new Map();
    for (const p of patterns) {
      if (!seen.has(p.id)) {
        seen.set(p.id, p);
      } else if (p.confidence > seen.get(p.id).confidence) {
        seen.set(p.id, p);
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Deduplicate edges.
   * @private
   */
  _deduplicateEdges(edges) {
    const seen = new Set();
    return edges.filter((e) => {
      const key = `${e.source}-${e.type}-${e.target}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Clear cache.
   */
  clearCache() {
    this._stepCache.clear();
  }

  /**
   * Format step context for display.
   *
   * @param {StepContext} context - Step context
   * @param {PlanStep} step - Original step
   * @returns {string}
   */
  static formatContext(context, step) {
    const lines = [];

    lines.push(`=== STEP CONTEXT: ${step.title} ===`);
    lines.push(`Confidence: ${context.confidence}%`);
    lines.push("");

    if (context.patterns.length > 0) {
      lines.push("📋 PATTERNS:");
      for (const p of context.patterns) {
        lines.push(`  • ${p.name} (${(p.confidence * 100).toFixed(0)}%)`);
        if (p.snippet) {
          lines.push(`    ${p.snippet.substring(0, 60)}...`);
        }
      }
      lines.push("");
    }

    if (context.risks.length > 0) {
      lines.push("⚠️ RISKS:");
      for (const risk of context.risks) {
        const emoji =
          risk.level === "critical"
            ? "🔴"
            : risk.level === "high"
              ? "🟠"
              : risk.level === "medium"
                ? "🟡"
                : "🟢";
        lines.push(`  ${emoji} [${risk.category}] ${risk.description}`);
        lines.push(`    Mitigation: ${risk.mitigation}`);
      }
      lines.push("");
    }

    if (context.dependencies.length > 0) {
      lines.push("🔗 DEPENDENCIES:");
      for (const dep of context.dependencies) {
        lines.push(`  • ${dep.dependsOn} (${dep.type})`);
      }
    }

    return lines.join("\n");
  }
}

// ─────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────

module.exports = {
  PlanContextLoader,
  RiskCategory,
  RiskLevel,
  CONFIG,
};
