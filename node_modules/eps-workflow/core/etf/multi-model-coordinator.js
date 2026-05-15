'use strict';

/**
 * multi-model-coordinator.js — Claude + Gemini sequential coordination.
 *
 * Layer: L5 SKILL
 * Pattern: Sequential Delegation [DD Decision D18]
 *
 * Claude: deep business logic (REQUIRED — current LLM)
 * Gemini: edge case breadth (OPTIONAL — via GeminiIntegrator)
 * Cross-validate: HIGH/MEDIUM/LOW confidence per case
 *
 * Quality levels:
 *   FULL     — Claude + Gemini + cross-validation
 *   DEGRADED — Claude only (Gemini unavailable)
 *   MINIMAL  — AST-only (no LLM)
 */

const path = require('path');

class MultiModelCoordinator {
  /**
   * @param {string} pkgRoot - Package root directory
   * @param {object} [options]
   * @param {boolean} [options.geminiEnabled] - Enable Gemini supplement
   * @param {boolean} [options.crossValidate] - Enable cross-validation
   * @param {object} [options.geminiIntegrator] - Injected Gemini integrator (testing)
   * @param {Function} [options.claudeAnalyzer] - Injected Claude analyzer (testing)
   */
  constructor(pkgRoot, options) {
    options = options || {};
    this.pkgRoot = pkgRoot;
    this.geminiEnabled = options.geminiEnabled !== undefined ? options.geminiEnabled : true;
    this.crossValidateEnabled = options.crossValidate !== undefined ? options.crossValidate : true;
    this._geminiIntegrator = options.geminiIntegrator || null;
    this._claudeAnalyzer = options.claudeAnalyzer || null;
  }

  /**
   * Coordinate multi-model analysis.
   *
   * @param {object} scanResult - Scan result from analysis pipeline
   * @param {string} task - Task type: "test-plan" | "edge-cases"
   * @param {object} context - Additional context
   * @returns {Promise<{claudeResult: any, geminiResult: any, qualityLevel: string}>}
   */
  async coordinate(scanResult, task, context) {
    let claudeResult = null;
    let geminiResult = null;
    let qualityLevel = 'MINIMAL';

    // Step 1: Claude analysis (REQUIRED)
    try {
      claudeResult = await this.claudeAnalyze(scanResult, task, context);
      qualityLevel = 'DEGRADED';
    } catch {
      // Claude unavailable — MINIMAL mode (AST-only)
      return {
        claudeResult: this._generateASTOnlyResult(scanResult),
        geminiResult: null,
        qualityLevel: 'MINIMAL',
      };
    }

    // Step 2: Gemini supplement (OPTIONAL)
    if (this.geminiEnabled) {
      try {
        geminiResult = await this.geminiSupplement(claudeResult, scanResult, context);
        qualityLevel = 'FULL';
      } catch {
        // Gemini unavailable — DEGRADED mode (Claude-only)
        geminiResult = null;
      }
    }

    // Step 3: Cross-validate
    if (this.crossValidateEnabled && claudeResult && geminiResult) {
      const merged = this.crossValidate(claudeResult, geminiResult);
      return {
        claudeResult: merged.claudeItems,
        geminiResult: merged.geminiItems,
        qualityLevel,
        result: merged.all,
      };
    }

    return { claudeResult, geminiResult, qualityLevel };
  }

  /**
   * Claude analysis — generates baseline test cases from business logic.
   * Since Claude IS the current LLM, this produces structured output
   * from the scan result data.
   *
   * @param {object} scanResult
   * @param {string} task
   * @param {object} context
   * @returns {Promise<object[]>} Test case suggestions
   */
  async claudeAnalyze(scanResult, task, context) {
    // If custom analyzer injected (testing), use it
    if (this._claudeAnalyzer) {
      return this._claudeAnalyzer(scanResult, task, context);
    }

    // Default: generate structured test cases from scan data
    // In production, this would be a Claude API call with scan context
    return this._generateClaudeTestCases(scanResult, context);
  }

  /**
   * Gemini supplement — discovers edge cases and boundary conditions.
   *
   * @param {object} claudeResult - Claude's baseline test cases
   * @param {object} scanResult - Original scan result
   * @param {object} context
   * @returns {Promise<object[]>} Supplementary edge case suggestions
   */
  async geminiSupplement(claudeResult, scanResult, context) {
    const integrator = this._getGeminiIntegrator();
    if (!integrator) {
      throw new Error('Gemini integrator not available');
    }

    const prompt = this._buildGeminiPrompt(claudeResult, scanResult, context);
    const response = await integrator.generateContent(prompt);

    // Parse Gemini response into structured test cases
    return this._parseGeminiResponse(response);
  }

  /**
   * Cross-validate Claude and Gemini results.
   *
   * @param {object[]} claudeResult - Claude test cases
   * @param {object[]} geminiResult - Gemini test cases
   * @returns {{all: object[], claudeItems: object[], geminiItems: object[]}}
   */
  crossValidate(claudeResult, geminiResult) {
    const claudeItems = Array.isArray(claudeResult) ? claudeResult : [];
    const geminiItems = Array.isArray(geminiResult) ? geminiResult : [];
    const all = [];

    // Mark Claude items
    for (const item of claudeItems) {
      const overlap = geminiItems.find(g =>
        this._isSimilarCase(item, g)
      );

      all.push({
        ...item,
        confidence: overlap ? 'HIGH' : 'MEDIUM',
        source: overlap ? 'both' : 'claude',
      });
    }

    // Add unique Gemini items
    for (const item of geminiItems) {
      const overlap = claudeItems.find(c =>
        this._isSimilarCase(c, item)
      );

      if (!overlap) {
        all.push({
          ...item,
          confidence: 'LOW',
          source: 'gemini',
        });
      }
    }

    return {
      all,
      claudeItems: claudeItems.map(c => ({
        ...c,
        confidence: all.find(a => a.id === c.id)?.confidence || 'MEDIUM',
      })),
      geminiItems: geminiItems.map(g => ({
        ...g,
        confidence: all.find(a => a.id === g.id)?.confidence || 'LOW',
      })),
    };
  }

  // ── Internal Helpers ───────────────────────────────────────────────────

  _generateClaudeTestCases(scanResult, context) {
    const cases = [];
    const moduleId = context.moduleId || scanResult.moduleId || '';

    // From API contracts
    for (const api of (scanResult.apiContracts || [])) {
      cases.push({
        id: 'CL-API-' + (cases.length + 1),
        name: api.method + ' ' + api.path + ' - success',
        description: 'Test ' + api.handler + ' returns expected response',
        level: 'integration',
        type: 'normal',
        targetComponent: api.handler || '',
      });

      cases.push({
        id: 'CL-API-' + (cases.length + 1),
        name: api.method + ' ' + api.path + ' - validation error',
        description: 'Test ' + api.handler + ' rejects invalid request',
        level: 'integration',
        type: 'abnormal',
        targetComponent: api.handler || '',
      });
    }

    // From business rules
    for (const rule of (scanResult.businessRules || [])) {
      cases.push({
        id: 'CL-BR-' + (cases.length + 1),
        name: 'Rule: ' + (rule.description || '').substring(0, 60),
        description: 'Verify business rule: ' + rule.description,
        level: 'unit',
        type: 'normal',
        targetComponent: rule.className || '',
      });
    }

    // From entities
    for (const entity of (scanResult.entities || [])) {
      cases.push({
        id: 'CL-ENT-' + (cases.length + 1),
        name: entity.name + ' persistence',
        description: 'Test ' + entity.name + ' CRUD and validation',
        level: 'integration',
        type: 'normal',
        targetComponent: entity.name || '',
      });
    }

    return cases;
  }

  _generateASTOnlyResult(scanResult) {
    // Minimal test cases from AST data only
    const cases = [];

    for (const api of (scanResult.apiContracts || [])) {
      cases.push({
        id: 'AST-' + (cases.length + 1),
        name: api.handler + ' endpoint test',
        description: 'Basic test for ' + api.method + ' ' + api.path,
        level: 'integration',
        type: 'normal',
        targetComponent: api.handler || '',
        confidence: 'LOW',
      });
    }

    return cases;
  }

  _buildGeminiPrompt(claudeResult, scanResult, context) {
    const claudeSummary = Array.isArray(claudeResult)
      ? claudeResult.map(c => '- ' + c.name).join('\n')
      : 'No Claude results';

    return `Analyze the following module for edge cases and boundary conditions.

Module: ${context.moduleId || ''}
API Contracts: ${(scanResult.apiContracts || []).length}
Business Rules: ${(scanResult.businessRules || []).length}
Entities: ${(scanResult.entities || []).length}

Existing test cases from primary analysis:
${claudeSummary}

Generate additional edge cases covering:
1. Boundary values
2. Concurrency issues
3. Error propagation
4. Data integrity
5. Security edge cases

Return as JSON array: [{id, name, description, level, type}]`;
  }

  _parseGeminiResponse(response) {
    if (!response) return [];

    const text = typeof response === 'string' ? response
      : (response.text ? (typeof response.text === 'function' ? response.text() : response.text)
        : JSON.stringify(response));

    // Try to extract JSON array from response
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((item, i) => ({
          id: item.id || ('GEM-' + (i + 1)),
          name: item.name || 'Edge case ' + (i + 1),
          description: item.description || '',
          level: item.level || 'unit',
          type: item.type || 'abnormal',
          targetComponent: item.targetComponent || '',
        }));
      }
    } catch {
      // JSON parse failed
    }

    return [];
  }

  _isSimilarCase(a, b) {
    // Simple similarity: check if names share significant keywords
    const wordsA = (a.name || '').toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const wordsB = (b.name || '').toLowerCase().split(/\W+/).filter(w => w.length > 3);

    let overlap = 0;
    for (const w of wordsA) {
      if (wordsB.includes(w)) overlap++;
    }

    const total = Math.max(wordsA.length, wordsB.length);
    return total > 0 && (overlap / total) > 0.5;
  }

  _getGeminiIntegrator() {
    if (this._geminiIntegrator) return this._geminiIntegrator;

    // Try loading from core/gemini/
    try {
      const GeminiIntegrator = require(path.join(this.pkgRoot, 'core', 'gemini', 'gemini-integrator.js'));
      if (GeminiIntegrator && GeminiIntegrator.prototype) {
        this._geminiIntegrator = new GeminiIntegrator();
      } else if (typeof GeminiIntegrator === 'object') {
        this._geminiIntegrator = GeminiIntegrator;
      }
      return this._geminiIntegrator;
    } catch {
      return null;
    }
  }
}

module.exports = { MultiModelCoordinator };
