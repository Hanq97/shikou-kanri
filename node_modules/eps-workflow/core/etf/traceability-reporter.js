'use strict';

/**
 * traceability-reporter.js — DD requirement -> test case -> coverage -> mismatch report.
 *
 * Layer: L5 SKILL
 *
 * Responsibilities:
 * - Build traceability matrix (DD requirement -> test case -> coverage %)
 * - Detect mismatches: DD<->DB (from crossValidation), DD<->Code (from ragCrossRef)
 * - Detect uncovered requirements and orphan tests
 * - Generate JSON + markdown reports
 */

const schemas = require('./schemas.js');

class TraceabilityReporter {
  /**
   * Build traceability matrix from DD requirements and generated test plan.
   *
   * @param {object} ddMetadata - DDMetadata (requirements source)
   * @param {object} testPlan - TestPlan with test cases referencing ddRequirement
   * @param {object} [validationReport] - ValidationReport with coverage data
   * @returns {object} TraceabilityMatrix (from schemas.js)
   */
  buildMatrix(ddMetadata, testPlan, validationReport) {
    if (!ddMetadata || !testPlan) {
      return schemas.createTraceabilityMatrix({ mappings: [], summary: {} });
    }

    const requirements = this._extractRequirements(ddMetadata);
    const testCases = testPlan.testCases || [];
    const mappings = [];

    for (const req of requirements) {
      const matching = testCases.filter(tc =>
        tc.ddRequirement === req.id ||
        tc.ddRequirement === req.description ||
        (tc.name && tc.name.includes(req.id))
      );

      const coveragePercent = matching.length > 0
        ? this._calcCoverage(matching, validationReport)
        : 0;

      mappings.push({
        ddRequirement: req.id,
        description: req.description,
        type: req.type,
        testCaseIds: matching.map(tc => tc.id),
        coveragePercent,
      });
    }

    const allReqIds = new Set(requirements.map(r => r.id));
    const allReqDescs = new Set(requirements.map(r => r.description));
    const orphanTests = testCases.filter(tc =>
      !tc.ddRequirement ||
      (!allReqIds.has(tc.ddRequirement) && !allReqDescs.has(tc.ddRequirement))
    );

    const covered = mappings.filter(m => m.testCaseIds.length > 0);
    const uncovered = mappings.filter(m => m.testCaseIds.length === 0);

    const summary = {
      totalRequirements: requirements.length,
      coveredRequirements: covered.length,
      uncoveredRequirements: uncovered.length,
      orphanTests: orphanTests.length,
      mismatchCount: 0,
      coveragePercent: requirements.length > 0
        ? Math.round((covered.length / requirements.length) * 100)
        : 0,
    };

    return schemas.createTraceabilityMatrix({ mappings, mismatches: [], summary });
  }

  _extractRequirements(ddMetadata) {
    const requirements = [];

    for (const rule of (ddMetadata.businessRules || [])) {
      requirements.push({
        id: rule.id || ('BR-' + (requirements.length + 1)),
        description: rule.description || '',
        type: 'business_rule',
      });
    }

    for (const api of (ddMetadata.apiSpecs || [])) {
      requirements.push({
        id: 'API-' + api.method + '-' + (api.path || '').replace(/\//g, '_'),
        description: api.method + ' ' + api.path,
        type: 'api_spec',
      });
    }

    for (const err of (ddMetadata.errorCodes || [])) {
      requirements.push({
        id: err.code,
        description: err.message || err.code,
        type: 'error_code',
      });
    }

    for (const wf of (ddMetadata.workflows || [])) {
      requirements.push({
        id: (wf.name || 'WF') + '_SM',
        description: 'State machine: ' + (wf.name || 'unnamed') + ' (' + (wf.states || []).length + ' states)',
        type: 'workflow',
      });
    }

    for (const entity of (ddMetadata.entities || [])) {
      requirements.push({
        id: entity.name + '_EP',
        description: 'Data validation: ' + entity.name + ' (' + (entity.fields || []).length + ' fields)',
        type: 'entity_validation',
      });
      requirements.push({
        id: entity.name + '_BVA',
        description: 'Boundary values: ' + entity.name,
        type: 'entity_boundary',
      });
    }

    return requirements;
  }

  _calcCoverage(testCases, validationReport) {
    if (!testCases || testCases.length === 0) return 0;

    if (validationReport && validationReport.runResult) {
      const run = validationReport.runResult;
      const total = (run.passed || 0) + (run.failed || 0);
      return total > 0 ? Math.round((run.passed / total) * 100) : 0;
    }

    return 100;
  }

  /**
   * Detect mismatches across DD <-> DB <-> Code.
   */
  detectMismatches(ddMetadata, dbSchema, ragCrossRef) {
    const mismatches = [];

    if (!ddMetadata) return mismatches;

    // 1. DD <-> DB mismatches
    if (dbSchema && dbSchema.tables) {
      for (const entity of (ddMetadata.entities || [])) {
        const tableName = entity.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const table = dbSchema.tables.find(t =>
          t.name.toLowerCase().replace(/_/g, '') === tableName.replace(/_/g, '')
        );

        if (!table) {
          mismatches.push({
            type: 'missing_table',
            source: 'DD',
            target: 'DB',
            description: 'DD entity "' + entity.name + '" has no matching DB table',
          });
        } else {
          for (const field of (entity.fields || [])) {
            const column = table.columns.find(c =>
              c.name.toLowerCase().replace(/_/g, '') === field.name.toLowerCase().replace(/_/g, '')
            );
            if (!column) {
              mismatches.push({
                type: 'missing_column',
                source: 'DD',
                target: 'DB',
                description: 'DD field "' + entity.name + '.' + field.name + '" not found in DB table',
              });
            }
          }
        }
      }
    }

    // 2. DD <-> Code mismatches (from RAG graph)
    if (ragCrossRef && Array.isArray(ragCrossRef)) {
      for (const rule of (ddMetadata.businessRules || [])) {
        const ruleId = rule.id || '';
        const implemented = ragCrossRef.find(ref =>
          ref.ddRequirement === ruleId || (ref.text && ref.text.includes(ruleId))
        );

        if (!implemented) {
          mismatches.push({
            type: 'unimplemented_rule',
            source: 'DD',
            target: 'Code',
            description: 'DD business rule "' + ruleId + ': ' + (rule.description || '').substring(0, 80) + '" — no matching implementation found',
          });
        }
      }

      // 3. Code without DD (orphan implementations)
      const ddRuleIds = new Set((ddMetadata.businessRules || []).map(r => r.id).filter(Boolean));
      for (const ref of ragCrossRef) {
        if (ref.ddRequirement && !ddRuleIds.has(ref.ddRequirement)) {
          mismatches.push({
            type: 'orphan_implementation',
            source: 'Code',
            target: 'DD',
            description: 'Code references DD requirement "' + ref.ddRequirement + '" which does not exist in DD',
          });
        }
      }
    }

    return mismatches;
  }

  generateReport(matrix) {
    const json = JSON.stringify(matrix, null, 2);
    const markdown = this._renderMarkdown(matrix);
    return { json, markdown };
  }

  _renderMarkdown(matrix) {
    const lines = [];
    lines.push('# Traceability Report');
    lines.push('');
    lines.push('Generated: ' + new Date().toISOString());
    lines.push('');

    const s = matrix.summary || {};
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push('| Total DD Requirements | ' + (s.totalRequirements || 0) + ' |');
    lines.push('| Covered | ' + (s.coveredRequirements || 0) + ' |');
    lines.push('| Uncovered | ' + (s.uncoveredRequirements || 0) + ' |');
    lines.push('| Orphan Tests | ' + (s.orphanTests || 0) + ' |');
    lines.push('| Mismatches | ' + (s.mismatchCount || 0) + ' |');
    lines.push('| Coverage | ' + (s.coveragePercent || 0) + '% |');
    lines.push('');

    lines.push('## Coverage Matrix');
    lines.push('');
    lines.push('| DD Requirement | Type | Test Cases | Coverage |');
    lines.push('|---------------|------|------------|----------|');

    for (const m of (matrix.mappings || [])) {
      const status = m.testCaseIds.length > 0 ? 'Y' : 'N';
      lines.push('| ' + status + ' ' + m.ddRequirement + ' | ' + (m.type || '-') + ' | ' + m.testCaseIds.length + ' | ' + m.coveragePercent + '% |');
    }
    lines.push('');

    const uncovered = (matrix.mappings || []).filter(m => m.testCaseIds.length === 0);
    if (uncovered.length > 0) {
      lines.push('## Uncovered Requirements');
      lines.push('');
      for (const u of uncovered) {
        lines.push('- **' + u.ddRequirement + '**: ' + (u.description || ''));
      }
      lines.push('');
    }

    if (matrix.mismatches && matrix.mismatches.length > 0) {
      lines.push('## Mismatches');
      lines.push('');
      lines.push('| Type | Source > Target | Description |');
      lines.push('|------|----------------|-------------|');
      for (const mm of matrix.mismatches) {
        lines.push('| ' + mm.type + ' | ' + mm.source + ' > ' + mm.target + ' | ' + mm.description + ' |');
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

module.exports = { TraceabilityReporter };
