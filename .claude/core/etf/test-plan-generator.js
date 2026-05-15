'use strict';

/**
 * test-plan-generator.js — Multi-model test plan generation.
 *
 * Layer: L2 MICRO-CMD
 * Pattern: Sequential Delegation [DD Decision D18]
 *
 * Claude: deep business logic → baseline test cases
 * Gemini: edge case discovery → supplementary cases
 * Cross-validate: overlapping → HIGH, unique → review
 * Abnormal ratio enforced ≥ 40% (BR-TPIP-006)
 */

const path = require('path');
const schemas = require('./schemas.js');

class TestPlanGenerator {
  /**
   * @param {string} pkgRoot - Package root directory
   * @param {object} [options]
   * @param {object} [options.coordinator] - Multi-model coordinator instance (injected for testing)
   */
  constructor(pkgRoot, options) {
    options = options || {};
    this.pkgRoot = pkgRoot;
    this._coordinator = options.coordinator || null;
  }

  /**
   * Generate test plan from scan result.
   *
   * @param {object} scanResult - From SP-2 analysis pipeline
   * @param {object} moduleContext - Module context with metadata
   * @returns {Promise<object>} TestPlan (SP-1 schema)
   */
  async generate(scanResult, moduleContext) {
    // DD_FIRST: Use DD requirements as primary input for test plan
    if (scanResult.mode === 'DD_FIRST' && scanResult.ddMetadata) {
      return this._generateDDFirst(scanResult, moduleContext);
    }

    // CODE_FIRST: Existing logic (unchanged)
    const coordinator = this._getCoordinator();

    // Multi-model analysis: Claude primary, Gemini supplements
    const analysis = await coordinator.coordinate(scanResult, 'test-plan', {
      moduleId: moduleContext.moduleId || scanResult.moduleId,
      apiContracts: scanResult.apiContracts || [],
      entities: scanResult.entities || [],
      businessRules: scanResult.businessRules || [],
      dependencies: scanResult.dependencies || [],
    });

    // Build raw test cases from analysis
    const rawCases = this._buildRawCases(analysis, scanResult);

    // Classify by level and type
    const classified = this.classifyTestCases(rawCases);

    // Enforce abnormal ratio >= 40%
    const enforced = this._enforceAbnormalRatio(classified);

    // Map to specialists
    const stack = this._detectStack(scanResult);
    const mapped = this.mapToSpecialists(enforced, stack);

    // Build TestPlan using SP-1 schema
    return schemas.createTestPlan({
      moduleId: scanResult.moduleId,
      testCases: mapped,
      coverageMatrix: this._buildCoverageMatrix(mapped, scanResult),
      qualityLevel: analysis.qualityLevel || 'FULL',
      claudeAnalysis: analysis.claudeResult || null,
      geminiEdgeCases: analysis.geminiResult || null,
    });
  }

  /**
   * Classify test cases by level and type.
   *
   * @param {object[]} rawCases
   * @returns {object[]} Classified test cases
   */
  classifyTestCases(rawCases) {
    return rawCases.map(tc => {
      // Level classification
      if (!tc.level) {
        tc.level = this._classifyLevel(tc);
      }

      // Type classification: normal (happy path) vs abnormal (error/edge)
      if (!tc.type) {
        tc.type = this._classifyType(tc);
      }

      return tc;
    });
  }

  /**
   * Map test cases to relevant specialists.
   *
   * @param {object[]} testCases
   * @param {string} stack - "java-reactive" or "typescript-nextjs"
   * @returns {object[]} Test cases with specialist mappings
   */
  mapToSpecialists(testCases, stack) {
    return testCases.map(tc => {
      const specialistId = this._resolveSpecialist(tc, stack);
      return { ...tc, specialistId };
    });
  }

  // ── DD-First Generation ──────────────────────────────────────────────

  /**
   * Generate test plan using DD requirements as primary input.
   * Uses TestDataGenerator (EP+BVA) and TestFlowBuilder (scenarios).
   */
  async _generateDDFirst(scanResult, moduleContext) {
    const ddMetadata = scanResult.ddMetadata;
    const moduleId = moduleContext.moduleId || scanResult.moduleId;

    // 1. Generate test data (EP + BVA)
    const { TestDataGenerator } = require('./test-data-generator.js');
    const dataGen = new TestDataGenerator(moduleId);
    const testDataFixture = dataGen.generate(ddMetadata, scanResult.dbSchemaMetadata);

    // 2. Build test scenarios from DD workflows + API specs
    const { TestFlowBuilder } = require('./test-flow-builder.js');
    const flowBuilder = new TestFlowBuilder();
    const testScenarios = flowBuilder.buildScenarios(ddMetadata);
    const e2eFlows = flowBuilder.buildE2EFlows(ddMetadata);

    // 3. Build test cases from DD data
    const rawCases = [];

    // 3a. From DD business rules -> unit tests
    for (const rule of (ddMetadata.businessRules || [])) {
      rawCases.push({
        id: 'TC-DD-BR-' + (rawCases.length + 1),
        name: 'Business rule: ' + (rule.description || '').substring(0, 60),
        description: rule.description || '',
        level: 'unit',
        type: 'normal',
        source: 'dd',
        confidence: 'HIGH',
        ddRequirement: rule.id || ('BR-' + (rawCases.length + 1)),
        targetComponent: '',
      });
    }

    // 3b. From test scenarios (workflow happy + error paths)
    for (const scenario of testScenarios) {
      rawCases.push({
        id: 'TC-DD-' + scenario.source.toUpperCase() + '-' + (rawCases.length + 1),
        name: scenario.name,
        description: scenario.steps.map(s => s.action || s.trigger || '').join(' -> '),
        level: scenario.source === 'apiSpec' ? 'integration' : 'unit',
        type: scenario.type,
        source: 'dd',
        confidence: 'HIGH',
        ddRequirement: scenario.workflowName || scenario.name,
        targetComponent: scenario.steps[0] ? (scenario.steps[0].endpoint || '') : '',
        testData: scenario.expected || null,
      });
    }

    // 3c. From EP/BVA -> data validation tests
    for (const entity of (testDataFixture.entities || [])) {
      rawCases.push({
        id: 'TC-DD-EP-VALID-' + (rawCases.length + 1),
        name: entity.name + ' — valid data (EP)',
        description: 'EP valid partitions for ' + entity.name + ': ' + entity.validSets.length + ' values',
        level: 'unit',
        type: 'normal',
        source: 'dd-ep',
        confidence: 'HIGH',
        ddRequirement: entity.name + '_EP',
        targetComponent: entity.name,
        testData: { validSets: entity.validSets },
      });

      if (entity.invalidSets.length > 0) {
        rawCases.push({
          id: 'TC-DD-EP-INVALID-' + (rawCases.length + 1),
          name: entity.name + ' — invalid data (EP)',
          description: 'EP invalid partitions for ' + entity.name + ': ' + entity.invalidSets.length + ' values',
          level: 'unit',
          type: 'abnormal',
          source: 'dd-ep',
          confidence: 'HIGH',
          ddRequirement: entity.name + '_EP',
          targetComponent: entity.name,
          testData: { invalidSets: entity.invalidSets },
        });
      }

      if (entity.boundaryValues.length > 0) {
        rawCases.push({
          id: 'TC-DD-BVA-' + (rawCases.length + 1),
          name: entity.name + ' — boundary values (BVA)',
          description: 'BVA for ' + entity.name + ': ' + entity.boundaryValues.length + ' boundary values',
          level: 'unit',
          type: 'abnormal',
          source: 'dd-bva',
          confidence: 'HIGH',
          ddRequirement: entity.name + '_BVA',
          targetComponent: entity.name,
          testData: { boundaryValues: entity.boundaryValues },
        });
      }
    }

    // 3d. From state machine transitions
    for (const factory of (testDataFixture.stateFactories || [])) {
      if (factory.validTransitions && factory.validTransitions.length > 0) {
        rawCases.push({
          id: 'TC-DD-SM-VALID-' + (rawCases.length + 1),
          name: factory.workflowName + ' — valid state transitions',
          description: factory.validTransitions.length + ' valid transitions',
          level: 'unit',
          type: 'normal',
          source: 'dd-state',
          confidence: 'HIGH',
          ddRequirement: factory.workflowName + '_SM',
          targetComponent: factory.workflowName,
          testData: { validTransitions: factory.validTransitions },
        });
      }
      if (factory.invalidTransitions && factory.invalidTransitions.length > 0) {
        rawCases.push({
          id: 'TC-DD-SM-INVALID-' + (rawCases.length + 1),
          name: factory.workflowName + ' — invalid state transitions',
          description: factory.invalidTransitions.length + ' invalid transitions',
          level: 'unit',
          type: 'abnormal',
          source: 'dd-state',
          confidence: 'HIGH',
          ddRequirement: factory.workflowName + '_SM',
          targetComponent: factory.workflowName,
          testData: { invalidTransitions: factory.invalidTransitions },
        });
      }
    }

    // 3e. From E2E flows
    for (const flow of e2eFlows) {
      rawCases.push({
        id: 'TC-DD-E2E-' + (rawCases.length + 1),
        name: flow.name,
        description: flow.steps.map(s => s.action).join(' -> '),
        level: 'e2e',
        type: 'normal',
        source: 'dd-e2e',
        confidence: 'HIGH',
        ddRequirement: flow.name,
        targetComponent: '',
        testData: { steps: flow.steps },
      });
    }

    // 4. Supplement with Claude analysis (optional)
    try {
      const coordinator = this._getCoordinator();
      const analysis = await coordinator.coordinate(scanResult, 'test-plan', {
        moduleId,
        ddRequirements: (ddMetadata.businessRules || []).map(r => r.description).join('\n'),
      });
      const aiCases = this._buildRawCases(analysis, scanResult);
      for (const tc of aiCases) {
        tc.confidence = 'MEDIUM';
        rawCases.push(tc);
      }
    } catch {
      // AI analysis optional — DD-driven cases are sufficient
    }

    // 5. Classify, enforce ratio, map specialists
    const classified = this.classifyTestCases(rawCases);
    const enforced = this._enforceAbnormalRatio(classified);
    const stack = this._detectStack(scanResult);
    const mapped = this.mapToSpecialists(enforced, stack);

    // 6. Create TestPlan with attached test data
    return schemas.createTestPlan({
      moduleId,
      testCases: mapped,
      coverageMatrix: this._buildCoverageMatrix(mapped, scanResult),
      qualityLevel: scanResult.qualityLevel || 'FULL',
      claudeAnalysis: null,
      geminiEdgeCases: null,
      testData: testDataFixture,
    });
  }

  // ── Internal Helpers ───────────────────────────────────────────────────

  _buildRawCases(analysis, scanResult) {
    const cases = [];

    // From Claude analysis
    if (analysis.claudeResult && Array.isArray(analysis.claudeResult)) {
      for (const item of analysis.claudeResult) {
        cases.push({
          id: item.id || ('TC-' + (cases.length + 1)),
          name: item.name || item.description || 'Test case ' + (cases.length + 1),
          description: item.description || '',
          level: item.level || null,
          type: item.type || null,
          source: 'claude',
          confidence: item.confidence || 'MEDIUM',
          targetComponent: item.targetComponent || '',
        });
      }
    }

    // From Gemini edge cases
    if (analysis.geminiResult && Array.isArray(analysis.geminiResult)) {
      for (const item of analysis.geminiResult) {
        cases.push({
          id: item.id || ('TC-G-' + (cases.length + 1)),
          name: item.name || item.description || 'Edge case ' + (cases.length + 1),
          description: item.description || '',
          level: item.level || null,
          type: 'abnormal', // Gemini specializes in edge cases
          source: 'gemini',
          confidence: item.confidence || 'LOW',
          targetComponent: item.targetComponent || '',
        });
      }
    }

    // Generate baseline from scan result if no AI results
    if (cases.length === 0) {
      cases.push(...this._generateBaselineCases(scanResult));
    }

    return cases;
  }

  _generateBaselineCases(scanResult) {
    const cases = [];

    // From API contracts → controller tests
    for (const api of (scanResult.apiContracts || [])) {
      cases.push({
        id: 'TC-API-' + (cases.length + 1),
        name: api.method + ' ' + api.path + ' - happy path',
        description: 'Test ' + api.handler + ' returns expected response',
        level: 'integration',
        type: 'normal',
        source: 'ast',
        confidence: 'MEDIUM',
        targetComponent: api.handler || '',
      });

      cases.push({
        id: 'TC-API-' + (cases.length + 1),
        name: api.method + ' ' + api.path + ' - error handling',
        description: 'Test ' + api.handler + ' handles invalid input',
        level: 'integration',
        type: 'abnormal',
        source: 'ast',
        confidence: 'MEDIUM',
        targetComponent: api.handler || '',
      });
    }

    // From business rules → unit tests
    for (const rule of (scanResult.businessRules || [])) {
      cases.push({
        id: 'TC-BR-' + (cases.length + 1),
        name: 'Business rule: ' + (rule.description || '').substring(0, 60),
        description: 'Verify ' + rule.description,
        level: 'unit',
        type: rule.description && rule.description.toLowerCase().includes('null') ? 'abnormal' : 'normal',
        source: 'ast',
        confidence: 'MEDIUM',
        targetComponent: rule.method || rule.className || '',
      });
    }

    // From entities → repository tests
    for (const entity of (scanResult.entities || [])) {
      cases.push({
        id: 'TC-ENT-' + (cases.length + 1),
        name: entity.name + ' CRUD operations',
        description: 'Test basic CRUD for ' + entity.name,
        level: 'integration',
        type: 'normal',
        source: 'ast',
        confidence: 'MEDIUM',
        targetComponent: entity.name || '',
      });
    }

    return cases;
  }

  _classifyLevel(tc) {
    const desc = ((tc.name || '') + ' ' + (tc.description || '')).toLowerCase();
    if (desc.includes('e2e') || desc.includes('end-to-end') || desc.includes('ui flow')) return 'e2e';
    if (desc.includes('integration') || desc.includes('api') || desc.includes('crud') || desc.includes('controller')) return 'integration';
    return 'unit';
  }

  _classifyType(tc) {
    const desc = ((tc.name || '') + ' ' + (tc.description || '')).toLowerCase();
    if (desc.includes('error') || desc.includes('invalid') || desc.includes('null') ||
        desc.includes('edge') || desc.includes('boundary') || desc.includes('exception') ||
        desc.includes('fail') || desc.includes('negative') || desc.includes('abnormal')) {
      return 'abnormal';
    }
    return 'normal';
  }

  _enforceAbnormalRatio(testCases) {
    if (testCases.length === 0) return testCases;

    const abnormalCount = testCases.filter(tc => tc.type === 'abnormal').length;
    const ratio = abnormalCount / testCases.length;

    // If ratio >= 40%, no enforcement needed
    if (ratio >= 0.40) return testCases;

    // Mark some normal cases as needing abnormal counterparts
    // Formula: (abnormalCount + X) / (total + X) >= 0.40
    //   => X >= (0.40 * total - abnormalCount) / 0.60
    const normalCases = testCases.filter(tc => tc.type === 'normal');
    const needed = Math.ceil((0.40 * testCases.length - abnormalCount) / 0.60);

    for (let i = 0; i < Math.min(needed, normalCases.length); i++) {
      const base = normalCases[i];
      testCases.push({
        id: base.id + '-NEG',
        name: base.name + ' - negative case',
        description: 'Negative/edge case for: ' + base.description,
        level: base.level,
        type: 'abnormal',
        source: 'generated',
        confidence: 'LOW',
        targetComponent: base.targetComponent,
      });
    }

    return testCases;
  }

  _detectStack(scanResult) {
    const components = scanResult.components || {};
    const controllers = components.controllers || [];
    const feComponents = components.frontendComponents || [];

    if (controllers.some(f => f.endsWith('.java'))) return 'java-reactive';
    if (feComponents.some(f => f.endsWith('.tsx') || f.endsWith('.ts'))) return 'typescript-nextjs';

    // Fallback: check apiContracts for Spring patterns
    const apis = scanResult.apiContracts || [];
    if (apis.length > 0) return 'java-reactive';

    return 'java-reactive'; // default
  }

  _resolveSpecialist(tc, stack) {
    const level = tc.level || 'unit';
    // Map stack to file prefix (variant resolved via StackResolver directory, not file name)
    const prefixMap = { 'java-reactive': 'java', 'typescript-nextjs': 'nextjs' };
    const prefix = prefixMap[stack] || stack;
    const category = level === 'unit' || level === 'integration' || level === 'e2e' ? level : 'unit';
    return 'tps-' + prefix + '-' + category;
  }

  _buildCoverageMatrix(testCases, scanResult) {
    const matrix = {};

    for (const tc of testCases) {
      const component = tc.targetComponent || 'unknown';
      if (!matrix[component]) {
        matrix[component] = { normal: 0, abnormal: 0, total: 0 };
      }
      matrix[component][tc.type || 'normal']++;
      matrix[component].total++;
    }

    return matrix;
  }

  _getCoordinator() {
    if (!this._coordinator) {
      const { MultiModelCoordinator } = require('./multi-model-coordinator.js');
      this._coordinator = new MultiModelCoordinator(this.pkgRoot);
    }
    return this._coordinator;
  }
}

module.exports = { TestPlanGenerator };
