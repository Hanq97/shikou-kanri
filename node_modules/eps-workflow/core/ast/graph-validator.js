/**
 * Graph Validator - Quality Gates Q5-Q7
 * Validates graph completeness and consistency.
 */
const { QUALITY_RULES } = require('./graph-schema');
const GraphQuery = require('./graph-query');

class GraphValidator {
  constructor() {
    this.query = new GraphQuery();
  }

  /**
   * Check a specific quality rule
   * @param {GraphStore} store
   * @param {string} ruleId - 'Q5_FR_COVERAGE' | 'Q6_COMP_ORPHAN' | 'Q7_API_TESTED'
   * @returns {{ ruleId, pass, score, threshold, severity, details, uncoveredIds }}
   */
  checkCoverage(store, ruleId) {
    const rule = QUALITY_RULES[ruleId];
    if (!rule) throw new Error(`Unknown quality rule: ${ruleId}`);

    const result = this.query.getCoverage(
      store, rule.nodeType, rule.edgeType, rule.direction
    );

    return {
      ruleId,
      pass: result.coverage >= rule.threshold,
      score: result.coverage,
      threshold: rule.threshold,
      severity: rule.severity,
      details: `${result.covered}/${result.total} ${rule.nodeType} nodes have ${rule.edgeType} edges`,
      uncoveredIds: result.uncoveredIds,
    };
  }

  /**
   * Find orphaned nodes (nodes with no edges at all)
   * @param {GraphStore} store
   * @param {string|null} nodeType - Optional filter by type
   * @returns {string[]} IDs of orphaned nodes
   */
  findOrphans(store, nodeType = null) {
    const nodes = nodeType
      ? store.filterNodes((k, a) => a.type === nodeType)
      : store.filterNodes(() => true);

    return nodes
      .filter(n => {
        const neighbors = store.neighbors(n.key);
        return neighbors.length === 0;
      })
      .map(n => n.key);
  }

  /**
   * Check cross-type consistency
   * @param {GraphStore} store
   * @returns {{ pass: boolean, violations: object[] }}
   */
  checkConsistency(store) {
    const violations = [];

    // Check: placeholder nodes (created during edge addition for missing targets)
    const placeholders = store.filterNodes((k, a) => a.placeholder === true);
    if (placeholders.length > 0) {
      violations.push({
        type: 'PLACEHOLDER_NODES',
        severity: 'warning',
        message: `${placeholders.length} placeholder nodes (referenced but not extracted)`,
        ids: placeholders.map(n => n.key),
      });
    }

    return {
      pass: violations.filter(v => v.severity === 'error').length === 0,
      violations,
    };
  }

  /**
   * Generate full quality report
   * @param {GraphStore} store
   * @returns {string} Formatted report
   */
  generateReport(store) {
    const stats = store.getStats();
    const q5 = this.checkCoverage(store, 'Q5_FR_COVERAGE');
    const q6 = this.checkCoverage(store, 'Q6_COMP_ORPHAN');
    const q7 = this.checkCoverage(store, 'Q7_API_TESTED');
    const consistency = this.checkConsistency(store);
    const orphans = this.findOrphans(store);

    return [
      '=== GraphRAG Quality Report ===',
      `Nodes: ${stats.nodes} | Edges: ${stats.edges}`,
      `Node Types: ${JSON.stringify(stats.nodeTypes)}`,
      `Edge Types: ${JSON.stringify(stats.edgeTypes)}`,
      '',
      `Q5 FR Coverage: ${q5.pass ? 'PASS' : 'FAIL'} (${(q5.score * 100).toFixed(1)}% >= ${q5.threshold * 100}%)`,
      q5.uncoveredIds.length > 0 ? `   Uncovered: ${q5.uncoveredIds.join(', ')}` : '',
      `Q6 Component Orphans: ${q6.pass ? 'PASS' : 'FAIL'} (${(q6.score * 100).toFixed(1)}%)`,
      q6.uncoveredIds.length > 0 ? `   Uncovered: ${q6.uncoveredIds.join(', ')}` : '',
      `Q7 API Tested: ${q7.pass ? 'PASS' : 'FAIL'} (${(q7.score * 100).toFixed(1)}%)`,
      q7.uncoveredIds.length > 0 ? `   Uncovered: ${q7.uncoveredIds.join(', ')}` : '',
      '',
      `Consistency: ${consistency.pass ? 'PASS' : 'FAIL'} (${consistency.violations.length} violations)`,
      `Orphan Nodes: ${orphans.length}`,
      orphans.length > 0 ? `   Orphans: ${orphans.join(', ')}` : '',
      '=== End Report ===',
    ].filter(line => line !== '').join('\n');
  }
}

module.exports = GraphValidator;
