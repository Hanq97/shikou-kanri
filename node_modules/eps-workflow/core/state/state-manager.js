#!/usr/bin/env node

/**
 * State Manager for Enhanced Workflow (Branch-based version)
 *
 * Usage:
 *   node state-manager.js init <feature> [<developer>]
 *   node state-manager.js get
 *   node state-manager.js validate <command>
 *   node state-manager.js update <state>
 *
 * Note: Now uses git branch for organization instead of feature folders
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Multi-stack infrastructure
const { getStackResolver } = require("./stack-resolver");

// ============================================
// GIT BRANCH UTILITIES
// ============================================

function getCurrentBranch() {
  try {
    return execSync("git branch --show-current", { encoding: "utf-8" }).trim();
  } catch (error) {
    throw new Error("Not in a git repository or git not installed");
  }
}

function getRepositoryRoot() {
  try {
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
    }).trim();
  } catch (error) {
    throw new Error("Not in a git repository");
  }
}

// ============================================
// STATE TRANSITIONS
// ============================================

// @deprecated v7.0: Use WORKFLOW_DEFINITIONS instead. Kept for reference.
const STATE_TRANSITIONS = {
  research: {
    from: ["INITIAL", "SRS_CREATED", "BD_CREATED"],
  },
  innovate: { from: ["RESEARCH_SRS", "RESEARCH_BD", "RESEARCH_DD"] },
  "design-srs": { from: ["INNOVATE_SRS"], to: "SRS_VALIDATING" },
  "design-basic": { from: ["INNOVATE_BD"], to: "BASIC_DESIGN_VALIDATING" },
  "design-detail": {
    from: ["INNOVATE_DD_APPROVED"],  // v5.2: Requires INNOVATE_DD approval gate
    to: "DD_CREATING",
  },
  // v6.0: Review commands (auto-chained from router)
  "design-review": { from: ["DD_CREATED"], to: "DD_REVIEWED" },
  "plan-review": { from: ["PLAN_CREATED"], to: "PLAN_REVIEWED" },
  plan: {
    from: ["DD_REVIEWED", "INNOVATE_SRS", "INNOVATE_BD", "INNOVATE_DD_APPROVED"],
    to: "PLAN_CREATED",
  },
  execute: { from: ["PLAN_REVIEWED"], to: "EXECUTED" },
  validate: { from: ["EXECUTED"], to: "VALIDATED" },
  test: { from: ["VALIDATED"], to: "TESTED" },
};

const NEXT_STATE_MAP = {
  INITIAL: "RESEARCH_SRS",
  SRS_CREATED: "RESEARCH_BD",
  SRS_VALIDATING: "SRS_REVIEWING",
  SRS_REVIEWING: "SRS_CREATED",
  BD_CREATED: "RESEARCH_DD",
  BASIC_DESIGN_VALIDATING: "BASIC_DESIGN_REGENERATING",
  BASIC_DESIGN_REGENERATING: "BASIC_DESIGN_REVIEWING",
  BASIC_DESIGN_REVIEWING: "BD_CREATED",
  RESEARCH_SRS: "INNOVATE_SRS",
  RESEARCH_BD: "INNOVATE_BD",
  RESEARCH_DD: "INNOVATE_DD",
  // v5.2: INNOVATE_DD gate enforcement states
  INNOVATE_DD: "INNOVATE_DD_APPROVED",
  INNOVATE_DD_APPROVED: "DD_CREATING",
  DD_CREATING: "DD_CREATED",
  // v6.0: Review + post-execution states
  DD_CREATED: "DD_REVIEWED",
  PLAN_CREATED: "PLAN_REVIEWED",
  PLAN_REVIEWED: "EXECUTED",
  EXECUTED: "VALIDATED",
  VALIDATED: "TESTED",
  // v8.0: Architecture workflow states (self-contained, not in WORKFLOW_DEFINITIONS)
  ARCH_IN_PROGRESS: "ARCH_COMPLETED",

  // v9.0: Streamlined Feature Workflow states
  // New feature flow: research → innovate (Part 1 + Part 2) → auto-chain design → plan
  RESEARCHED: "INNOVATE_SRS",
  INNOVATE_TECHNICAL: "BD_DD_CREATED",
  BD_DD_CREATED: "PLAN_READY",
  // Enhancement flow
  INNOVATE_DELTA: "DOCS_UPDATED",
  DOCS_UPDATED: "PLAN_READY",
  // Note: INNOVATE_SRS and SRS_CREATED already exist in v1 NEXT_STATE_MAP above
  // v2 reuses them (same semantic), differs in transitions before/after
};

// ============================================
// TASK-TYPE-AWARE WORKFLOW DEFINITIONS (v7.0)
// ============================================
// Each task type has its own workflow — different production processes
// require different state transitions. This is NOT "skip", it's a
// separate workflow definition per task type.

const WORKFLOW_DEFINITIONS = {
  new: {
    research:        { from: ["INITIAL", "SRS_CREATED", "BD_CREATED"] },
    innovate:        { from: ["RESEARCH_SRS", "RESEARCH_BD", "RESEARCH_DD", "RESEARCHED"] },
    "design-srs":    { from: ["INNOVATE_SRS"], to: "SRS_VALIDATING" },
    "design-basic":  { from: ["INNOVATE_BD"], to: "BASIC_DESIGN_VALIDATING" },
    "design-detail": { from: ["INNOVATE_DD_APPROVED"], to: "DD_CREATING" },
    "design-review": { from: ["DD_CREATED"], to: "DD_REVIEWED" },
    "plan-review":   { from: ["PLAN_CREATED"], to: "PLAN_REVIEWED" },
    plan:            { from: ["DD_REVIEWED", "BD_DD_CREATED"], to: "PLAN_CREATED" },
    execute:         { from: ["PLAN_REVIEWED"], to: "EXECUTED" },
    validate:        { from: ["EXECUTED"], to: "VALIDATED" },
    test:            { from: ["VALIDATED"], to: "TESTED" },
  },
  enhancement: {
    research:        { from: ["INITIAL", "SRS_CREATED", "BD_CREATED"] },
    innovate:        { from: ["RESEARCH_SRS", "RESEARCH_BD", "RESEARCHED"] },
    "design-srs":    { from: ["INNOVATE_SRS"], to: "SRS_VALIDATING" },
    "design-basic":  { from: ["INNOVATE_BD"], to: "BASIC_DESIGN_VALIDATING" },
    "design-detail": { from: ["INNOVATE_DD_APPROVED"], to: "DD_CREATING" },
    "plan-review":   { from: ["PLAN_CREATED"], to: "PLAN_REVIEWED" },
    plan:            { from: ["DD_REVIEWED", "INNOVATE_SRS", "INNOVATE_BD", "BD_CREATED", "BD_DD_CREATED", "DOCS_UPDATED"], to: "PLAN_CREATED" },
    execute:         { from: ["PLAN_REVIEWED"], to: "EXECUTED" },
    validate:        { from: ["EXECUTED"], to: "VALIDATED" },
    test:            { from: ["VALIDATED"], to: "TESTED" },
  },
  bugfix: {
    research:        { from: ["INITIAL"] },
    plan:            { from: ["RESEARCH_SRS", "RESEARCHED", "PLAN_READY"], to: "PLAN_CREATED" },
    "plan-review":   { from: ["PLAN_CREATED"], to: "PLAN_REVIEWED" },
    execute:         { from: ["PLAN_REVIEWED"], to: "EXECUTED" },
    validate:        { from: ["EXECUTED"], to: "VALIDATED" },
    test:            { from: ["VALIDATED"], to: "TESTED" },
  },
};

// ============================================
// PHASE-SPECIFIC STATE GROUPS (v3.0)
// ============================================

const SRS_STATES = [
  "SRS_VALIDATING", // Step 4.5: Running validators
  "SRS_REVIEWING", // Step 5: Interactive review
  "SRS_CREATED", // Final state after approval
];

const BASIC_DESIGN_STATES = [
  "BASIC_DESIGN_VALIDATING", // Step 4.5: Running validators
  "BASIC_DESIGN_REGENERATING", // Step 4.5.1: Fixing validation issues
  "BASIC_DESIGN_REVIEWING", // Step 5: Interactive review
  "BD_CREATED", // Final state after approval
];

// v4.0 Orchestration States
const BD_ORCHESTRATION_STATES = [
  "BD_ORCHESTRATION_C0", // Step 0: Reasoning agent (C0 checkpoint)
  "BD_ORCHESTRATION_C1", // Phase 1: Architecture agent (C1 checkpoint)
  "BD_ORCHESTRATION_C2", // Phase 2: Component agent (C2 checkpoint)
  "BD_ORCHESTRATION_C3", // Phase 3: Dataflow agent (C3 checkpoint)
  "BD_ORCHESTRATION_C4", // Phase 4: Datamodel agent (C4 checkpoint)
  "BD_ORCHESTRATION_C5", // Phase 5: State agent (C5 checkpoint)
  "BD_ORCHESTRATION_C6", // Phase 6: NFR agent (C6 checkpoint)
  "BD_ORCHESTRATION_COMPLETE", // All checkpoints passed
];

const DETAIL_DESIGN_STATES = [
  "INNOVATE_DD_APPROVED", // v5.2: INNOVATE gate passed, ready for DD generation
  "DD_CREATING",          // v5.2: DD generation in progress
  "DD_CREATED",           // DD generation complete
  "DD_REVIEWED",          // v6.0: after design-review
];

// v8.0: Architecture workflow states (self-contained, parallel to feature workflow)
const ARCHITECTURE_STATES = [
  "ARCH_IN_PROGRESS",  // /architect running (any internal phase)
  "ARCH_COMPLETED",    // All 5 phases done
];

// Helper function to check if state is in a specific phase
function isInPhase(currentState, phase) {
  switch (phase) {
    case "srs":
      return SRS_STATES.includes(currentState);
    case "basic-design":
      return BASIC_DESIGN_STATES.includes(currentState);
    case "bd-orchestration":
      return BD_ORCHESTRATION_STATES.includes(currentState);
    case "detail-design":
      return DETAIL_DESIGN_STATES.includes(currentState);
    case "architecture":
      return ARCHITECTURE_STATES.includes(currentState);
    default:
      return false;
  }
}

// Helper function to get current phase from state
function getCurrentPhase(currentState) {
  if (SRS_STATES.includes(currentState)) return "srs";
  if (BASIC_DESIGN_STATES.includes(currentState)) return "basic-design";
  if (BD_ORCHESTRATION_STATES.includes(currentState)) return "bd-orchestration";
  if (DETAIL_DESIGN_STATES.includes(currentState)) return "detail-design";
  if (ARCHITECTURE_STATES.includes(currentState)) return "architecture";
  return "other";
}

// v4.0 Orchestration Helper Functions
function getOrchestrationCheckpoint(currentState) {
  const checkpointMap = {
    BD_ORCHESTRATION_C0: "C0",
    BD_ORCHESTRATION_C1: "C1",
    BD_ORCHESTRATION_C2: "C2",
    BD_ORCHESTRATION_C3: "C3",
    BD_ORCHESTRATION_C4: "C4",
    BD_ORCHESTRATION_C5: "C5",
    BD_ORCHESTRATION_C6: "C6",
    BD_ORCHESTRATION_COMPLETE: "COMPLETE",
  };
  return checkpointMap[currentState] || null;
}

function getNextOrchestrationState(currentCheckpoint) {
  const nextStateMap = {
    INITIAL: "BD_ORCHESTRATION_C0",
    C0: "BD_ORCHESTRATION_C1",
    C1: "BD_ORCHESTRATION_C2",
    C2: "BD_ORCHESTRATION_C3",
    C3: "BD_ORCHESTRATION_C4",
    C4: "BD_ORCHESTRATION_C5",
    C5: "BD_ORCHESTRATION_C6",
    C6: "BD_ORCHESTRATION_COMPLETE",
    COMPLETE: "BASIC_DESIGN_VALIDATING",
  };
  return nextStateMap[currentCheckpoint] || null;
}

function saveOrchestrationState(contextPath, orchestrationData) {
  const orchestrationFile = path.join(
    contextPath,
    "bd-orchestration-state.json",
  );
  fs.writeFileSync(
    orchestrationFile,
    JSON.stringify(orchestrationData, null, 2),
    "utf-8",
  );
}

function loadOrchestrationState(contextPath) {
  const orchestrationFile = path.join(
    contextPath,
    "bd-orchestration-state.json",
  );
  if (!fs.existsSync(orchestrationFile)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(orchestrationFile, "utf-8"));
}

// ============================================
// CONTEXT MANAGEMENT (Branch-based)
// ============================================

function getBranchContextDir() {
  const root = getRepositoryRoot();
  const branch = getCurrentBranch();
  return path.join(root, ".claude", "memory-bank", branch);
}

function findActiveContext() {
  const branchDir = getBranchContextDir();

  if (!fs.existsSync(branchDir)) {
    return null;
  }

  // Check for context.md in the branch directory
  const contextFile = path.join(branchDir, "context.md");

  if (fs.existsSync(contextFile)) {
    return branchDir;
  }

  // Look for feature subdirectories with context.md
  const subdirs = fs.readdirSync(branchDir).filter((f) => {
    const fullPath = path.join(branchDir, f);
    const stat = fs.statSync(fullPath);
    return (
      stat.isDirectory() && fs.existsSync(path.join(fullPath, "context.md"))
    );
  });

  if (subdirs.length === 0) {
    return null;
  }

  // Find the most recently modified context
  let mostRecentContext = null;
  let mostRecentTime = 0;

  for (const subdir of subdirs) {
    const contextFile = path.join(branchDir, subdir, "context.md");
    const stat = fs.statSync(contextFile);
    if (stat.mtimeMs > mostRecentTime) {
      mostRecentTime = stat.mtimeMs;
      mostRecentContext = subdir;
    }
  }

  return path.join(branchDir, mostRecentContext);
}

function extractValue(content, key) {
  const patterns = [
    new RegExp(`\\*\\*${key}\\*\\*:\\s*(.+)`, "i"),
    new RegExp(`- \\*\\*${key}\\*\\*:\\s*(.+)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return "";
}

function loadContext(contextPath) {
  const contextFile = path.join(contextPath, "context.md");

  if (!fs.existsSync(contextFile)) {
    throw new Error(`Context file not found: ${contextFile}`);
  }

  const content = fs.readFileSync(contextFile, "utf-8");

  return {
    featureName: extractValue(content, "Feature ID") || "unknown",
    developerName: extractValue(content, "Developer") || "unknown",
    stack: extractValue(content, "Stack") || null,
    variant: extractValue(content, "Variant") || null,
    // v4.0: New fields for requirement-driven workflow
    requirementFile: extractValue(content, "Requirement File") || null,
    taskType: extractValue(content, "Task Type") || null,
    module: extractValue(content, "Module") || null,
    scopeAssessment: extractValue(content, "Scope Assessment") || null,
    currentState: extractValue(content, "Current State") || "INITIAL",
    startedAt: extractValue(content, "Started") || new Date().toISOString(),
    lastUpdated:
      extractValue(content, "Last Updated") || new Date().toISOString(),
  };
}

function saveContext(contextPath, context) {
  const contextFile = path.join(contextPath, "context.md");

  const subFeatureInfo = context.subFeatureName
    ? `- **Sub-Feature**: ${context.subFeatureName}\n- **Parent Feature**: ${context.parentFeature || "N/A"}\n`
    : "";

  const stackInfo =
    context.stack && context.variant
      ? `- **Stack**: ${context.stack}\n- **Variant**: ${context.variant}\n`
      : "";

  // v4.0: New fields for requirement-driven workflow
  const requirementInfo = context.requirementFile
    ? `- **Requirement File**: ${context.requirementFile}\n- **Task Type**: ${context.taskType || "unknown"}\n- **Module**: ${context.module || "unknown"}\n`
    : "";

  const scopeAssessmentInfo = context.scopeAssessment
    ? `- **Scope Assessment**: ${context.scopeAssessment}\n`
    : "";

  const content = `# Feature Context: ${context.featureName}

## Metadata
- **Feature ID**: ${context.featureName}
- **Developer**: ${context.developerName}
${subFeatureInfo}${stackInfo}${requirementInfo}${scopeAssessmentInfo}- **Started**: ${context.startedAt}
- **Last Updated**: ${context.lastUpdated}
- **Current State**: ${context.currentState}
- **Branch**: ${getCurrentBranch()}

---

## Workflow Progress

Current Phase: **${context.currentState}**

---

*Last updated: ${context.lastUpdated}*
`;

  fs.writeFileSync(contextFile, content, "utf-8");
}

/**
 * Update ONLY metadata fields in context.md, preserving all other content.
 * This is the non-destructive alternative to saveContext().
 *
 * WHY: saveContext() regenerates the entire file from metadata object,
 * destroying all enriched content (Problem Statement, Architecture,
 * Decisions Log, etc.) that AI accumulates during workflow phases.
 *
 * This function uses regex replacement to surgically update only:
 * - Current State
 * - Last Updated
 * - Current Phase (in Workflow Progress section)
 * - Last updated timestamp (footer)
 *
 * @param {string} contextPath - Directory containing context.md
 * @param {object} updates - Fields to update { currentState, lastUpdated, ... }
 */
function updateContextMetadata(contextPath, updates) {
  const contextFile = path.join(contextPath, "context.md");

  if (!fs.existsSync(contextFile)) {
    throw new Error(
      `context.md not found at ${contextPath}. Run initContext() first.`
    );
  }

  let content = fs.readFileSync(contextFile, "utf-8");
  const original = content;

  if (updates.currentState) {
    const beforeState = content;
    content = content.replace(
      /(\*\*Current State\*\*:\s*).+/,
      `$1${updates.currentState}`
    );
    if (content === beforeState) {
      console.warn(`⚠️ Could not find **Current State** field to update in ${contextFile}`);
    }

    // Also update Workflow Progress section (non-critical — some files use table format)
    content = content.replace(
      /(Current Phase:\s*\*\*).+?(\*\*)/,
      `$1${updates.currentState}$2`
    );
  }

  if (updates.lastUpdated) {
    const beforeUpdated = content;
    content = content.replace(
      /(\*\*Last Updated\*\*:\s*).+/,
      `$1${updates.lastUpdated}`
    );
    if (content === beforeUpdated) {
      console.warn(`⚠️ Could not find **Last Updated** field to update in ${contextFile}`);
    }

    // Also update footer timestamp (non-critical)
    content = content.replace(
      /(\*Last updated:\s*).+?\*/,
      `$1${updates.lastUpdated}*`
    );
  }

  if (updates.scopeAssessment) {
    content = content.replace(
      /(\*\*Scope Assessment\*\*:\s*).+/,
      `$1${updates.scopeAssessment}`
    );
  }

  if (content !== original) {
    fs.writeFileSync(contextFile, content, "utf-8");
  }
}

/**
 * Add or update a section in context.md.
 * If section heading exists, replace its content. If not, append before footer.
 *
 * WHY: Each workflow phase produces different types of content that should
 * be accumulated in context.md. This helper enables safe section upsert
 * without risking data loss from other sections.
 *
 * @param {string} contextDir - Active context directory
 * @param {string} heading - Section heading (e.g., "## Problem Statement")
 * @param {string} sectionContent - Section content (markdown)
 */
function upsertContextSection(contextDir, heading, sectionContent) {
  const contextFile = path.join(contextDir, "context.md");
  if (!fs.existsSync(contextFile)) {
    console.warn(`⚠️ context.md not found at ${contextDir} — skipping section upsert`);
    return;
  }

  let fileContent = fs.readFileSync(contextFile, "utf-8");

  // Determine heading level (## or ###)
  const headingLevel = (heading.match(/^#+/) || ["##"])[0];
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Match section: from heading to next same-level heading or footer
  const sectionRegex = new RegExp(
    `(${escapedHeading}\\n)([\\s\\S]*?)(?=\\n${headingLevel} |\\n---\\n\\*Last updated|$)`
  );

  if (sectionRegex.test(fileContent)) {
    // Replace existing section content
    fileContent = fileContent.replace(sectionRegex, `$1${sectionContent}\n`);
  } else {
    // Append before footer
    const footerMatch = fileContent.match(/\n---\n\*Last updated/);
    if (footerMatch) {
      const insertPos = fileContent.indexOf(footerMatch[0]);
      fileContent =
        fileContent.slice(0, insertPos) +
        `\n${heading}\n${sectionContent}\n` +
        fileContent.slice(insertPos);
    } else {
      fileContent += `\n\n${heading}\n${sectionContent}\n`;
    }
  }

  fs.writeFileSync(contextFile, fileContent, "utf-8");
}

async function validateStackVariant(stackId, variantId) {
  try {
    const resolver = getStackResolver();
    await resolver.loadStacks();

    // Validate that stack and variant exist
    resolver.validateStack(stackId, variantId);

    // Get variant configuration for additional validation
    const variantConfig = resolver.getVariantConfig(stackId, variantId);

    console.log(`✅ Stack validation passed:`);
    console.log(`   Stack: ${variantConfig.stackName}`);
    console.log(`   Variant: ${variantConfig.variantName}`);
    console.log(`   Description: ${variantConfig.variantDescription}`);

    return variantConfig;
  } catch (error) {
    console.error(`❌ Stack/variant validation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Initialize context for EPS workflow
 * @param {string} featureName - Feature/REQ ID
 * @param {string} developerName - Developer name
 * @param {object} options - Additional options (v4.0)
 * @param {string} options.requirementFile - Path to requirement file
 * @param {string} options.taskType - Task type: new | enhancement | bugfix
 * @param {string} options.module - Module code: CST | LPN | MON | QLT | VBR | RPT
 * @param {string} options.stackId - Stack ID (optional)
 * @param {string} options.variantId - Variant ID (optional)
 */
async function initContext(featureName, developerName, options = {}) {
  // v5.3: Input validation — prevent [object Object] bug
  if (typeof featureName !== "string" || !featureName.trim()) {
    throw new Error(
      `Invalid featureName: expected non-empty string, got ${typeof featureName} (${String(featureName)})`
    );
  }
  if (typeof developerName !== "undefined" && typeof developerName !== "string") {
    throw new Error(
      `Invalid developerName: expected string, got ${typeof developerName} (${String(developerName)})`
    );
  }
  featureName = featureName.trim();

  const branchDir = getBranchContextDir();
  const developer = developerName || process.env.USER || "developer";

  // Create context in branch-specific directory
  const contextDir = path.join(branchDir, `${featureName}-${developer}`);

  if (fs.existsSync(contextDir)) {
    throw new Error(`Context already exists: ${contextDir}`);
  }

  // Destructure options and auto-detect stack/variant if not provided
  const { requirementFile, taskType, module } = options;
  let resolvedStackId = options.stackId;
  let resolvedVariantId = options.variantId;

  if (!resolvedStackId || !resolvedVariantId) {
    try {
      const resolver = getStackResolver();
      await resolver.loadStacks();
      const defaults = resolver.getDefaults();
      resolvedStackId = resolvedStackId || defaults.primary.stackKey;
      resolvedVariantId = resolvedVariantId || defaults.primary.variantId;
    } catch (e) {
      // Fallback if no project-config.json or stacks config
      resolvedStackId = resolvedStackId || "java-nextjs-postgres";
      resolvedVariantId = resolvedVariantId || "standard";
    }
  }

  // Validate resolved stack/variant
  if (resolvedStackId && resolvedVariantId) {
    await validateStackVariant(resolvedStackId, resolvedVariantId);
  }

  fs.mkdirSync(contextDir, { recursive: true });
  fs.mkdirSync(path.join(contextDir, "documents"), { recursive: true });
  fs.mkdirSync(path.join(contextDir, "plans"), { recursive: true });
  fs.mkdirSync(path.join(contextDir, "execution-checkpoints"), { recursive: true });

  const context = {
    featureName,
    developerName: developer,
    stack: resolvedStackId || null,
    variant: resolvedVariantId || null,
    // v4.0: New fields for requirement-driven workflow
    requirementFile: requirementFile || null,
    taskType: taskType || null,
    module: module || null,
    scopeAssessment: "PENDING",
    currentState: "INITIAL",
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };

  saveContext(contextDir, context);

  // v4.0: Generate evidence template based on task type
  const evidenceContent = generateEvidenceTemplate(
    featureName,
    requirementFile,
    taskType,
    module,
  );
  fs.writeFileSync(
    path.join(contextDir, "evidence.md"),
    evidenceContent,
    "utf-8",
  );

  return contextDir;
}

/**
 * Generate evidence template based on task type (v4.0 + v5.1 INF support)
 */
function generateEvidenceTemplate(reqId, requirementFile, taskType, module) {
  const timestamp = new Date().toISOString();

  // v5.1: Infrastructure template (no requirement file, codebase-focused)
  if (taskType === "infrastructure") {
    return `# Evidence Report for: ${reqId}

## 1. Metadata

- **Feature ID**: ${reqId}
- **Type**: infrastructure
- **Module**: ${module || "INF"}
- **Generated On**: ${timestamp}
- **Scope**: Framework/tooling improvement

## 2. Problem Statement

*[Describe the infrastructure problem to solve]*

## 3. Codebase Analysis

- **Files Analyzed**: *[To be populated during research]*
- **Current Implementation**: *[To be populated during research]*
- **Gaps Identified**: *[To be populated during research]*

## 4. Solution Direction

- **Approach**: *[To be populated during research]*
- **Files to Modify**: *[To be identified during research]*
- **Files to Create**: *[To be identified during research]*

## 5. Assumptions

*[To be populated during research]*

---
*Generated by EPS Workflow v5.1 - Infrastructure*
*Last updated: ${timestamp}*
`;
  }

  return `# Evidence Report for: ${reqId}

## 1. Metadata

- **Requirement ID**: ${reqId}
- **Source Requirement File**: \`${requirementFile || "Not specified"}\`
- **Type**: ${taskType || "Not specified"}
- **Module**: ${module || "Not specified"}
- **Generated On**: ${timestamp}

## 2. Requirement Summary

*[AI-generated summary of the requirement file will be added here]*

## 3. Analysis Sources & Findings

### 3.1. Codebase Analysis (Primary Source for enhancement/bugfix)

- **Files Scanned**: *[To be populated during research]*
- **Key Logic Identified**: *[To be populated during research]*
- **Conclusion**: *[To be populated during research]*

### 3.2. Project Documentation Analysis

- **Documents Reviewed**: *[To be populated during research]*
- **Findings**: *[To be populated during research]*

### 3.3. External Research (Only for new features or specific technical issues)

- **Query**: *[To be populated if needed]*
- **Finding**: *[To be populated if needed]*
- **Rationale**: *[To be populated if needed]*

## 4. Impact Analysis

- **Files to Modify**: *[To be identified during research]*
- **Database Changes**: *[To be identified during research]*
- **API Changes**: *[To be identified during research]*

## 5. Assumptions and Open Questions

*[To be populated during research]*

---
*Generated by EPS Workflow v4.0*
*Last updated: ${timestamp}*
`;
}

// ============================================
// INNOVATE_DD GATE APPROVAL (v5.2)
// ============================================

/**
 * Mark INNOVATE_DD as approved
 * Called when user approves innovate-dd-selection.md
 * @param {string} contextDir - Active context directory
 */
function approveInnovateDD(contextDir) {
  const context = loadContext(contextDir);
  const currentState = context.currentState;

  if (currentState !== "INNOVATE_DD") {
    throw new Error(
      `Cannot approve: current state is ${currentState}, expected INNOVATE_DD`,
    );
  }

  const selectionFile = path.join(contextDir, "innovate-dd-selection.md");
  if (!fs.existsSync(selectionFile)) {
    throw new Error("Cannot approve: innovate-dd-selection.md not found");
  }

  // v5.3: Non-destructive update (preserves Decisions Log from Phase 5.5)
  updateContextMetadata(contextDir, {
    currentState: "INNOVATE_DD_APPROVED",
    lastUpdated: new Date().toISOString(),
  });

  console.log("✅ INNOVATE_DD approved. Ready for /design --detail");
  return loadContext(contextDir);
}

// ============================================
// STATE VALIDATION
// ============================================

function validateTransition(currentState, command, taskType) {
  // v7.0: Task-type-aware workflow validation
  // Each task type has its own workflow definition.
  // Fallback to 'new' for backward compat (when taskType is undefined).
  const workflow = taskType && WORKFLOW_DEFINITIONS[taskType]
    ? WORKFLOW_DEFINITIONS[taskType]
    : WORKFLOW_DEFINITIONS["new"];

  // Command exists in this workflow?
  const transition = workflow[command];
  if (!transition) {
    return {
      valid: false,
      message: `Command /${command} is not part of ${taskType || "new"} workflow. ` +
        `Available commands: ${Object.keys(workflow).join(", ")}`,
    };
  }

  // Current state valid for this command?
  if (!transition.from.includes(currentState)) {
    return {
      valid: false,
      message: `Cannot run /${command} from state ${currentState}. ` +
        `Expected state: ${transition.from.join(" or ")}`,
    };
  }

  // Determine next state
  const nextState = transition.to || NEXT_STATE_MAP[currentState];
  return { valid: true, nextState };
}

// ============================================
// CLI INTERFACE
// ============================================

function parseCliOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].substring(2);
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        options[key] = value;
        i++; // Skip next argument as it's the value
      }
    }
  }
  return options;
}

function showHelp() {
  console.log(`State Manager - Enhanced Workflow (Branch-based)

Usage:
  node state-manager.js init <feature-name> [developer-name] [--stack <stack-id>] [--variant <variant-id>]
  node state-manager.js get
  node state-manager.js validate <command-name>
  node state-manager.js update <new-state>
  node state-manager.js --help

Commands:
  init      - Initialize a new feature context
  get       - Get current context information
  validate  - Validate if a command can run in current state
  update    - Update the current state

Options:
  --help           - Show this help message
  --stack <id>     - Specify technology stack (default: java-nextjs-postgres)
  --variant <id>   - Specify architectural variant (default: standard)

Available Stacks:
  java-nextjs-postgres  - Java Spring Boot + Next.js + PostgreSQL
  csharp-react-mssql    - C# ASP.NET Core + React + SQL Server
  nestjs-blockchain     - NestJS + Hyperledger Fabric + PostgreSQL

Examples:
  node state-manager.js init CMN015002 john
  node state-manager.js init CMN015002 john --stack java-nextjs-postgres --variant lightweight
  node state-manager.js init CRM001 mary --stack csharp-react-mssql --variant simplified-clean
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Handle --help or no arguments
  if (!command || command === "--help" || command === "-h") {
    showHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case "init": {
        const featureName = args[1];
        const developerName = args[2];
        const options = parseCliOptions(args);

        if (!featureName) {
          console.error(
            "❌ Usage: node state-manager.js init <feature-name> [developer-name] [--stack <id>] [--variant <id>]",
          );
          process.exit(1);
        }

        const contextDir = await initContext(featureName, developerName, {
          stackId: options.stack,
          variantId: options.variant,
          taskType: options.type,
          module: options.module,
          requirementFile: options.requirement,
        });
        const savedCtx = loadContext(contextDir);
        console.log(`✅ Context created: ${contextDir}`);
        console.log(`📍 Branch: ${getCurrentBranch()}`);
        console.log(`🔧 Stack: ${savedCtx.stack || "auto-detected"} / ${savedCtx.variant || "auto-detected"}`);
        break;
      }

      case "get": {
        const contextPath = findActiveContext();

        if (!contextPath) {
          console.error("❌ No active context found");
          process.exit(1);
        }

        const context = loadContext(contextPath);
        const output = {
          feature: context.featureName,
          developer: context.developerName,
          state: context.currentState,
          branch: getCurrentBranch(),
        };

        // Include stack/variant if present
        if (context.stack) {
          output.stack = context.stack;
        }
        if (context.variant) {
          output.variant = context.variant;
        }

        console.log(JSON.stringify(output, null, 2));
        break;
      }

      case "validate": {
        const commandName = args[1];

        if (!commandName) {
          console.error(
            "❌ Usage: node state-manager.js validate <command-name>",
          );
          process.exit(1);
        }

        const contextPath = findActiveContext();

        if (!contextPath) {
          console.error(
            "❌ No active context found. Run: node state-manager.js init <feature> [developer]",
          );
          process.exit(1);
        }

        const context = loadContext(contextPath);
        const result = validateTransition(context.currentState, commandName);

        if (!result.valid) {
          console.error(`❌ INVALID STATE TRANSITION\n\n${result.message}`);
          process.exit(1);
        }

        console.log(
          `✅ Valid transition: ${context.currentState} → ${result.nextState}`,
        );
        break;
      }

      case "update": {
        const newState = args[1];

        if (!newState) {
          console.error("❌ Usage: node state-manager.js update <new-state>");
          process.exit(1);
        }

        const contextPath = findActiveContext();

        if (!contextPath) {
          console.error("❌ No active context found");
          process.exit(1);
        }

        // v5.3: Non-destructive metadata update (preserves enriched content)
        updateContextMetadata(contextPath, {
          currentState: newState,
          lastUpdated: new Date().toISOString(),
        });
        console.log(`✅ State updated: ${newState}`);
        break;
      }

      default:
        console.error(`❌ Unknown command: ${command}

Usage:
  node state-manager.js init <feature-name> [developer-name]
  node state-manager.js get
  node state-manager.js validate <command-name>
  node state-manager.js update <new-state>
`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// ============================================
// HELPER FUNCTIONS FOR PATH RESOLUTION
// ============================================

/**
 * Get context.md file path for active context
 */
function getContextFile() {
  const contextPath = findActiveContext();
  if (!contextPath) {
    throw new Error("No active context found");
  }
  return path.join(contextPath, "context.md");
}

/**
 * Get evidence.md file path for active context
 */
function getEvidenceFile() {
  const contextPath = findActiveContext();
  if (!contextPath) {
    throw new Error("No active context found");
  }
  return path.join(contextPath, "evidence.md");
}

/**
 * Get documents directory path for active context
 */
function getDocumentsDir() {
  const contextPath = findActiveContext();
  if (!contextPath) {
    throw new Error("No active context found");
  }
  return path.join(contextPath, "documents");
}

/**
 * Get feature info from context
 */
function getFeatureInfo() {
  const contextPath = findActiveContext();
  if (!contextPath) {
    throw new Error("No active context found");
  }
  const context = loadContext(contextPath);
  return {
    name: context.featureName,
    developer: context.developerName,
    state: context.currentState,
    branch: getCurrentBranch(),
    contextPath: contextPath,
  };
}

/**
 * Update or create a section in evidence.md
 * @param {string} contextDir - Active context directory
 * @param {string} sectionHeading - e.g., "### 2.1 SRS Decisions"
 * @param {string} content - New section content (markdown)
 * @param {object} options - { corrections: [{from, to, reason}] }
 */
function updateEvidenceSection(
  contextDir,
  sectionHeading,
  content,
  options = {},
) {
  const evidencePath = path.join(contextDir, "evidence.md");
  if (!fs.existsSync(evidencePath)) {
    console.warn(
      `⚠️  evidence.md not found at ${contextDir} — skipping evidence update`,
    );
    return;
  }

  let evidence = fs.readFileSync(evidencePath, "utf8");
  const escapedHeading = sectionHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headingRegex = new RegExp(
    `(${escapedHeading})\\n([\\s\\S]*?)(?=\\n### |\\n## |$)`,
  );

  let finalContent = content;
  if (options.corrections && options.corrections.length > 0) {
    const correctionLines = options.corrections
      .map((c) => `> CORRECTED: "${c.from}" -> "${c.to}" (${c.reason})`)
      .join("\n");
    finalContent = correctionLines + "\n\n" + content;
  }

  if (headingRegex.test(evidence)) {
    evidence = evidence.replace(headingRegex, `$1\n${finalContent}\n`);
  } else {
    const insertPoint = evidence.lastIndexOf("\n---\n");
    if (insertPoint > -1) {
      evidence =
        evidence.slice(0, insertPoint) +
        `\n${sectionHeading}\n${finalContent}\n` +
        evidence.slice(insertPoint);
    } else {
      evidence += `\n\n${sectionHeading}\n${finalContent}\n`;
    }
  }

  fs.writeFileSync(evidencePath, evidence, "utf8");
  console.log(`Evidence updated: ${sectionHeading}`);
}

/**
 * Add a decision entry to context.md Decisions Log table
 * @param {string} contextDir - Active context directory
 * @param {object} decision - { phase, decision, choice, rationale, corrects }
 */
function addDecisionToContext(contextDir, decision) {
  const contextPath = path.join(contextDir, "context.md");
  if (!fs.existsSync(contextPath)) {
    console.warn(
      `⚠️  context.md not found at ${contextDir} — skipping decision log`,
    );
    return;
  }

  let context = fs.readFileSync(contextPath, "utf8");
  const tableHeader = "## Decisions Log";

  if (!context.includes(tableHeader)) {
    const logSection = `\n---\n\n${tableHeader}\n\n| # | Phase | Decision | Choice | Rationale | Corrects |\n|---|-------|----------|--------|-----------|----------|\n`;
    const insertPoint = context.lastIndexOf("\n---\n");
    if (insertPoint > -1) {
      context =
        context.slice(0, insertPoint) + logSection + context.slice(insertPoint);
    } else {
      context += logSection;
    }
  }

  const rows = (context.match(/^\| \d+ \|/gm) || []).length;
  const newRow = `| ${rows + 1} | ${decision.phase} | ${decision.decision} | ${decision.choice} | ${decision.rationale} | ${decision.corrects || "—"} |`;

  // Scope the search to Decisions Log section only
  const logStart = context.indexOf("## Decisions Log");
  const nextSection = context.indexOf("\n## ", logStart + 1);
  const sectionEnd = nextSection > -1 ? nextSection : context.length;

  const logSlice = context.slice(logStart, sectionEnd);
  const lastPipe = logSlice.lastIndexOf("|");
  const tableEnd = logStart + lastPipe;
  const lineEnd = context.indexOf("\n", tableEnd);

  if (lineEnd > -1) {
    context =
      context.slice(0, lineEnd + 1) +
      newRow +
      "\n" +
      context.slice(lineEnd + 1);
  } else {
    context += "\n" + newRow + "\n";
  }

  fs.writeFileSync(contextPath, context, "utf8");
  console.log(
    `Context decision logged: ${decision.phase} — ${decision.decision}`,
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  loadContext,
  saveContext,
  validateTransition,
  initContext,
  findActiveContext,
  getCurrentBranch,
  getBranchContextDir,
  // Helper functions
  getContextFile,
  getEvidenceFile,
  // Phase-specific helpers (v3.0)
  isInPhase,
  getCurrentPhase,
  SRS_STATES,
  BASIC_DESIGN_STATES,
  DETAIL_DESIGN_STATES,
  getDocumentsDir,
  getFeatureInfo,
  // v4.0 Orchestration helpers
  BD_ORCHESTRATION_STATES,
  getOrchestrationCheckpoint,
  getNextOrchestrationState,
  saveOrchestrationState,
  loadOrchestrationState,
  // v5.0 Evidence & Context enrichment
  updateEvidenceSection,
  addDecisionToContext,
  // v5.2 INNOVATE_DD gate enforcement
  approveInnovateDD,
  // v5.3: Non-destructive context updates
  updateContextMetadata,
  upsertContextSection,
  // v7.0: Task-type-aware workflows
  WORKFLOW_DEFINITIONS,
  // v8.0: Architecture workflow
  ARCHITECTURE_STATES,
};
