"use strict";

/**
 * EPS Enrichers Index
 *
 * Exports all 6 EPS enricher strategies for workflow commands.
 * DD Reference: §5.4 (EPS Enricher Integration), L2.1-L2.7
 *
 * Enricher Mapping:
 * | Command   | Enricher                    | Primary Query              |
 * |-----------|-----------------------------|-----------------------------|
 * | /research | ResearchEnricher            | specialists + patterns      |
 * | /innovate | InnovateEnricher            | patterns + conflicts        |
 * | /plan     | PlanContextLoader           | patterns per step + risks   |
 * | /execute  | ExecuteContextProvider      | real-time patterns          |
 * | /validate | ValidateTraceabilityChecker | design → code trace         |
 * | /save     | SaveAutoIndexer             | entity extraction           |
 *
 * @module enrichers
 */

const {
  ResearchEnricher,
  CONFIG: ResearchConfig,
} = require("./research-enricher");
const {
  InnovateEnricher,
  PatternType,
  CONFIG: InnovateConfig,
} = require("./innovate-enricher");
const {
  PlanContextLoader,
  RiskCategory,
  RiskLevel,
  CONFIG: PlanConfig,
} = require("./plan-context-loader");
const {
  ExecuteContextProvider,
  StalenessLevel,
  ProgressStatus,
  CONFIG: ExecuteConfig,
} = require("./execute-context-provider");
const {
  ValidateTraceabilityChecker,
  GapSeverity,
  ChangeType,
  CONFIG: ValidateConfig,
} = require("./validate-traceability-checker");
const {
  SaveAutoIndexer,
  ENTITY_PATTERNS,
  CONFIG: SaveConfig,
} = require("./save-auto-indexer");

// ─────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Get enricher for a specific EPS command.
 *
 * @param {string} command - EPS command (research/innovate/plan/execute/validate/save)
 * @param {object} [options] - Options to pass to enricher
 * @returns {object|null} Enricher instance or null if unknown command
 */
function getEnricherForCommand(command, options = {}) {
  const normalizedCommand = command.toLowerCase().replace(/^\//, "");

  switch (normalizedCommand) {
    case "research":
      return new ResearchEnricher(options);
    case "innovate":
      return new InnovateEnricher(options);
    case "plan":
      return new PlanContextLoader(options);
    case "execute":
      return new ExecuteContextProvider(options);
    case "validate":
      return new ValidateTraceabilityChecker(options);
    case "save":
      return new SaveAutoIndexer(options);
    default:
      return null;
  }
}

/**
 * Get all enricher configurations.
 *
 * @returns {object} Map of command to config
 */
function getAllConfigs() {
  return {
    research: ResearchConfig,
    innovate: InnovateConfig,
    plan: PlanConfig,
    execute: ExecuteConfig,
    validate: ValidateConfig,
    save: SaveConfig,
  };
}

/**
 * Check if a command has an enricher.
 *
 * @param {string} command - Command to check
 * @returns {boolean}
 */
function hasEnricher(command) {
  const normalizedCommand = command.toLowerCase().replace(/^\//, "");
  return [
    "research",
    "innovate",
    "plan",
    "execute",
    "validate",
    "save",
  ].includes(normalizedCommand);
}

// ─────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────

module.exports = {
  // Enricher classes
  ResearchEnricher,
  InnovateEnricher,
  PlanContextLoader,
  ExecuteContextProvider,
  ValidateTraceabilityChecker,
  SaveAutoIndexer,

  // Factory functions
  getEnricherForCommand,
  getAllConfigs,
  hasEnricher,

  // Constants
  PatternType,
  RiskCategory,
  RiskLevel,
  StalenessLevel,
  ProgressStatus,
  GapSeverity,
  ChangeType,
  ENTITY_PATTERNS,
};
