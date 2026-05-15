'use strict';

/**
 * reverse-dd-generator.js — Generate DD document from code analysis.
 *
 * Layer: L6 ENGINE
 * Pattern: 3-stage pipeline [BD D3]
 *   Stage 1: AST extraction (from scanResult)
 *   Stage 2: LLM abstraction (optional — placeholder)
 *   Stage 3: Confidence marking
 */

const { markSection, categorize, generateSummary } = require('./confidence-marker.js');

class ReverseDDGenerator {
  /**
   * @param {string} pkgRoot - Package root directory
   */
  constructor(pkgRoot) {
    this.pkgRoot = pkgRoot;
  }

  /**
   * Generate reverse-engineered DD from a ScanResult.
   *
   * @param {object} scanResult - ScanResult from analysis-pipeline
   * @param {object} [options]
   * @param {boolean} [options.llmEnabled] - Enable LLM abstraction stage
   * @returns {{ document: string, confidenceReport: object, sections: object[] }}
   */
  async generate(scanResult, options) {
    options = options || {};

    // Stage 1: Assemble sections from scan data
    const sections = this.assembleSections(scanResult);

    // Stage 2: LLM abstraction (placeholder — actual impl in future)
    if (options.llmEnabled) {
      // Would invoke LLM to improve section descriptions
      // For now, pass through unchanged
    }

    // Stage 3: Mark confidence levels
    const markedSections = this.markConfidence(sections);

    // Generate markdown document
    const document = _buildMarkdown(scanResult.moduleId, markedSections);

    // Confidence report
    const confidenceReport = generateSummary(markedSections);

    return { document, confidenceReport, sections: markedSections };
  }

  /**
   * Map ScanResult fields to DD template sections.
   *
   * @param {object} scanResult
   * @returns {object[]} sections
   */
  assembleSections(scanResult) {
    const sections = [];

    // §1 Overview
    sections.push({
      id: 'overview',
      title: '1. Overview',
      content: _buildOverview(scanResult),
      confidence: scanResult.confidenceScore ? scanResult.confidenceScore * 100 : 50,
    });

    // §2 Core Logic / Business Rules
    const rules = scanResult.businessRules || [];
    const rulesContent = _buildRulesSection(rules);
    const rulesConfidence = rules.length > 0
      ? Math.round(rules.reduce((sum, r) => sum + (r.confidence || 50), 0) / rules.length)
      : 0;
    sections.push({
      id: 'core-logic',
      title: '2. Core Logic',
      content: rulesContent,
      confidence: rulesConfidence,
    });

    // §3 API Contracts
    const contracts = scanResult.apiContracts || [];
    sections.push({
      id: 'api-contracts',
      title: '3. API Contracts',
      content: _buildApiSection(contracts),
      confidence: contracts.length > 0 ? 90 : 0,
    });

    // §4 Data Model
    const entities = scanResult.entities || [];
    sections.push({
      id: 'data-model',
      title: '4. Data Model',
      content: _buildDataModelSection(entities),
      confidence: entities.length > 0 ? 90 : 0,
    });

    // §5 Integration Points / Dependencies
    const deps = scanResult.dependencies || [];
    sections.push({
      id: 'integration',
      title: '5. Integration Points',
      content: _buildDepsSection(deps),
      confidence: deps.length > 0 ? 85 : 0,
    });

    return sections;
  }

  /**
   * Apply EXTRACTED/INFERRED/MISSING markers to sections.
   *
   * @param {object[]} sections
   * @returns {object[]} sections with level markers
   */
  markConfidence(sections) {
    return sections.map(section => {
      const level = categorize(section.confidence);
      const markedContent = markSection(section.content, level);
      return {
        ...section,
        level,
        content: markedContent,
      };
    });
  }
}

// ── Section Builders ──────────────────────────────────────────────────────────

function _buildOverview(scanResult) {
  const components = scanResult.components || {};
  const lines = [
    '**Module**: ' + (scanResult.moduleId || 'Unknown'),
    '',
    '**Components Discovered**:',
    '- Controllers: ' + ((components.controllers || []).length),
    '- Services: ' + ((components.services || []).length),
    '- Repositories: ' + ((components.repositories || []).length),
    '- Entities: ' + ((components.entities || []).length),
    '- DTOs: ' + ((components.dtos || []).length),
    '- Frontend Components: ' + ((components.frontendComponents || []).length),
    '',
    '**Overall Confidence**: ' + ((scanResult.confidenceScore || 0) * 100).toFixed(0) + '%',
  ];
  return lines.join('\n');
}

function _buildRulesSection(rules) {
  if (rules.length === 0) return '_No business rules extracted._';

  const lines = ['| # | Rule | Source | Confidence | Location |', '|---|------|--------|------------|----------|'];
  rules.forEach((r, i) => {
    const location = (r.className || '') + (r.method ? '.' + r.method + '()' : '');
    lines.push('| ' + (i + 1) + ' | ' + r.description + ' | ' + r.source + ' | ' + r.confidence + '% | ' + location + ' |');
  });
  return lines.join('\n');
}

function _buildApiSection(contracts) {
  if (contracts.length === 0) return '_No API contracts extracted._';

  const lines = ['| Method | Path | Handler | Return Type |', '|--------|------|---------|-------------|'];
  for (const c of contracts) {
    lines.push('| ' + c.method + ' | ' + c.path + ' | ' + c.handler + ' | ' + (c.returnType || '-') + ' |');
  }
  return lines.join('\n');
}

function _buildDataModelSection(entities) {
  if (entities.length === 0) return '_No data model extracted._';

  const lines = [];
  for (const entity of entities) {
    lines.push('### ' + entity.name);
    lines.push('');
    lines.push('| Field | Type | Constraints |');
    lines.push('|-------|------|-------------|');
    for (const f of (entity.fields || [])) {
      lines.push('| ' + f.name + ' | ' + f.type + ' | ' + (f.constraints || []).join(', ') + ' |');
    }
    lines.push('');
  }
  return lines.join('\n');
}

function _buildDepsSection(deps) {
  if (deps.length === 0) return '_No dependencies extracted._';

  const lines = ['| From | To | Type |', '|------|-----|------|'];
  for (const d of deps) {
    lines.push('| ' + d.from + ' | ' + d.to + ' | ' + d.type + ' |');
  }
  return lines.join('\n');
}

function _buildMarkdown(moduleId, sections) {
  const lines = [
    '# Reverse-Engineered Detail Design: ' + (moduleId || 'Unknown'),
    '',
    '> Auto-generated by ETF Analysis Pipeline',
    '> Confidence markers: EXTRACTED (≥90%) | INFERRED (55-89%) | MISSING (<55%)',
    '',
    '---',
    '',
  ];

  for (const section of sections) {
    lines.push('## ' + section.title);
    lines.push('');
    lines.push(section.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = { ReverseDDGenerator };
