'use strict';

/**
 * schemas.js — Pipeline data schemas for ETF (EPS Test Framework).
 *
 * Factory functions for pipeline stage outputs + validators.
 * No external dependencies (DD Decision D16: Lightweight Convention).
 * All outputs are frozen (immutable after creation).
 */

// ── Factory Functions ────────────────────────────────────────────────────────

/**
 * ScanResult — output of test-scan action (ETF-INTL analysis pipeline).
 */
function createScanResult(data) {
  const result = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    moduleId: data.moduleId || '',
    mode: data.mode || 'CODE_FIRST',
    apiContracts: data.apiContracts || [],
    entities: data.entities || [],
    businessRules: data.businessRules || [],
    dependencies: data.dependencies || [],
    ragChunksUsed: data.ragChunksUsed || 0,
    qualityLevel: data.qualityLevel || 'FULL',
    // DD enrichment fields (null when CODE_FIRST)
    ddMetadata: data.ddMetadata || null,
    dbDesignMetadata: data.dbDesignMetadata || null,
    dbSchemaMetadata: data.dbSchemaMetadata || null,
    crossValidation: data.crossValidation || null,
    ragCrossRef: data.ragCrossRef || null,
    ragQuality: data.ragQuality || 0,
  };
  return Object.freeze(result);
}

/**
 * TestPlan — output of test-generate plan stage.
 */
function createTestPlan(data) {
  const result = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    moduleId: data.moduleId || '',
    testCases: data.testCases || [],
    coverageMatrix: data.coverageMatrix || {},
    qualityLevel: data.qualityLevel || 'FULL',
    claudeAnalysis: data.claudeAnalysis || null,
    geminiEdgeCases: data.geminiEdgeCases || null,
    testData: data.testData || null,
    stats: {
      total: (data.testCases || []).length,
      unit: (data.testCases || []).filter(tc => tc.level === 'unit').length,
      integration: (data.testCases || []).filter(tc => tc.level === 'integration').length,
      e2e: (data.testCases || []).filter(tc => tc.level === 'e2e').length,
      abnormalRatio: _calcAbnormalRatio(data.testCases || []),
    },
  };
  return Object.freeze(result);
}

/**
 * TestFile — output of code generation stage.
 */
function createTestFile(data) {
  const result = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    moduleId: data.moduleId || '',
    files: data.files || [],
    language: data.language || 'java',
    framework: data.framework || 'junit5',
    stats: {
      totalFiles: (data.files || []).length,
      totalLines: (data.files || []).reduce((sum, f) => sum + (f.lines || 0), 0),
    },
  };
  return Object.freeze(result);
}

/**
 * ValidationReport — output of test-validate action.
 */
function createValidationReport(data) {
  const result = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    moduleId: data.moduleId || '',
    compileResult: data.compileResult || { success: true, failedFiles: [], errors: [] },
    runResult: data.runResult || { passed: 0, failed: 0, skipped: 0, duration: 0 },
    coverageResult: data.coverageResult || { line: 0, branch: 0, method: 0 },
    qualityScore: data.qualityScore || 0,
  };
  return Object.freeze(result);
}

/**
 * PipelineState — per-module pipeline state tracking.
 */
function createPipelineState(data) {
  const result = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    moduleId: data.moduleId || '',
    currentStage: data.currentStage || 'idle',
    stageResults: data.stageResults || {},
    startedAt: data.startedAt || new Date().toISOString(),
    completedStages: data.completedStages || [],
  };
  return Object.freeze(result);
}

/**
 * DDMetadata — structured DD content from RAG or file fallback.
 * Source: rag_query (primary) or .md file read (fallback).
 */
function createDDMetadata(data) {
  return Object.freeze({
    version: '1.0',
    generatedAt: new Date().toISOString(),
    moduleId: data.moduleId || '',
    ddType: data.ddType || 'backend',
    sections: data.sections || [],
    entities: data.entities || [],
    apiSpecs: data.apiSpecs || [],
    workflows: data.workflows || [],
    errorCodes: data.errorCodes || [],
    businessRules: data.businessRules || [],
    source: data.source || 'rag',
    empty: data.empty || false,
  });
}

/**
 * DBSchemaMetadata — live DB schema from information_schema queries.
 */
function createDBSchemaMetadata(data) {
  return Object.freeze({
    version: '1.0',
    generatedAt: new Date().toISOString(),
    tables: data.tables || [],
    foreignKeys: data.foreignKeys || [],
    checkConstraints: data.checkConstraints || [],
    enums: data.enums || [],
  });
}

/**
 * TestDataFixture — EP + BVA generated test data per entity.
 */
function createTestDataFixture(data) {
  return Object.freeze({
    version: '1.0',
    generatedAt: new Date().toISOString(),
    entities: data.entities || [],
    stateFactories: data.stateFactories || [],
    dataFactoryCode: data.dataFactoryCode || '',
    seedScript: data.seedScript || '',
  });
}

/**
 * TraceabilityMatrix — DD requirement → test case → coverage mapping.
 */
function createTraceabilityMatrix(data) {
  return Object.freeze({
    version: '1.0',
    generatedAt: new Date().toISOString(),
    mappings: data.mappings || [],
    mismatches: data.mismatches || [],
    summary: Object.freeze({
      totalRequirements: (data.summary && data.summary.totalRequirements) || 0,
      coveredRequirements: (data.summary && data.summary.coveredRequirements) || 0,
      uncoveredRequirements: (data.summary && data.summary.uncoveredRequirements) || 0,
      orphanTests: (data.summary && data.summary.orphanTests) || 0,
      mismatchCount: (data.summary && data.summary.mismatchCount) || 0,
    }),
  });
}

// ── Validators ───────────────────────────────────────────────────────────────

function validateScanResult(obj) {
  const errors = [];
  if (!obj) { return { valid: false, errors: ['Object is null/undefined'] }; }
  if (typeof obj.moduleId !== 'string' || !obj.moduleId) errors.push('moduleId is required (string)');
  if (!Array.isArray(obj.apiContracts)) errors.push('apiContracts must be an array');
  if (!Array.isArray(obj.entities)) errors.push('entities must be an array');
  if (!Array.isArray(obj.businessRules)) errors.push('businessRules must be an array');
  if (!Array.isArray(obj.dependencies)) errors.push('dependencies must be an array');
  if (!['DD_FIRST', 'CODE_FIRST', 'BLOCKED'].includes(obj.mode)) errors.push('mode must be DD_FIRST|CODE_FIRST|BLOCKED');
  return { valid: errors.length === 0, errors };
}

function validateTestPlan(obj) {
  const errors = [];
  if (!obj) { return { valid: false, errors: ['Object is null/undefined'] }; }
  if (typeof obj.moduleId !== 'string' || !obj.moduleId) errors.push('moduleId is required (string)');
  if (!Array.isArray(obj.testCases)) errors.push('testCases must be an array');
  if (obj.testCases && obj.testCases.length > 0) {
    const first = obj.testCases[0];
    if (!first.level) errors.push('testCases[].level is required (unit|integration|e2e)');
    if (!first.type) errors.push('testCases[].type is required (normal|abnormal)');
  }
  if (!['FULL', 'DEGRADED', 'MINIMAL'].includes(obj.qualityLevel)) errors.push('qualityLevel must be FULL|DEGRADED|MINIMAL');
  return { valid: errors.length === 0, errors };
}

function validateTestFile(obj) {
  const errors = [];
  if (!obj) { return { valid: false, errors: ['Object is null/undefined'] }; }
  if (typeof obj.moduleId !== 'string' || !obj.moduleId) errors.push('moduleId is required (string)');
  if (!Array.isArray(obj.files)) errors.push('files must be an array');
  if (obj.files && obj.files.length > 0) {
    const first = obj.files[0];
    if (!first.path) errors.push('files[].path is required');
    if (!first.content && first.content !== '') errors.push('files[].content is required');
  }
  if (typeof obj.language !== 'string') errors.push('language is required (string)');
  return { valid: errors.length === 0, errors };
}

function validateValidationReport(obj) {
  const errors = [];
  if (!obj) { return { valid: false, errors: ['Object is null/undefined'] }; }
  if (typeof obj.moduleId !== 'string' || !obj.moduleId) errors.push('moduleId is required (string)');
  if (!obj.compileResult || typeof obj.compileResult !== 'object') errors.push('compileResult is required (object)');
  if (!obj.runResult || typeof obj.runResult !== 'object') errors.push('runResult is required (object)');
  if (!obj.coverageResult || typeof obj.coverageResult !== 'object') errors.push('coverageResult is required (object)');
  if (typeof obj.qualityScore !== 'number') errors.push('qualityScore is required (number)');
  return { valid: errors.length === 0, errors };
}

function validateDDMetadata(obj) {
  const errors = [];
  if (!obj) return { valid: false, errors: ['Object is null/undefined'] };
  if (typeof obj.moduleId !== 'string' || !obj.moduleId) errors.push('moduleId is required (string)');
  if (!Array.isArray(obj.entities)) errors.push('entities must be an array');
  if (!Array.isArray(obj.apiSpecs)) errors.push('apiSpecs must be an array');
  if (!Array.isArray(obj.workflows)) errors.push('workflows must be an array');
  if (!['rag', 'file'].includes(obj.source)) errors.push('source must be rag|file');
  return { valid: errors.length === 0, errors };
}

function validateDBSchemaMetadata(obj) {
  const errors = [];
  if (!obj) return { valid: false, errors: ['Object is null/undefined'] };
  if (!Array.isArray(obj.tables)) errors.push('tables must be an array');
  if (!Array.isArray(obj.foreignKeys)) errors.push('foreignKeys must be an array');
  return { valid: errors.length === 0, errors };
}

function validateTestDataFixture(obj) {
  const errors = [];
  if (!obj) return { valid: false, errors: ['Object is null/undefined'] };
  if (!Array.isArray(obj.entities)) errors.push('entities must be an array');
  if (!Array.isArray(obj.stateFactories)) errors.push('stateFactories must be an array');
  return { valid: errors.length === 0, errors };
}

function validateTraceabilityMatrix(obj) {
  const errors = [];
  if (!obj) return { valid: false, errors: ['Object is null/undefined'] };
  if (!Array.isArray(obj.mappings)) errors.push('mappings must be an array');
  if (!obj.summary || typeof obj.summary !== 'object') errors.push('summary is required (object)');
  return { valid: errors.length === 0, errors };
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

function _calcAbnormalRatio(testCases) {
  if (testCases.length === 0) return 0;
  const abnormal = testCases.filter(tc => tc.type === 'abnormal').length;
  return Math.round((abnormal / testCases.length) * 100) / 100;
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Existing
  createScanResult,
  createTestPlan,
  createTestFile,
  createValidationReport,
  createPipelineState,
  validateScanResult,
  validateTestPlan,
  validateTestFile,
  validateValidationReport,
  // New (SP-1)
  createDDMetadata,
  createDBSchemaMetadata,
  createTestDataFixture,
  createTraceabilityMatrix,
  validateDDMetadata,
  validateDBSchemaMetadata,
  validateTestDataFixture,
  validateTraceabilityMatrix,
};
