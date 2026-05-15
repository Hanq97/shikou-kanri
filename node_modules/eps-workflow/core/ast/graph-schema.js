/**
 * Graph Schema Definitions
 * Defines node types, edge types, regex patterns, and quality rules.
 * Pure constants module - no state, no side effects.
 */

// --- Node type definitions ---
const NODE_TYPES = {
  Requirement: {
    prefix: "FR-",
    pattern: /FR-[A-Z]{2,4}-[A-Z]{2,5}-\d{3}/g,
    source: "srs",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["title", "priority", "section", "subtype"],
  },
  NFRequirement: {
    prefix: "NFR-",
    pattern: /NFR-[A-Z]{2,5}-\d{3}/g,
    source: "srs",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["category", "threshold"],
  },
  BusinessRule: {
    prefix: "BR-",
    pattern: /BR-[A-Z]{2,4}-[A-Z]{2,5}-\d{3}/g,
    source: "srs",
    requiredAttrs: ["type", "feature"],
  },
  UserStory: {
    prefix: "US-",
    pattern: /US-[A-Z]{2,4}-[A-Z]{2,5}-\d{3}/g,
    source: "srs",
    requiredAttrs: ["type", "feature"],
  },
  Component: {
    prefix: "COMP-",
    pattern: /COMP-[A-Z][A-Za-z]+/g,
    source: "bd",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["layer"],
  },
  Entity: {
    prefix: "ENT-",
    pattern: /ENT-[A-Z][A-Za-z]+/g,
    source: "bd",
    requiredAttrs: ["type", "feature"],
  },
  API: {
    prefix: null,
    pattern: /(?:GET|POST|PUT|DELETE|PATCH)\s+\/[\w/:.-]+(?:\/[\w/:.-]+)*/g,
    source: "bdd",
    requiredAttrs: ["type", "method", "path", "feature"],
  },
  Screen: {
    prefix: "SCR-",
    pattern: /SCR-[A-Z]{2,4}-\d{3}/g,
    source: "fdd",
    requiredAttrs: ["type", "feature"],
  },
  TestCase: {
    prefix: null,
    pattern:
      /(?:UT|IT|E2E|MT|ST)-(?:BE|FE|API|DB|UI|A11Y|AUTH|AUTHZ|INJ|XSS)-\d{3}/g,
    source: "test-plan",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["subtype", "priority"],
  },
  SourceFile: {
    prefix: "SRC-",
    pattern: /SRC-[\w/.\\-]+\.(?:ts|tsx)/g,
    source: "source-code",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["filePath", "hash"],
  },
  Class: {
    prefix: "CLS-",
    pattern: /CLS-[A-Z][A-Za-z0-9]+/g,
    source: "source-code",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["className", "filePath", "decorators"],
  },
  Function: {
    prefix: "FN-",
    pattern: /FN-[a-zA-Z][A-Za-z0-9]+/g,
    source: "source-code",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["functionName", "filePath", "isExported"],
  },
  // ═══════════════════════════════════════════════════════════════
  // A+B+C PATTERN NODE TYPES (v2.0)
  // ═══════════════════════════════════════════════════════════════
  Portal: {
    prefix: "DOM-",
    pattern: /DOM-[A-Z]{2,4}/g,
    source: "portal-fdd",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["title", "targetUsers", "subFeatureCount"],
  },
  Workflow: {
    prefix: "WF-",
    pattern: /WF-[A-Z]{2,4}-\d{3}/g,
    source: "portal-fdd",
    requiredAttrs: ["type", "feature", "portal"],
    optionalAttrs: ["title", "actors", "trigger", "steps"],
  },
  UserJourney: {
    prefix: "UJ-",
    pattern: /UJ-[A-Z]{2,4}-\d{3}/g,
    source: "portal-fdd",
    requiredAttrs: ["type", "feature", "portal"],
    optionalAttrs: ["persona", "goal", "entryPoint", "exitPoint"],
  },
  Event: {
    prefix: "EVT-",
    pattern: /EVT-[A-Z]{2,4}-\d{3}/g,
    source: "portal-fdd",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["trigger", "payload", "publishers", "subscribers"],
  },
  SharedComponent: {
    prefix: "SC-",
    pattern: /SC-[A-Z][A-Za-z]+/g,
    source: "aggregate-fdd",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["props", "usedBy", "category"],
  },
  TechnicalConcern: {
    prefix: "TC-",
    pattern: /TC-[A-Z]{3,10}/g,
    source: "aggregate-fdd",
    requiredAttrs: ["type", "feature", "category"],
    optionalAttrs: ["implementation", "appliesTo"],
  },
  AppShell: {
    prefix: "AS-",
    pattern: /AS-[A-Z]{2,4}/g,
    source: "aggregate-fdd",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["layout", "navigation", "routes"],
  },
  // ═══════════════════════════════════════════════════════════════
  // ARCHITECTURE NODE TYPES
  // ═══════════════════════════════════════════════════════════════
  Service: {
    prefix: "SVC-",
    pattern: /SVC-[A-Z][A-Za-z0-9-]+/g,
    source: "architecture",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["name", "layer", "techStack"],
  },
  ADR: {
    prefix: "ADR-",
    pattern: /ADR-\d{3}/g,
    source: "adr",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["title", "status", "supersedes"],
  },
  DomainEvent: {
    prefix: "DE-",
    pattern: /DE-[A-Z][A-Za-z0-9.]+/g,
    source: "catalog",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["name", "payload", "publisher", "subscribers"],
  },
  IntegrationContract: {
    prefix: "IC-",
    pattern: /IC-[A-Z]+-[A-Z]+/g,
    source: "integration-pattern",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["from", "to", "protocol"],
  },
  Catalog: {
    prefix: "CAT-",
    pattern: /CAT-[A-Z]+-\d{3}/g,
    source: "catalog",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["name", "category"],
  },
  // ═══════════════════════════════════════════════════════════════
  // EPS KNOWLEDGE NODE TYPES
  // ═══════════════════════════════════════════════════════════════
  EPSPhase: {
    prefix: "PHASE-",
    pattern: /PHASE-[A-Z]+/g,
    source: "eps-standard",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["name", "order"],
  },
  EPSAgent: {
    prefix: "AG-",
    pattern: /AG-[A-Za-z][A-Za-z0-9-]+/g,
    source: "eps-specialist",
    requiredAttrs: ["type", "feature"],
    optionalAttrs: ["name", "category", "techStack"],
  },
};

// --- Edge type definitions ---
const EDGE_TYPES = {
  IMPLEMENTS: { from: ["Component"], to: ["Requirement", "UserStory"] },
  EXPOSES: { from: ["API"], to: ["Component"] },
  DISPLAYS: { from: ["Screen"], to: ["Requirement", "UserStory"] },
  TESTS: { from: ["TestCase"], to: ["Requirement"] },
  DEPENDS_ON: {
    from: ["Requirement", "Component"],
    to: ["Requirement", "Component"],
  },
  CONSTRAINS: { from: ["NFRequirement"], to: ["Component"] },
  PERSISTS: { from: ["Entity"], to: ["Component"] },
  USES: { from: ["Screen"], to: ["API"] },
  VALIDATES: { from: ["TestCase"], to: ["API"] },
  REALIZES: { from: ["Class"], to: ["Component"] },
  SERVES: { from: ["Class"], to: ["API"] },
  DEFINED_IN: { from: ["Class", "Function"], to: ["SourceFile"] },
  IMPORTS: { from: ["SourceFile"], to: ["SourceFile"] },
  // ═══════════════════════════════════════════════════════════════
  // A+B+C PATTERN EDGE TYPES (v2.0)
  // ═══════════════════════════════════════════════════════════════
  CONTAINS: { from: ["Portal"], to: ["Workflow", "UserJourney"] },
  INCLUDES: { from: ["UserJourney"], to: ["Screen"] },
  TRIGGERS: { from: ["Screen", "Component"], to: ["Event"] },
  CONSUMES: { from: ["Component", "Screen"], to: ["Event"] },
  CALLS: { from: ["API"], to: ["API"] },
  USES_SHARED: { from: ["Component", "Screen"], to: ["SharedComponent"] },
  ADDRESSES: { from: ["Component", "Screen"], to: ["TechnicalConcern"] },
  BELONGS_TO: { from: ["Screen", "Workflow"], to: ["Portal"] },
  // ═══════════════════════════════════════════════════════════════
  // ARCHITECTURE EDGE TYPES
  // ═══════════════════════════════════════════════════════════════
  SUPERSEDES: { from: ["ADR"], to: ["ADR"] },
  PUBLISHES: { from: ["Service", "Component"], to: ["DomainEvent", "Event"] },
  SUBSCRIBES: { from: ["Service", "Component"], to: ["DomainEvent", "Event"] },
  INTEGRATES_WITH: { from: ["Service"], to: ["Service"] },
  GOVERNED_BY: { from: ["Service", "Component"], to: ["ADR"] },
  REFERENCES: {
    from: ["Service", "Component", "Requirement"],
    to: ["Catalog"],
  },
  // ═══════════════════════════════════════════════════════════════
  // EPS KNOWLEDGE EDGE TYPES
  // ═══════════════════════════════════════════════════════════════
  PHASE_USES: { from: ["EPSPhase"], to: ["EPSAgent"] },
  GUIDES: { from: ["EPSPhase"], to: ["EPSPhase"] },
};

// --- Quality gate rules ---
const QUALITY_RULES = {
  Q5_FR_COVERAGE: {
    description: "Every FR must have >= 1 TESTS edge",
    nodeType: "Requirement",
    edgeType: "TESTS",
    direction: "inbound",
    threshold: 0.8,
    severity: "error",
  },
  Q6_COMP_ORPHAN: {
    description: "Every Component must have >= 1 IMPLEMENTS edge",
    nodeType: "Component",
    edgeType: "IMPLEMENTS",
    direction: "outbound",
    threshold: 1.0,
    severity: "warning",
  },
  Q7_API_TESTED: {
    description: "Every API must have >= 1 VALIDATES edge",
    nodeType: "API",
    edgeType: "VALIDATES",
    direction: "inbound",
    threshold: 0.9,
    severity: "warning",
  },
};

// --- Context mapping: which node types are relevant for which agent ---
const AGENT_CONTEXT_MAP = {
  // BD agents
  "bd-architecture-agent": {
    nodeTypes: ["Requirement", "NFRequirement"],
    edgeTypes: ["DEPENDS_ON"],
  },
  "bd-component-agent": {
    nodeTypes: ["Requirement"],
    edgeTypes: ["DEPENDS_ON"],
  },
  "bd-dataflow-agent": {
    nodeTypes: ["Component", "Requirement"],
    edgeTypes: ["IMPLEMENTS"],
  },
  "bd-datamodel-agent": {
    nodeTypes: ["Entity", "Component", "Requirement"],
    edgeTypes: ["PERSISTS", "IMPLEMENTS"],
  },
  "bd-state-agent": {
    nodeTypes: ["Component", "Entity"],
    edgeTypes: ["PERSISTS"],
  },
  "bd-nfr-agent": {
    nodeTypes: ["NFRequirement", "Component"],
    edgeTypes: ["CONSTRAINS"],
  },
  // BDD agents
  "bdd-api-agent": {
    nodeTypes: ["Component", "Requirement", "Screen"],
    edgeTypes: ["IMPLEMENTS", "USES"],
  },
  "bdd-service-agent": {
    nodeTypes: ["Component", "API"],
    edgeTypes: ["EXPOSES"],
  },
  "bdd-entity-agent": {
    nodeTypes: ["Entity", "Component"],
    edgeTypes: ["PERSISTS"],
  },
  // FDD agents
  "fdd-component-agent": {
    nodeTypes: ["Requirement", "UserStory"],
    edgeTypes: ["DEPENDS_ON"],
  },
  "fdd-api-integration-agent": {
    nodeTypes: ["API", "Component"],
    edgeTypes: ["EXPOSES"],
  },
  // Test Plan agents
  "tp-03-unit-tests": {
    nodeTypes: ["Component", "Requirement"],
    edgeTypes: ["IMPLEMENTS"],
  },
  "tp-04-integration-tests": {
    nodeTypes: ["API", "Component"],
    edgeTypes: ["EXPOSES"],
  },
  "tp-05-e2e-tests": {
    nodeTypes: ["Screen", "API", "Requirement"],
    edgeTypes: ["USES", "DISPLAYS"],
  },
  // Plan & Execute agents (source code awareness)
  "plan-agent": {
    nodeTypes: ["Component", "Class", "SourceFile", "Requirement"],
    edgeTypes: ["REALIZES", "DEFINED_IN", "IMPLEMENTS"],
  },
  "execute-agent": {
    nodeTypes: ["Class", "Function", "SourceFile", "Component"],
    edgeTypes: ["REALIZES", "DEFINED_IN", "IMPORTS", "SERVES"],
  },
  // A+B+C Pattern Agents
  "portal-fdd-agent": {
    nodeTypes: ["Requirement", "UserStory", "Component", "Screen"],
    edgeTypes: ["IMPLEMENTS", "DEPENDS_ON", "DISPLAYS"],
  },
  "aggregate-fdd-agent": {
    nodeTypes: ["Component", "Screen", "NFRequirement", "SharedComponent"],
    edgeTypes: ["CONSTRAINS", "USES", "USES_SHARED"],
  },
  "screens-fdd-agent": {
    nodeTypes: ["Screen", "SharedComponent", "Workflow", "UserJourney", "API"],
    edgeTypes: ["INCLUDES", "USES_SHARED", "BELONGS_TO", "USES"],
  },
  // Architecture agents
  "architecture-agent": {
    nodeTypes: [
      "Service",
      "ADR",
      "DomainEvent",
      "IntegrationContract",
      "Catalog",
      "Component",
    ],
    edgeTypes: [
      "INTEGRATES_WITH",
      "PUBLISHES",
      "SUBSCRIBES",
      "SUPERSEDES",
      "GOVERNED_BY",
      "REFERENCES",
    ],
  },
  // EPS knowledge agents
  "eps-knowledge-agent": {
    nodeTypes: ["EPSPhase", "EPSAgent"],
    edgeTypes: ["PHASE_USES", "GUIDES"],
  },
};

// --- Validation helpers ---

/**
 * Get node type from an ID string
 * @param {string} id - Node ID (e.g., 'FR-LND-INVS-001', 'COMP-InvestmentService')
 * @returns {string|null} Type name or null if no match
 */
function getNodeType(id) {
  if (!id || typeof id !== "string") return null;

  for (const [typeName, typeDef] of Object.entries(NODE_TYPES)) {
    if (typeDef.prefix && id.startsWith(typeDef.prefix)) {
      return typeName;
    }
  }

  // Check API pattern (no prefix)
  if (/^API-(?:GET|POST|PUT|DELETE|PATCH)-/.test(id)) {
    return "API";
  }

  // Check TestCase pattern (no fixed prefix)
  if (/^(?:UT|IT|E2E|MT|ST)-/.test(id)) {
    return "TestCase";
  }

  // Check SourceFile pattern (SRC- with path)
  if (/^SRC-/.test(id)) {
    return "SourceFile";
  }

  // Check Class pattern (CLS-)
  if (/^CLS-/.test(id)) {
    return "Class";
  }

  // Check Function pattern (FN-)
  if (/^FN-/.test(id)) {
    return "Function";
  }

  // ═══════════════════════════════════════════════════════════════
  // A+B+C Pattern type detection
  // ═══════════════════════════════════════════════════════════════
  if (/^DOM-/.test(id)) return "Portal";
  if (/^WF-/.test(id)) return "Workflow";
  if (/^UJ-/.test(id)) return "UserJourney";
  if (/^EVT-/.test(id)) return "Event";
  if (/^SC-/.test(id)) return "SharedComponent";
  if (/^TC-/.test(id)) return "TechnicalConcern";
  if (/^AS-/.test(id)) return "AppShell";

  // Architecture type detection
  if (/^SVC-/.test(id)) return "Service";
  if (/^ADR-/.test(id)) return "ADR";
  if (/^DE-/.test(id)) return "DomainEvent";
  if (/^IC-/.test(id)) return "IntegrationContract";
  if (/^CAT-/.test(id)) return "Catalog";

  // EPS type detection
  if (/^PHASE-/.test(id)) return "EPSPhase";
  if (/^AG-/.test(id)) return "EPSAgent";

  return null;
}

/**
 * Validate node attributes against schema
 * @param {string} id - Node ID
 * @param {object} attributes - Node attributes
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateNode(id, attributes) {
  const errors = [];
  const typeName = attributes.type || getNodeType(id);

  if (!typeName) {
    errors.push(`Cannot determine type for node: ${id}`);
    return { valid: false, errors };
  }

  const typeDef = NODE_TYPES[typeName];
  if (!typeDef) {
    errors.push(`Unknown node type: ${typeName}`);
    return { valid: false, errors };
  }

  // Check required attributes
  for (const attr of typeDef.requiredAttrs) {
    if (attributes[attr] === undefined || attributes[attr] === null) {
      errors.push(
        `Missing required attribute '${attr}' for ${typeName} node: ${id}`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate edge type constraints (from/to node types)
 * @param {string} source - Source node ID
 * @param {string} target - Target node ID
 * @param {object} attributes - Edge attributes (must include 'type')
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateEdge(source, target, attributes) {
  const errors = [];

  if (!attributes || !attributes.type) {
    errors.push("Edge must have a type attribute");
    return { valid: false, errors };
  }

  const edgeDef = EDGE_TYPES[attributes.type];
  if (!edgeDef) {
    errors.push(`Unknown edge type: ${attributes.type}`);
    return { valid: false, errors };
  }

  const sourceType = getNodeType(source);
  const targetType = getNodeType(target);

  if (sourceType && !edgeDef.from.includes(sourceType)) {
    errors.push(
      `Edge type ${attributes.type} cannot have source of type ${sourceType} (allowed: ${edgeDef.from.join(", ")})`,
    );
  }

  if (targetType && !edgeDef.to.includes(targetType)) {
    errors.push(
      `Edge type ${attributes.type} cannot have target of type ${targetType} (allowed: ${edgeDef.to.join(", ")})`,
    );
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  NODE_TYPES,
  EDGE_TYPES,
  QUALITY_RULES,
  AGENT_CONTEXT_MAP,
  validateNode,
  validateEdge,
  getNodeType,
};
