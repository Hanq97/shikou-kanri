'use strict';

const {
  NODE_TYPES,
  EDGE_TYPES,
  createGraphNode,
  createGraphEdge,
} = require('./unified-schema');

/**
 * AST Graph Builder - Build knowledge graph from parsed ASTs
 *
 * WHY: Create rich knowledge graph for RAG retrieval
 * HOW: Extract nodes/edges from UnifiedAST with semantic relationships
 *
 * Node Types:
 * - SourceFile, Class, Interface, Method, Function, Field
 * - Controller, Service, Repository, Entity (Spring)
 * - Page, Layout, ApiRoute, Component (Next.js)
 * - ArchPattern, ArchLayer, ArchStereotype, ArchDatabase (Architecture)
 *
 * Edge Types:
 * - DEFINED_IN, IMPORTS, EXTENDS, IMPLEMENTS, CALLS, USES
 * - REALIZES, SERVES, PERSISTS, INJECTS (Framework)
 * - IMPLEMENTS_FR, VALIDATES_BR, BELONGS_TO_DOMAIN (Semantic)
 * - BELONGS_TO_LAYER, CONFORMS_TO, HAS_STEREOTYPE, USES_DATABASE (Architecture)
 *
 * @module ast-graph-builder
 */

/**
 * ASTGraphBuilder class (exported as GraphBuilderV2 for backward compatibility)
 */
class GraphBuilderV2 {
  constructor() {
    this.nodes = new Map();  // id -> node
    this.edges = [];         // Array of edges
    this._stats = {
      nodesCreated: 0,
      edgesCreated: 0,
      duplicatesSkipped: 0,
    };
  }

  /**
   * Build graph from a single AST
   *
   * @param {UnifiedAST} ast - Parsed AST
   * @returns {object} { nodes: [], edges: [] }
   */
  buildFromAST(ast) {
    // Create source file node
    const fileNodeId = this._createFileNode(ast);

    // Process classes
    for (const cls of ast.classes) {
      this._processClass(cls, fileNodeId, ast);
    }

    // Process top-level functions
    for (const fn of ast.functions) {
      this._processFunction(fn, fileNodeId, ast);
    }

    // Process imports
    this._processImports(ast, fileNodeId);

    // Process framework-specific relationships
    if (ast.framework) {
      this._processFramework(ast.framework, fileNodeId);
    }

    // Process architecture metadata
    if (ast.architecture) {
      this._processArchitecture(ast, fileNodeId);
    }

    return this.getGraph();
  }

  /**
   * Build graph from multiple ASTs
   *
   * @param {UnifiedAST[]} asts - Array of parsed ASTs
   * @returns {object} { nodes: [], edges: [] }
   */
  buildFromASTs(asts) {
    for (const ast of asts) {
      this.buildFromAST(ast);
    }

    // After all ASTs are processed, create cross-file edges
    this._createCrossFileEdges();

    return this.getGraph();
  }

  /**
   * Add enrichment data to existing nodes
   *
   * @param {string} filePath - File path to enrich
   * @param {object} enrichment - Enrichment data from LLM
   */
  addEnrichment(filePath, enrichment) {
    const fileNodeId = `SRC-${filePath}`;
    const fileNode = this.nodes.get(fileNodeId);

    if (!fileNode) {
      console.warn(`[GraphBuilderV2] No node found for ${filePath}`);
      return;
    }

    // Add domain concepts as new nodes and edges
    if (enrichment.domainConcepts) {
      for (const concept of enrichment.domainConcepts) {
        const conceptId = `DOMAIN-${concept.name}`;

        // Create domain concept node if not exists
        if (!this.nodes.has(conceptId)) {
          this._addNode(createGraphNode('DomainConcept', conceptId, {
            name: concept.name,
            type: concept.type,
          }));
        }

        // Create edge from file to domain
        this._addEdge(createGraphEdge(
          EDGE_TYPES.BELONGS_TO_DOMAIN,
          fileNodeId,
          conceptId,
          { confidence: concept.confidence }
        ));
      }
    }

    // Add business rules
    if (enrichment.businessRules) {
      for (const rule of enrichment.businessRules) {
        const ruleId = `BR-${rule.name.replace(/\s+/g, '-')}`;

        if (!this.nodes.has(ruleId)) {
          this._addNode(createGraphNode('BusinessRule', ruleId, {
            name: rule.name,
            description: rule.description,
          }));
        }

        this._addEdge(createGraphEdge(
          EDGE_TYPES.VALIDATES_BR,
          fileNodeId,
          ruleId,
          { location: rule.location }
        ));
      }
    }

    // Add patterns
    if (enrichment.patterns) {
      for (const pattern of enrichment.patterns) {
        const patternId = `PATTERN-${pattern.name.replace(/\s+/g, '-')}`;

        if (!this.nodes.has(patternId)) {
          this._addNode(createGraphNode('DesignPattern', patternId, {
            name: pattern.name,
            type: pattern.type,
          }));
        }

        this._addEdge(createGraphEdge(
          EDGE_TYPES.USES_PATTERN,
          fileNodeId,
          patternId,
          { confidence: pattern.confidence }
        ));
      }
    }
  }

  /**
   * Get the built graph
   *
   * @returns {object} { nodes: [], edges: [], stats: {} }
   */
  getGraph() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      stats: { ...this._stats },
    };
  }

  /**
   * Clear the graph
   */
  clear() {
    this.nodes.clear();
    this.edges = [];
    this._stats = {
      nodesCreated: 0,
      edgesCreated: 0,
      duplicatesSkipped: 0,
    };
  }

  /**
   * Export graph in various formats
   *
   * @param {string} format - 'json' | 'graphology' | 'cytoscape'
   * @returns {object} Formatted graph
   */
  export(format = 'json') {
    const graph = this.getGraph();

    switch (format) {
      case 'graphology':
        return this._toGraphologyFormat(graph);
      case 'cytoscape':
        return this._toCytoscapeFormat(graph);
      default:
        return graph;
    }
  }

  // --- Private Methods ---

  /**
   * Process architecture metadata from enriched AST (Phase 2)
   * Creates ARCH-*, LAYER-*, STEREO-*, DB-* nodes and edges
   * @private
   * @param {UnifiedAST} ast - Enriched AST with architecture info
   * @param {string} fileNodeId - Source file node ID
   */
  _processArchitecture(ast, fileNodeId) {
    const arch = ast.architecture;
    if (!arch) return;

    // Create architecture pattern node (global singleton)
    if (arch.pattern) {
      const archPatternId = `ARCH-${arch.pattern}`;
      if (!this.nodes.has(archPatternId)) {
        this._addNode(createGraphNode(NODE_TYPES.ARCH_PATTERN, archPatternId, {
          name: arch.pattern,
          description: this._getArchPatternDescription(arch.pattern),
        }));
      }

      // Create CONFORMS_TO edge from file to pattern
      this._addEdge(createGraphEdge(
        EDGE_TYPES.CONFORMS_TO,
        fileNodeId,
        archPatternId,
        { confidence: arch.confidence }
      ));
    }

    // Create layer node (global singleton)
    if (arch.layer) {
      const layerId = `LAYER-${arch.layer}`;
      if (!this.nodes.has(layerId)) {
        this._addNode(createGraphNode(NODE_TYPES.ARCH_LAYER, layerId, {
          name: arch.layer,
          pattern: arch.pattern,
        }));
      }

      // Create BELONGS_TO_LAYER edge from file to layer
      this._addEdge(createGraphEdge(
        EDGE_TYPES.BELONGS_TO_LAYER,
        fileNodeId,
        layerId,
        { confidence: arch.confidence }
      ));
    }

    // Create stereotype node (global singleton)
    if (arch.stereotype) {
      const stereoId = `STEREO-${arch.stereotype}`;
      if (!this.nodes.has(stereoId)) {
        this._addNode(createGraphNode(NODE_TYPES.ARCH_STEREOTYPE, stereoId, {
          name: arch.stereotype,
        }));
      }

      // Create HAS_STEREOTYPE edge from file to stereotype
      this._addEdge(createGraphEdge(
        EDGE_TYPES.HAS_STEREOTYPE,
        fileNodeId,
        stereoId,
        {}
      ));
    }

    // Create database technology node
    if (arch.databaseAccess?.technology) {
      const dbId = `DB-${arch.databaseAccess.technology}`;
      if (!this.nodes.has(dbId)) {
        this._addNode(createGraphNode(NODE_TYPES.ARCH_DATABASE, dbId, {
          name: arch.databaseAccess.technology,
          pattern: arch.databaseAccess.pattern,
          reactive: arch.databaseAccess.reactive,
        }));
      }

      // Create USES_DATABASE edge from file to database tech
      this._addEdge(createGraphEdge(
        EDGE_TYPES.USES_DATABASE,
        fileNodeId,
        dbId,
        { pattern: arch.databaseAccess.pattern }
      ));
    }

    // Process class-level architecture
    for (const cls of ast.classes || []) {
      if (cls.architecture) {
        const classId = `CLS-${cls.name}`;

        // Layer edge for class
        if (cls.architecture.layer) {
          const layerId = `LAYER-${cls.architecture.layer}`;
          this._addEdge(createGraphEdge(
            EDGE_TYPES.BELONGS_TO_LAYER,
            classId,
            layerId,
            {}
          ));
        }

        // Stereotype edge for class
        if (cls.architecture.stereotype) {
          const stereoId = `STEREO-${cls.architecture.stereotype}`;
          if (!this.nodes.has(stereoId)) {
            this._addNode(createGraphNode(NODE_TYPES.ARCH_STEREOTYPE, stereoId, {
              name: cls.architecture.stereotype,
            }));
          }

          this._addEdge(createGraphEdge(
            EDGE_TYPES.HAS_STEREOTYPE,
            classId,
            stereoId,
            {}
          ));
        }
      }
    }
  }

  /**
   * Get description for architecture pattern
   * @private
   */
  _getArchPatternDescription(pattern) {
    const descriptions = {
      'clean-architecture': 'Clean Architecture by Uncle Bob - Dependency rule: dependencies point inward',
      'hexagonal': 'Hexagonal/Ports & Adapters by Alistair Cockburn - Core isolated via ports',
      'onion': 'Onion Architecture by Jeffrey Palermo - Layers wrap the domain core',
      'layered': 'Traditional N-Tier Layered Architecture',
      'vertical-slices': 'Vertical Slices by Jimmy Bogard - Feature-based organization',
      'feature-sliced': 'Feature-Sliced Design - Frontend feature modules',
      'cqrs': 'CQRS - Command Query Responsibility Segregation',
      'ddd': 'Domain-Driven Design - Bounded contexts and aggregates',
      'mvc': 'Model-View-Controller pattern',
      'mvvm': 'Model-View-ViewModel pattern',
    };
    return descriptions[pattern] || `Architecture pattern: ${pattern}`;
  }

  _createFileNode(ast) {
    const id = `SRC-${ast.filePath}`;

    this._addNode(createGraphNode(NODE_TYPES.SOURCE_FILE, id, {
      filePath: ast.filePath,
      language: ast.language,
      packageName: ast.packageName,
      linesOfCode: ast.meta.linesOfCode,
      framework: ast.framework?.name,
    }));

    return id;
  }

  _processClass(cls, fileNodeId, ast) {
    // Determine node type based on kind and markers
    let nodeType = NODE_TYPES.CLASS;
    if (cls.kind === 'interface') nodeType = NODE_TYPES.INTERFACE;
    if (cls.kind === 'enum') nodeType = NODE_TYPES.CLASS;  // Treat as class

    // Check for framework-specific types
    const markers = cls.markers.map(m => m.name);
    if (markers.includes('RestController') || markers.includes('Controller')) {
      nodeType = NODE_TYPES.CONTROLLER;
    } else if (markers.includes('Service')) {
      nodeType = NODE_TYPES.SERVICE;
    } else if (markers.includes('Repository')) {
      nodeType = NODE_TYPES.REPOSITORY;
    } else if (markers.includes('Entity')) {
      nodeType = NODE_TYPES.ENTITY;
    } else if (markers.includes('Component')) {
      nodeType = NODE_TYPES.COMPONENT;
    }

    const classId = `CLS-${cls.name}`;

    this._addNode(createGraphNode(nodeType, classId, {
      name: cls.name,
      kind: cls.kind,
      isPublic: cls.isPublic,
      isAbstract: cls.isAbstract,
      markers: markers,
      lineNumber: cls.lineNumber,
    }));

    // DEFINED_IN edge
    this._addEdge(createGraphEdge(
      EDGE_TYPES.DEFINED_IN,
      classId,
      fileNodeId,
      {}
    ));

    // EXTENDS edge
    if (cls.extends) {
      const parentId = `CLS-${cls.extends}`;
      this._addEdge(createGraphEdge(
        EDGE_TYPES.EXTENDS,
        classId,
        parentId,
        {}
      ));
    }

    // IMPLEMENTS edges
    for (const iface of cls.implements || []) {
      const ifaceId = `CLS-${iface}`;
      this._addEdge(createGraphEdge(
        EDGE_TYPES.IMPLEMENTS,
        classId,
        ifaceId,
        {}
      ));
    }

    // Process methods
    for (const method of cls.methods) {
      this._processMethod(method, classId);
    }

    // Process fields (for dependency injection detection)
    for (const field of cls.fields) {
      this._processField(field, classId);
    }
  }

  _processMethod(method, classId) {
    const methodId = `MTD-${classId.replace('CLS-', '')}-${method.name}`;

    this._addNode(createGraphNode(NODE_TYPES.METHOD, methodId, {
      name: method.name,
      visibility: method.visibility,
      isStatic: method.isStatic,
      isAsync: method.isAsync,
      returnType: method.returnType,
      parameters: method.parameters.map(p => `${p.type || ''} ${p.name}`).join(', '),
      markers: method.markers.map(m => m.name),
      lineNumber: method.lineNumber,
    }));

    // DEFINED_IN edge to class
    this._addEdge(createGraphEdge(
      EDGE_TYPES.DEFINED_IN,
      methodId,
      classId,
      {}
    ));
  }

  _processField(field, classId) {
    // Skip primitive fields, only process object references
    const primitives = ['int', 'long', 'short', 'byte', 'float', 'double', 'boolean', 'char', 'string'];
    const fieldType = (field.type || '').toLowerCase();

    if (primitives.some(p => fieldType.startsWith(p))) {
      return;
    }

    // Create field node
    const fieldId = `FLD-${classId.replace('CLS-', '')}-${field.name}`;

    this._addNode(createGraphNode(NODE_TYPES.FIELD, fieldId, {
      name: field.name,
      type: field.type,
      visibility: field.visibility,
      isStatic: field.isStatic,
      markers: field.markers?.map(m => m.name) || [],
    }));

    // DEFINED_IN edge
    this._addEdge(createGraphEdge(
      EDGE_TYPES.DEFINED_IN,
      fieldId,
      classId,
      {}
    ));

    // Check for dependency injection
    const injectionMarkers = ['Autowired', 'Inject', 'Resource'];
    if (field.markers?.some(m => injectionMarkers.includes(m.name))) {
      const targetClassId = `CLS-${field.type}`;
      this._addEdge(createGraphEdge(
        EDGE_TYPES.INJECTS,
        classId,
        targetClassId,
        { via: field.name }
      ));
    }
  }

  _processFunction(fn, fileNodeId, ast) {
    const fnId = `FN-${fn.name}`;

    this._addNode(createGraphNode(NODE_TYPES.FUNCTION, fnId, {
      name: fn.name,
      isExported: fn.isExported,
      isAsync: fn.isAsync,
      returnType: fn.returnType,
      parameters: fn.parameters.map(p => `${p.type || ''} ${p.name}`).join(', '),
      markers: fn.markers?.map(m => m.name) || [],
      lineNumber: fn.lineNumber,
    }));

    // DEFINED_IN edge
    this._addEdge(createGraphEdge(
      EDGE_TYPES.DEFINED_IN,
      fnId,
      fileNodeId,
      {}
    ));
  }

  _processImports(ast, fileNodeId) {
    for (const imp of ast.imports) {
      // Only create edges for relative imports (within project)
      if (imp.isRelative) {
        const targetFileId = `SRC-${imp.source}`;

        this._addEdge(createGraphEdge(
          EDGE_TYPES.IMPORTS,
          fileNodeId,
          targetFileId,
          { specifiers: imp.specifiers }
        ));
      }
    }
  }

  _processFramework(framework, fileNodeId) {
    // Process routes (Spring/Next.js)
    if (framework.routes) {
      for (const route of framework.routes) {
        const routeId = `API-${route.method || 'GET'}-${route.path}`;

        this._addNode(createGraphNode(NODE_TYPES.API_ROUTE, routeId, {
          method: route.method || 'GET',
          path: route.path,
          handler: route.handler || route.component,
        }));

        // SERVES edge
        const controllerId = route.controller ? `CLS-${route.controller}` : fileNodeId;
        this._addEdge(createGraphEdge(
          EDGE_TYPES.SERVES,
          controllerId,
          routeId,
          { method: route.method }
        ));
      }
    }

    // Process injections
    if (framework.injections) {
      for (const injection of framework.injections) {
        const sourceId = `CLS-${injection.targetClass}`;
        const targetId = `CLS-${injection.fieldType}`;

        this._addEdge(createGraphEdge(
          EDGE_TYPES.INJECTS,
          sourceId,
          targetId,
          { via: injection.fieldName }
        ));
      }
    }

    // Process entities and repositories
    if (framework.repositories) {
      for (const repo of framework.repositories) {
        if (repo.entityType) {
          const repoId = `CLS-${repo.name}`;
          const entityId = `CLS-${repo.entityType}`;

          this._addEdge(createGraphEdge(
            EDGE_TYPES.PERSISTS,
            repoId,
            entityId,
            {}
          ));
        }
      }
    }
  }

  _createCrossFileEdges() {
    // Find matching class references across files
    // This is a simple implementation - more sophisticated
    // analysis would require analyzing actual code content

    // Find all class nodes
    const classNodes = new Map();
    for (const [id, node] of this.nodes) {
      if (id.startsWith('CLS-')) {
        classNodes.set(node.attributes.name, id);
      }
    }

    // Build class-to-layer map for dependency violation detection
    const classLayerMap = new Map();
    for (const edge of this.edges) {
      if (edge.type === EDGE_TYPES.BELONGS_TO_LAYER && edge.source.startsWith('CLS-')) {
        classLayerMap.set(edge.source, edge.target.replace('LAYER-', ''));
      }
    }

    // Check field types and create USES edges
    for (const [id, node] of this.nodes) {
      if (node.type === NODE_TYPES.FIELD && node.attributes.type) {
        const targetClassName = node.attributes.type.replace(/<.*>/, '');  // Remove generics
        const targetClassId = classNodes.get(targetClassName);

        if (targetClassId) {
          // Get the owning class
          const ownerEdge = this.edges.find(e =>
            e.type === EDGE_TYPES.DEFINED_IN &&
            e.source === id &&
            e.target.startsWith('CLS-')
          );

          if (ownerEdge) {
            this._addEdge(createGraphEdge(
              EDGE_TYPES.USES,
              ownerEdge.target,
              targetClassId,
              { via: node.attributes.name }
            ));

            // Check for architecture violation (cross-layer dependency)
            this._checkLayerViolation(ownerEdge.target, targetClassId, classLayerMap, node.attributes.name);
          }
        }
      }
    }
  }

  /**
   * Check for layer violation and create VIOLATES_RULE edge if needed
   * @private
   */
  _checkLayerViolation(sourceClassId, targetClassId, classLayerMap, fieldName) {
    const sourceLayer = classLayerMap.get(sourceClassId);
    const targetLayer = classLayerMap.get(targetClassId);

    if (!sourceLayer || !targetLayer || sourceLayer === targetLayer) {
      return; // Same layer or layer unknown
    }

    // Layer hierarchy (inner to outer): domain < application < infrastructure < presentation
    const layerOrder = {
      'domain': 0,
      'application': 1,
      'infrastructure': 2,
      'presentation': 3,
      'adapters': 2,  // Hexagonal: adapters = infrastructure
      'ports': 1,     // Hexagonal: ports = application
      'data': 2,      // Data layer = infrastructure
      'web': 3,       // Web = presentation
      'api': 3,       // API = presentation
    };

    const sourceOrder = layerOrder[sourceLayer] ?? -1;
    const targetOrder = layerOrder[targetLayer] ?? -1;

    if (sourceOrder === -1 || targetOrder === -1) {
      return; // Unknown layer, skip
    }

    // Violation: inner layer depends on outer layer
    // Clean Architecture: dependencies should point inward (higher order → lower order)
    if (sourceOrder < targetOrder) {
      this._addEdge(createGraphEdge(
        EDGE_TYPES.VIOLATES_RULE,
        sourceClassId,
        targetClassId,
        {
          rule: 'inward-dependency',
          sourceLayer,
          targetLayer,
          via: fieldName,
          message: `${sourceLayer} should not depend on ${targetLayer}`,
          severity: sourceLayer === 'domain' ? 'error' : 'warning'
        }
      ));
    }
  }

  _addNode(node) {
    if (this.nodes.has(node.id)) {
      this._stats.duplicatesSkipped++;
      return;
    }

    this.nodes.set(node.id, node);
    this._stats.nodesCreated++;
  }

  _addEdge(edge) {
    // Check for duplicate edges
    const exists = this.edges.some(e =>
      e.type === edge.type &&
      e.source === edge.source &&
      e.target === edge.target
    );

    if (exists) {
      this._stats.duplicatesSkipped++;
      return;
    }

    this.edges.push(edge);
    this._stats.edgesCreated++;
  }

  _toGraphologyFormat(graph) {
    return {
      nodes: graph.nodes.map(n => ({
        key: n.id,
        attributes: { ...n.attributes, type: n.type },
      })),
      edges: graph.edges.map((e, i) => ({
        key: `edge-${i}`,
        source: e.source,
        target: e.target,
        attributes: { ...e.attributes, type: e.type },
      })),
    };
  }

  _toCytoscapeFormat(graph) {
    return {
      elements: {
        nodes: graph.nodes.map(n => ({
          data: { id: n.id, ...n.attributes, nodeType: n.type },
        })),
        edges: graph.edges.map((e, i) => ({
          data: {
            id: `edge-${i}`,
            source: e.source,
            target: e.target,
            ...e.attributes,
            edgeType: e.type,
          },
        })),
      },
    };
  }
}

module.exports = {
  GraphBuilderV2,
};
