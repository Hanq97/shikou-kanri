'use strict';

const {
  NODE_TYPES,
  EDGE_TYPES,
  createGraphNode,
  createGraphEdge,
} = require('./unified-schema');

/**
 * Graph Schema V2 - Extended schema for knowledge graph with semantic types
 *
 * WHY: Support rich knowledge graph with semantic relationships for RAG
 * HOW: Define additional node/edge types for domain concepts, business rules
 *
 * Features:
 * - Semantic node types (DomainConcept, BusinessRule, DesignPattern)
 * - Requirement traceability edges
 * - Graph validation utilities
 * - HippoRAG integration schema
 * - Graph query helpers
 *
 * @module graph-schema-v2
 */

// Extended node types (beyond code structure)
const SEMANTIC_NODE_TYPES = {
  // Domain concepts (from LLM enrichment)
  DOMAIN_CONCEPT: 'DomainConcept',
  BUSINESS_RULE: 'BusinessRule',
  DESIGN_PATTERN: 'DesignPattern',

  // Requirements traceability
  FUNCTIONAL_REQUIREMENT: 'FunctionalRequirement',
  NON_FUNCTIONAL_REQUIREMENT: 'NonFunctionalRequirement',
  USER_STORY: 'UserStory',

  // Documentation
  DESIGN_DOC: 'DesignDoc',
  API_SPEC: 'ApiSpec',

  // Aggregates
  MODULE: 'Module',
  BOUNDED_CONTEXT: 'BoundedContext',
  FEATURE: 'Feature',
};

// Extended edge types (beyond code structure)
const SEMANTIC_EDGE_TYPES = {
  // Requirement traceability
  IMPLEMENTS_FR: 'IMPLEMENTS_FR',         // Code → FunctionalRequirement
  IMPLEMENTS_NFR: 'IMPLEMENTS_NFR',       // Code → NonFunctionalRequirement
  DERIVES_FROM: 'DERIVES_FROM',           // Requirement → UserStory

  // Domain relationships
  BELONGS_TO_DOMAIN: 'BELONGS_TO_DOMAIN', // Code → DomainConcept
  VALIDATES_BR: 'VALIDATES_BR',           // Code → BusinessRule
  USES_PATTERN: 'USES_PATTERN',           // Code → DesignPattern

  // Module/Boundary
  PART_OF_MODULE: 'PART_OF_MODULE',       // Class → Module
  PART_OF_CONTEXT: 'PART_OF_CONTEXT',     // Class → BoundedContext
  PART_OF_FEATURE: 'PART_OF_FEATURE',     // Code → Feature

  // Documentation
  DOCUMENTED_BY: 'DOCUMENTED_BY',         // Code → DesignDoc
  SPEC_BY: 'SPEC_BY',                     // API → ApiSpec

  // Cross-module
  DEPENDS_ON_MODULE: 'DEPENDS_ON_MODULE', // Module → Module
  CALLS_REMOTE: 'CALLS_REMOTE',           // Service → ExternalAPI
};

// All node types (merged)
const ALL_NODE_TYPES = {
  ...NODE_TYPES,
  ...SEMANTIC_NODE_TYPES,
};

// All edge types (merged)
const ALL_EDGE_TYPES = {
  ...EDGE_TYPES,
  ...SEMANTIC_EDGE_TYPES,
};

// Node categories for graph visualization
const NODE_CATEGORIES = {
  CODE: ['SourceFile', 'Class', 'Interface', 'Method', 'Function', 'Field'],
  FRAMEWORK: ['Controller', 'Service', 'Repository', 'Entity', 'Component'],
  NEXTJS: ['Page', 'Layout', 'ApiRoute', 'ServerComponent', 'ClientComponent', 'Hook', 'Context', 'Provider'],
  SEMANTIC: ['DomainConcept', 'BusinessRule', 'DesignPattern'],
  REQUIREMENTS: ['FunctionalRequirement', 'NonFunctionalRequirement', 'UserStory'],
  DOCUMENTATION: ['DesignDoc', 'ApiSpec'],
  AGGREGATE: ['Module', 'BoundedContext', 'Feature'],
};

// Edge categories for graph filtering
const EDGE_CATEGORIES = {
  CODE_STRUCTURE: ['DEFINED_IN', 'IMPORTS', 'EXTENDS', 'IMPLEMENTS', 'CALLS', 'USES'],
  FRAMEWORK: ['REALIZES', 'SERVES', 'PERSISTS', 'INJECTS'],
  SEMANTIC: ['IMPLEMENTS_FR', 'IMPLEMENTS_NFR', 'BELONGS_TO_DOMAIN', 'VALIDATES_BR', 'USES_PATTERN'],
  MODULE: ['PART_OF_MODULE', 'PART_OF_CONTEXT', 'PART_OF_FEATURE', 'DEPENDS_ON_MODULE'],
  DOCUMENTATION: ['DOCUMENTED_BY', 'SPEC_BY', 'DERIVES_FROM'],
};

/**
 * Create semantic node (domain concept, business rule, etc.)
 *
 * @param {string} type - Semantic node type
 * @param {string} name - Name
 * @param {object} attributes - Node attributes
 * @returns {GraphNode}
 */
function createSemanticNode(type, name, attributes = {}) {
  const id = `${type.toUpperCase()}-${name.replace(/\s+/g, '-')}`;

  return createGraphNode(type, id, {
    name,
    ...attributes,
    semantic: true,
  });
}

/**
 * Create requirement node
 *
 * @param {string} reqId - Requirement ID (e.g., "FR001", "NFR-PERF-01")
 * @param {string} title - Requirement title
 * @param {object} attributes - Additional attributes
 * @returns {GraphNode}
 */
function createRequirementNode(reqId, title, attributes = {}) {
  const isFR = reqId.toUpperCase().startsWith('FR');
  const type = isFR
    ? SEMANTIC_NODE_TYPES.FUNCTIONAL_REQUIREMENT
    : SEMANTIC_NODE_TYPES.NON_FUNCTIONAL_REQUIREMENT;

  return createGraphNode(type, `REQ-${reqId}`, {
    reqId,
    title,
    priority: attributes.priority || 'medium',
    status: attributes.status || 'active',
    ...attributes,
  });
}

/**
 * Create module node (for aggregate grouping)
 *
 * @param {string} name - Module name
 * @param {string} path - Module path
 * @param {object} attributes - Additional attributes
 * @returns {GraphNode}
 */
function createModuleNode(name, path, attributes = {}) {
  return createGraphNode(SEMANTIC_NODE_TYPES.MODULE, `MODULE-${name}`, {
    name,
    path,
    description: attributes.description || '',
    ...attributes,
  });
}

/**
 * Create feature node
 *
 * @param {string} code - Feature code (e.g., "cmn001000", "sfa002000")
 * @param {string} name - Feature name
 * @param {object} attributes - Additional attributes
 * @returns {GraphNode}
 */
function createFeatureNode(code, name, attributes = {}) {
  return createGraphNode(SEMANTIC_NODE_TYPES.FEATURE, `FEATURE-${code}`, {
    code,
    name,
    description: attributes.description || '',
    ...attributes,
  });
}

/**
 * Create traceability edge (code → requirement)
 *
 * @param {string} codeId - Code element ID
 * @param {string} reqId - Requirement ID
 * @param {object} attributes - Edge attributes
 * @returns {GraphEdge}
 */
function createTraceabilityEdge(codeId, reqId, attributes = {}) {
  const isFR = reqId.toUpperCase().startsWith('FR');
  const edgeType = isFR
    ? SEMANTIC_EDGE_TYPES.IMPLEMENTS_FR
    : SEMANTIC_EDGE_TYPES.IMPLEMENTS_NFR;

  return createGraphEdge(edgeType, codeId, `REQ-${reqId}`, {
    confidence: attributes.confidence || 0.8,
    verifiedBy: attributes.verifiedBy || 'llm',
    ...attributes,
  });
}

/**
 * Validate graph node
 *
 * @param {GraphNode} node - Node to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateNode(node) {
  const errors = [];

  if (!node.id) errors.push('Node missing id');
  if (!node.type) errors.push('Node missing type');
  if (!Object.values(ALL_NODE_TYPES).includes(node.type)) {
    errors.push(`Unknown node type: ${node.type}`);
  }
  if (!node.attributes) errors.push('Node missing attributes');

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate graph edge
 *
 * @param {GraphEdge} edge - Edge to validate
 * @param {Map<string, GraphNode>} nodes - Map of existing nodes
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateEdge(edge, nodes = new Map()) {
  const errors = [];

  if (!edge.type) errors.push('Edge missing type');
  if (!edge.source) errors.push('Edge missing source');
  if (!edge.target) errors.push('Edge missing target');
  if (!Object.values(ALL_EDGE_TYPES).includes(edge.type)) {
    errors.push(`Unknown edge type: ${edge.type}`);
  }

  // Validate nodes exist (if nodes map provided)
  if (nodes.size > 0) {
    if (!nodes.has(edge.source)) {
      errors.push(`Source node not found: ${edge.source}`);
    }
    if (!nodes.has(edge.target)) {
      errors.push(`Target node not found: ${edge.target}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate complete graph
 *
 * @param {object} graph - Graph { nodes: [], edges: [] }
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateGraph(graph) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(graph.nodes)) {
    errors.push('Graph must have nodes array');
    return { valid: false, errors, warnings };
  }

  if (!Array.isArray(graph.edges)) {
    errors.push('Graph must have edges array');
    return { valid: false, errors, warnings };
  }

  // Build node map
  const nodeMap = new Map();
  const nodeIds = new Set();

  for (const node of graph.nodes) {
    const validation = validateNode(node);
    if (!validation.valid) {
      errors.push(...validation.errors.map(e => `Node ${node.id || '?'}: ${e}`));
    }

    if (nodeIds.has(node.id)) {
      warnings.push(`Duplicate node id: ${node.id}`);
    }

    nodeIds.add(node.id);
    nodeMap.set(node.id, node);
  }

  // Validate edges
  const edgeSet = new Set();

  for (const edge of graph.edges) {
    const validation = validateEdge(edge, nodeMap);
    if (!validation.valid) {
      errors.push(...validation.errors.map(e => `Edge ${edge.source}->${edge.target}: ${e}`));
    }

    const edgeKey = `${edge.type}:${edge.source}:${edge.target}`;
    if (edgeSet.has(edgeKey)) {
      warnings.push(`Duplicate edge: ${edgeKey}`);
    }
    edgeSet.add(edgeKey);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get node category
 *
 * @param {string} nodeType - Node type
 * @returns {string|null} Category name
 */
function getNodeCategory(nodeType) {
  for (const [category, types] of Object.entries(NODE_CATEGORIES)) {
    if (types.includes(nodeType)) {
      return category;
    }
  }
  return null;
}

/**
 * Get edge category
 *
 * @param {string} edgeType - Edge type
 * @returns {string|null} Category name
 */
function getEdgeCategory(edgeType) {
  for (const [category, types] of Object.entries(EDGE_CATEGORIES)) {
    if (types.includes(edgeType)) {
      return category;
    }
  }
  return null;
}

/**
 * Filter graph by node category
 *
 * @param {object} graph - Graph { nodes: [], edges: [] }
 * @param {string} category - Category name
 * @returns {object} Filtered graph
 */
function filterByNodeCategory(graph, category) {
  const allowedTypes = NODE_CATEGORIES[category] || [];

  const filteredNodes = graph.nodes.filter(n => allowedTypes.includes(n.type));
  const nodeIds = new Set(filteredNodes.map(n => n.id));

  const filteredEdges = graph.edges.filter(e =>
    nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}

/**
 * Filter graph by edge category
 *
 * @param {object} graph - Graph { nodes: [], edges: [] }
 * @param {string} category - Category name
 * @returns {object} Filtered graph (edges only)
 */
function filterByEdgeCategory(graph, category) {
  const allowedTypes = EDGE_CATEGORIES[category] || [];

  const filteredEdges = graph.edges.filter(e => allowedTypes.includes(e.type));

  // Get all nodes referenced by filtered edges
  const nodeIds = new Set();
  for (const edge of filteredEdges) {
    nodeIds.add(edge.source);
    nodeIds.add(edge.target);
  }

  const filteredNodes = graph.nodes.filter(n => nodeIds.has(n.id));

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}

/**
 * Calculate graph statistics
 *
 * @param {object} graph - Graph { nodes: [], edges: [] }
 * @returns {object} Statistics
 */
function getGraphStats(graph) {
  const nodesByType = {};
  const edgesByType = {};

  for (const node of graph.nodes) {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
  }

  for (const edge of graph.edges) {
    edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
  }

  // Calculate connectivity
  const inDegree = new Map();
  const outDegree = new Map();

  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  }

  for (const edge of graph.edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
  }

  // Find isolated nodes (no edges)
  const isolatedNodes = graph.nodes.filter(n =>
    (inDegree.get(n.id) || 0) === 0 && (outDegree.get(n.id) || 0) === 0
  );

  // Find highly connected nodes (hubs)
  const totalDegree = new Map();
  for (const [id, deg] of inDegree) {
    totalDegree.set(id, deg + (outDegree.get(id) || 0));
  }

  const avgDegree = graph.nodes.length > 0
    ? Array.from(totalDegree.values()).reduce((a, b) => a + b, 0) / graph.nodes.length
    : 0;

  const hubs = graph.nodes
    .filter(n => (totalDegree.get(n.id) || 0) > avgDegree * 2)
    .map(n => ({ id: n.id, type: n.type, degree: totalDegree.get(n.id) }));

  return {
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    nodesByType,
    edgesByType,
    isolatedNodes: isolatedNodes.length,
    avgDegree: avgDegree.toFixed(2),
    hubs: hubs.slice(0, 10),  // Top 10 hubs
  };
}

/**
 * HippoRAG graph format converter
 * Converts internal graph to HippoRAG-compatible format
 *
 * @param {object} graph - Internal graph { nodes: [], edges: [] }
 * @returns {object} HippoRAG format
 */
function toHippoRAGFormat(graph) {
  const entities = [];
  const relations = [];

  // Convert nodes to entities
  for (const node of graph.nodes) {
    entities.push({
      id: node.id,
      type: node.type,
      name: node.attributes.name || node.id,
      properties: {
        ...node.attributes,
        category: getNodeCategory(node.type),
      },
    });
  }

  // Convert edges to relations
  for (const edge of graph.edges) {
    relations.push({
      source: edge.source,
      target: edge.target,
      type: edge.type,
      properties: {
        ...edge.attributes,
        category: getEdgeCategory(edge.type),
      },
    });
  }

  return {
    entities,
    relations,
    metadata: {
      totalEntities: entities.length,
      totalRelations: relations.length,
      exportedAt: new Date().toISOString(),
    },
  };
}

/**
 * From HippoRAG format converter
 * Converts HippoRAG format back to internal graph
 *
 * @param {object} hippoData - HippoRAG format data
 * @returns {object} Internal graph { nodes: [], edges: [] }
 */
function fromHippoRAGFormat(hippoData) {
  const nodes = [];
  const edges = [];

  // Convert entities to nodes
  for (const entity of hippoData.entities || []) {
    nodes.push(createGraphNode(entity.type, entity.id, {
      name: entity.name,
      ...entity.properties,
    }));
  }

  // Convert relations to edges
  for (const relation of hippoData.relations || []) {
    edges.push(createGraphEdge(
      relation.type,
      relation.source,
      relation.target,
      relation.properties || {}
    ));
  }

  return { nodes, edges };
}

module.exports = {
  // Type constants
  SEMANTIC_NODE_TYPES,
  SEMANTIC_EDGE_TYPES,
  ALL_NODE_TYPES,
  ALL_EDGE_TYPES,
  NODE_CATEGORIES,
  EDGE_CATEGORIES,
  // Factory functions
  createSemanticNode,
  createRequirementNode,
  createModuleNode,
  createFeatureNode,
  createTraceabilityEdge,
  // Validation
  validateNode,
  validateEdge,
  validateGraph,
  // Utilities
  getNodeCategory,
  getEdgeCategory,
  filterByNodeCategory,
  filterByEdgeCategory,
  getGraphStats,
  // HippoRAG integration
  toHippoRAGFormat,
  fromHippoRAGFormat,
};
