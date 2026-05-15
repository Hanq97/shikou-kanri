/**
 * Execute Command Constants and Enums
 * Week 15 - Day 0 Infrastructure
 */

// Execution modes
const ExecutionMode = {
  TEMPLATE_FIRST: 'template_first',
  LLM_FALLBACK: 'llm_fallback',
  STRICT: 'strict'
};

// Quality gates
const QualityGate = {
  G1_SYNTAX: 'G1_SYNTAX',
  G2_LINTING: 'G2_LINTING',
  G3_TESTS_GENERATED: 'G3_TESTS_GENERATED',
  G4_TESTS_PASSED: 'G4_TESTS_PASSED',
  G5_COVERAGE: 'G5_COVERAGE',
  G6_SECURITY: 'G6_SECURITY'
};

// Context types
const ContextType = {
  STACK: 'stack',
  TYPE: 'type',
  PATTERN: 'pattern',
  DEPENDENCY: 'dependency',
  REQUIREMENTS: 'requirements'
};

// Step types
const StepType = {
  BACKEND: 'backend',
  FRONTEND: 'frontend',
  DATABASE: 'database',
  INFRASTRUCTURE: 'infrastructure'
};

// Backend layers
const BackendLayer = {
  DOMAIN: 'domain',
  REPOSITORY: 'repository',
  SERVICE: 'service',
  CONTROLLER: 'controller',
  DTO: 'dto',
  EXCEPTION: 'exception',
  SECURITY: 'security'
};

// Frontend layers
const FrontendLayer = {
  COMPONENT: 'component',
  PAGE: 'page',
  HOOK: 'hook',
  API: 'api',
  LAYOUT: 'layout',
  UTILITY: 'utility'
};

// Execution status
const ExecutionStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back'
};

// Checkpoint status
const CheckpointStatus = {
  SAVED: 'saved',
  LOADED: 'loaded',
  DELETED: 'deleted',
  CORRUPTED: 'corrupted'
};

// Directories
const DIR_BASE = '.claude/execute/';
const DIR_CHECKPOINTS = `${DIR_BASE}checkpoints/`;
const DIR_SNAPSHOTS = `${DIR_BASE}snapshots/`;
const DIR_REPORTS = `${DIR_BASE}reports/`;
const DIR_TEMP = `${DIR_BASE}temp/`;
const DIR_LOGS = `${DIR_BASE}logs/`;

// Files
const FILE_CONFIG = 'config/execute-config.json';

// Thresholds
const MIN_CONFIDENCE = 90;
const MIN_COVERAGE = 80;
const MAX_DEVIATION = 0.05; // 5%

// Timeouts (in milliseconds)
const TIMEOUT_STEP_EXECUTION = 60000; // 60 seconds
const TIMEOUT_VALIDATION = 30000;     // 30 seconds
const TIMEOUT_CHECKPOINT = 10000;     // 10 seconds

// Export all constants
module.exports = {
  // Enums
  ExecutionMode,
  QualityGate,
  ContextType,
  StepType,
  BackendLayer,
  FrontendLayer,
  ExecutionStatus,
  CheckpointStatus,

  // Directories
  DIR_BASE,
  DIR_CHECKPOINTS,
  DIR_SNAPSHOTS,
  DIR_REPORTS,
  DIR_TEMP,
  DIR_LOGS,

  // Files
  FILE_CONFIG,

  // Thresholds
  MIN_CONFIDENCE,
  MIN_COVERAGE,
  MAX_DEVIATION,

  // Timeouts
  TIMEOUT_STEP_EXECUTION,
  TIMEOUT_VALIDATION,
  TIMEOUT_CHECKPOINT
};
