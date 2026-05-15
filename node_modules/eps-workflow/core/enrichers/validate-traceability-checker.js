"use strict";

/**
 * Validate Traceability Checker for /validate Command (L2.6)
 *
 * Design-to-code traceability and coverage checking.
 * DD Reference: §5.4, §3.10.2 (IValidateTraceabilityChecker)
 *
 * Features:
 * - L2.6.1: Design-to-code trace
 * - L2.6.2: Coverage analysis
 * - L2.6.3: Gap detection
 * - L2.6.4: Breaking change detection
 *
 * @module validate-traceability-checker
 */

const GlobalGraphService = require('../rag/global-graph-service');

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

/**
 * Enricher configuration.
 */
const CONFIG = {
  designLayers: ["srs", "bd", "dd"],
  codeLayers: ["code"],
  minCoverage: 0.8, // 80% minimum
  breakingChangeThreshold: 0.9,
};

/**
 * Gap severity.
 */
const GapSeverity = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

/**
 * Change type.
 */
const ChangeType = {
  ADDITION: "addition",
  MODIFICATION: "modification",
  DELETION: "deletion",
  BREAKING: "breaking",
};

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

/**
 * @typedef {object} CodeReference
 * @property {string} id - Reference ID
 * @property {string} filePath - File path
 * @property {string} type - Entity type (class/function/interface)
 * @property {string} name - Entity name
 * @property {number} [lineNumber] - Line number
 */

/**
 * @typedef {object} TraceLink
 * @property {string} designId - Design element ID
 * @property {string} codeId - Code element ID
 * @property {string} designType - srs/bd/dd
 * @property {string} codeType - class/function/interface
 * @property {number} confidence - Trace confidence
 * @property {string} [method] - Trace method (name_match/semantic/explicit)
 */

/**
 * @typedef {object} CoverageReport
 * @property {number} totalDesignElements - Total design elements
 * @property {number} tracedElements - Elements with code traces
 * @property {number} coverage - Coverage percentage (0-1)
 * @property {object} byLayer - Coverage by design layer
 * @property {TraceLink[]} traces - All traces
 */

/**
 * @typedef {object} Gap
 * @property {string} id - Gap ID
 * @property {string} designId - Untraced design element
 * @property {string} description - Gap description
 * @property {string} severity - GapSeverity
 * @property {string} [suggestion] - Suggestion to fix
 */

/**
 * @typedef {object} BreakingChange
 * @property {string} id - Change ID
 * @property {string} codeId - Changed code element
 * @property {string} changeType - ChangeType
 * @property {string[]} affectedDesign - Affected design elements
 * @property {string} description - Change description
 * @property {number} impact - Impact score (0-1)
 */

/**
 * @typedef {object} ValidationResult
 * @property {CoverageReport} coverage - Coverage report
 * @property {Gap[]} gaps - Detected gaps
 * @property {BreakingChange[]} breakingChanges - Breaking changes
 * @property {object} meta - Validation metadata
 */

// ─────────────────────────────────────────────────────────────────
// Validate Traceability Checker
// ─────────────────────────────────────────────────────────────────

/**
 * Traceability checker for /validate command.
 * Implements IValidateTraceabilityChecker interface.
 */
class ValidateTraceabilityChecker {
  /**
   * Create a ValidateTraceabilityChecker.
   *
   * @param {object} [options] - Options
   */
  constructor(options = {}) {
    this._graphService =
      options.graphService || GlobalGraphService.getInstance();
    this._config = { ...CONFIG, ...options.config };
  }

  /**
   * Check traceability between design and code.
   * DD Reference: §5.4.1, L2.6.1-L2.6.4
   *
   * @param {CodeReference[]} codeRefs - Code references to check
   * @param {object} [options] - Options
   * @returns {Promise<ValidationResult>}
   */
  async check(codeRefs, options = {}) {
    const startTime = Date.now();
    const result = {
      coverage: null,
      gaps: [],
      breakingChanges: [],
      meta: {
        checkedAt: new Date().toISOString(),
        duration: 0,
        codeRefsCount: codeRefs.length,
      },
    };

    try {
      // Build coverage report
      result.coverage = await this._buildCoverageReport(codeRefs, options);

      // Detect gaps
      result.gaps = await this._detectGaps(result.coverage, options);

      // Detect breaking changes
      result.breakingChanges = await this._detectBreakingChanges(
        codeRefs,
        options,
      );

      result.meta.duration = Date.now() - startTime;
      result.meta.passed =
        result.coverage.coverage >= this._config.minCoverage &&
        result.breakingChanges.length === 0;
    } catch (err) {
      result.meta.error = err.message;
      result.meta.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Build coverage report.
   * DD Reference: L2.6.1, L2.6.2
   *
   * @param {CodeReference[]} codeRefs - Code references
   * @param {object} [options] - Options
   * @returns {Promise<CoverageReport>}
   * @private
   */
  async _buildCoverageReport(codeRefs, options = {}) {
    const report = {
      totalDesignElements: 0,
      tracedElements: 0,
      coverage: 0,
      byLayer: {},
      traces: [],
    };

    try {
      // Get all design elements from graph
      const designElements = await this._getDesignElements(options);
      report.totalDesignElements = designElements.length;

      // Initialize layer coverage
      for (const layer of this._config.designLayers) {
        report.byLayer[layer] = { total: 0, traced: 0, coverage: 0 };
      }

      // Count elements per layer
      for (const de of designElements) {
        const layer = de.layer || "dd";
        if (report.byLayer[layer]) {
          report.byLayer[layer].total++;
        }
      }

      // Find traces for each design element
      for (const de of designElements) {
        const traces = await this._findTraces(de, codeRefs);

        if (traces.length > 0) {
          report.tracedElements++;
          report.traces.push(...traces);

          const layer = de.layer || "dd";
          if (report.byLayer[layer]) {
            report.byLayer[layer].traced++;
          }
        }
      }

      // Calculate coverage
      report.coverage =
        report.totalDesignElements > 0
          ? report.tracedElements / report.totalDesignElements
          : 1;

      // Calculate layer coverage
      for (const layer of Object.keys(report.byLayer)) {
        const layerData = report.byLayer[layer];
        layerData.coverage =
          layerData.total > 0 ? layerData.traced / layerData.total : 1;
      }
    } catch (err) {
      console.warn(
        `[ValidateTraceabilityChecker] Coverage build failed: ${err.message}`,
      );
    }

    return report;
  }

  /**
   * Get design elements from graph.
   *
   * @param {object} [options] - Options
   * @returns {Promise<object[]>}
   * @private
   */
  async _getDesignElements(options = {}) {
    const elements = [];

    try {
      for (const layer of this._config.designLayers) {
        const result = await this._graphService.query(
          `${layer} requirement component`,
          {
            layer: "design",
            limit: 100,
          },
        );

        if (result && result.nodes) {
          for (const node of result.nodes) {
            elements.push({
              id: node.id,
              name: node.name || node.id,
              type: node.type,
              layer,
              attributes: node.attributes,
            });
          }
        }
      }
    } catch (err) {
      console.warn(
        `[ValidateTraceabilityChecker] Design element fetch failed: ${err.message}`,
      );
    }

    return elements;
  }

  /**
   * Find traces for a design element.
   *
   * @param {object} designElement - Design element
   * @param {CodeReference[]} codeRefs - Code references
   * @returns {Promise<TraceLink[]>}
   * @private
   */
  async _findTraces(designElement, codeRefs) {
    const traces = [];

    // Method 1: Name matching
    for (const codeRef of codeRefs) {
      const similarity = this._calculateNameSimilarity(
        designElement.name,
        codeRef.name,
      );

      if (similarity > 0.7) {
        traces.push({
          designId: designElement.id,
          codeId: codeRef.id,
          designType: designElement.layer,
          codeType: codeRef.type,
          confidence: similarity,
          method: "name_match",
        });
      }
    }

    // Method 2: Graph traversal (look for REALIZES edges)
    try {
      const traverseResult = await this._graphService.traverse(
        designElement.id,
        {
          depth: 2,
          edgeTypes: ["REALIZES", "IMPLEMENTS", "DEFINED_IN"],
          direction: "incoming",
        },
      );

      if (traverseResult && traverseResult.edges) {
        for (const edge of traverseResult.edges) {
          const codeRef = codeRefs.find(
            (cr) => cr.id === edge.source || cr.name === edge.source,
          );

          if (codeRef) {
            traces.push({
              designId: designElement.id,
              codeId: codeRef.id,
              designType: designElement.layer,
              codeType: codeRef.type,
              confidence: 0.95, // High confidence for explicit edges
              method: "explicit",
            });
          }
        }
      }
    } catch (err) {
      // Non-blocking
    }

    // Deduplicate traces
    return this._deduplicateTraces(traces);
  }

  /**
   * Calculate name similarity.
   * @private
   */
  _calculateNameSimilarity(name1, name2) {
    const normalize = (s) =>
      s
        .toLowerCase()
        .replace(/[-_]/g, "")
        .replace(/([a-z])([A-Z])/g, "$1$2")
        .toLowerCase();

    const n1 = normalize(name1);
    const n2 = normalize(name2);

    // Simple containment check
    if (n1.includes(n2) || n2.includes(n1)) {
      return 0.8;
    }

    // Word overlap
    const words1 = new Set(n1.split(/\W+/));
    const words2 = new Set(n2.split(/\W+/));
    const intersection = [...words1].filter((w) => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;

    return union > 0 ? intersection / union : 0;
  }

  /**
   * Deduplicate traces.
   * @private
   */
  _deduplicateTraces(traces) {
    const seen = new Map();

    for (const trace of traces) {
      const key = `${trace.designId}:${trace.codeId}`;

      if (!seen.has(key) || trace.confidence > seen.get(key).confidence) {
        seen.set(key, trace);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Detect gaps in traceability.
   * DD Reference: L2.6.3
   *
   * @param {CoverageReport} coverage - Coverage report
   * @param {object} [options] - Options
   * @returns {Promise<Gap[]>}
   * @private
   */
  async _detectGaps(coverage, options = {}) {
    const gaps = [];

    try {
      // Get all design elements
      const designElements = await this._getDesignElements(options);

      // Find untraced elements
      const tracedIds = new Set(coverage.traces.map((t) => t.designId));

      for (const de of designElements) {
        if (!tracedIds.has(de.id)) {
          gaps.push({
            id: `gap-${de.id}`,
            designId: de.id,
            description: `Design element "${de.name}" has no code implementation`,
            severity: this._classifyGapSeverity(de),
            suggestion: `Implement ${de.name} or create explicit trace link`,
          });
        }
      }
    } catch (err) {
      console.warn(
        `[ValidateTraceabilityChecker] Gap detection failed: ${err.message}`,
      );
    }

    return gaps;
  }

  /**
   * Classify gap severity.
   * @private
   */
  _classifyGapSeverity(designElement) {
    // SRS gaps are critical, DD gaps are less severe
    if (designElement.layer === "srs") return GapSeverity.CRITICAL;
    if (designElement.layer === "bd") return GapSeverity.HIGH;
    if (designElement.type === "FR" || designElement.type === "requirement") {
      return GapSeverity.HIGH;
    }
    return GapSeverity.MEDIUM;
  }

  /**
   * Detect breaking changes.
   * DD Reference: L2.6.4
   *
   * @param {CodeReference[]} codeRefs - Code references
   * @param {object} [options] - Options
   * @returns {Promise<BreakingChange[]>}
   * @private
   */
  async _detectBreakingChanges(codeRefs, options = {}) {
    const breakingChanges = [];

    try {
      // Query for breaking change indicators
      for (const codeRef of codeRefs.slice(0, 10)) {
        const result = await this._graphService.query(
          `${codeRef.name} breaking change impact`,
          {
            layer: "code",
            limit: 3,
          },
        );

        if (result && result.nodes) {
          for (const node of result.nodes) {
            if (
              node.type === "breaking_change" ||
              node.attributes?.isBreaking ||
              node.score > this._config.breakingChangeThreshold
            ) {
              breakingChanges.push({
                id: `break-${codeRef.id}-${node.id}`,
                codeId: codeRef.id,
                changeType: this._classifyChangeType(node),
                affectedDesign: node.attributes?.affectedDesign || [],
                description:
                  node.attributes?.description ||
                  `Potential breaking change in ${codeRef.name}`,
                impact: node.score || 0.8,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn(
        `[ValidateTraceabilityChecker] Breaking change detection failed: ${err.message}`,
      );
    }

    return breakingChanges;
  }

  /**
   * Classify change type.
   * @private
   */
  _classifyChangeType(node) {
    const name = (node.name || "").toLowerCase();
    const desc = (node.attributes?.description || "").toLowerCase();

    if (name.includes("delete") || desc.includes("remove")) {
      return ChangeType.DELETION;
    }
    if (name.includes("add") || desc.includes("new")) {
      return ChangeType.ADDITION;
    }
    if (name.includes("break") || desc.includes("incompatible")) {
      return ChangeType.BREAKING;
    }
    return ChangeType.MODIFICATION;
  }

  /**
   * Format validation result for display.
   *
   * @param {ValidationResult} result - Validation result
   * @returns {string}
   */
  static formatResult(result) {
    const lines = [];

    const passed = result.meta.passed;
    lines.push(
      `=== TRACEABILITY VALIDATION ${passed ? "PASSED ✅" : "FAILED ❌"} ===`,
    );
    lines.push(`Duration: ${result.meta.duration}ms`);
    lines.push("");

    // Coverage
    if (result.coverage) {
      const covPct = (result.coverage.coverage * 100).toFixed(1);
      lines.push(`📊 COVERAGE: ${covPct}%`);
      lines.push(
        `  Traced: ${result.coverage.tracedElements}/${result.coverage.totalDesignElements}`,
      );

      for (const [layer, data] of Object.entries(result.coverage.byLayer)) {
        if (data.total > 0) {
          const layerPct = (data.coverage * 100).toFixed(1);
          lines.push(
            `  ${layer.toUpperCase()}: ${layerPct}% (${data.traced}/${data.total})`,
          );
        }
      }
      lines.push("");
    }

    // Gaps
    if (result.gaps.length > 0) {
      lines.push(`⚠️ GAPS (${result.gaps.length}):`);
      for (const gap of result.gaps.slice(0, 5)) {
        const emoji =
          gap.severity === "critical"
            ? "🔴"
            : gap.severity === "high"
              ? "🟠"
              : "🟡";
        lines.push(`  ${emoji} ${gap.description}`);
        if (gap.suggestion) {
          lines.push(`    Suggestion: ${gap.suggestion}`);
        }
      }
      if (result.gaps.length > 5) {
        lines.push(`  ... and ${result.gaps.length - 5} more`);
      }
      lines.push("");
    }

    // Breaking changes
    if (result.breakingChanges.length > 0) {
      lines.push(`🔴 BREAKING CHANGES (${result.breakingChanges.length}):`);
      for (const bc of result.breakingChanges) {
        lines.push(`  • ${bc.description}`);
        lines.push(`    Impact: ${(bc.impact * 100).toFixed(0)}%`);
      }
    }

    return lines.join("\n");
  }
}

// ─────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────

module.exports = {
  ValidateTraceabilityChecker,
  GapSeverity,
  ChangeType,
  CONFIG,
};
