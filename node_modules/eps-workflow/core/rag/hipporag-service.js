"use strict";

/**
 * HippoRAG Service - Unified RAG 2.0 Facade
 *
 * Drop-in replacement for RAGService + GraphService.
 * All operations go through HippoRAG2 Server HTTP API.
 *
 * Singleton per feature:branch. Non-blocking (errors → warnings).
 *
 * @module hipporag-service
 */

const { getClient, HippoRAGError, getProjectId } = require("./hipporag-client");

const instances = new Map();

/**
 * Layer mapping from EPS to HippoRAG2.
 */
const LAYER_MAP = {
  "eps-knowledge": "eps",
  "source-code": "code",
  architecture: "arch",
  "feature-docs": "design",
  _global: "eps",
};

/**
 * Layer priority mapping for command contexts.
 */
const LAYER_PRIORITY = {
  "design-srs": {
    primary: ["docs", "eps", "arch"],
    secondary: ["code"],
  },
  "design-basic": {
    primary: ["arch", "docs", "eps"],
    secondary: ["code"],
  },
  "design-detail": {
    primary: ["code", "arch", "docs"],
    secondary: ["eps"],
  },
  "design-test": {
    primary: ["code", "arch", "docs"],
    secondary: ["eps"],
  },
  plan: {
    primary: ["code", "arch"],
    secondary: ["docs", "eps"],
  },
  execute: {
    primary: ["code"],
    secondary: ["arch"],
  },
  validate: {
    primary: ["code", "docs"],
    secondary: ["eps", "arch"],
  },
};

class HippoRAGService {
  /**
   * Get or create singleton instance.
   * @param {string} feature - Feature code (e.g., 'LND-RPMT') or '_global'
   * @param {string} branch - Git branch name
   * @returns {HippoRAGService}
   */
  static getInstance(feature, branch) {
    const key = `${feature}:${branch}`;
    if (!instances.has(key)) {
      const service = new HippoRAGService(feature, branch);
      instances.set(key, service);
    }
    return instances.get(key);
  }

  /**
   * Clear specific instance.
   * @param {string} feature
   * @param {string} branch
   */
  static clearInstance(feature, branch) {
    instances.delete(`${feature}:${branch}`);
  }

  /**
   * Clear all instances.
   */
  static clearAll() {
    instances.clear();
  }

  /**
   * @param {string} feature - Feature code
   * @param {string} branch - Git branch name
   */
  constructor(feature, branch) {
    this.feature = feature;
    this.branch = branch;
    this.project = getProjectId(); // Read from config
    this.client = getClient();

    // Map feature to layer
    this.defaultLayer = this._getDefaultLayer(feature);
  }

  /**
   * Get default layer for feature.
   * @private
   */
  _getDefaultLayer(feature) {
    if (feature === "_global" || feature === "eps-knowledge") {
      return "eps";
    }
    if (feature === "source-code") {
      return "code";
    }
    if (feature === "architecture") {
      return "arch";
    }
    // Feature-specific = design layer
    return "design";
  }

  /**
   * Map EPS layer name to HippoRAG2 layer.
   * @private
   */
  _mapLayer(epsLayer) {
    return LAYER_MAP[epsLayer] || epsLayer;
  }

  // ─────────────────────────────────────────────────────────────────
  // Graph Entity Operations (DD-01: DDMetadata Population)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Build regex pattern from moduleId for graph entity matching.
   * Transforms "cmn015000" → "cmn.*?015" to match all EPS naming conventions:
   *   CmnM015Entity, /api/cmn015/list, cmn_m_015_master, etc.
   * @param {string} moduleId - Module identifier (e.g., "cmn015000")
   * @returns {string} Regex pattern
   * @private
   */
  _buildModulePattern(moduleId) {
    const system = moduleId.substring(0, 3);
    const moduleNum = moduleId.substring(3, 6);
    return `${system}.*?${moduleNum}`;
  }

  /**
   * Classify graph nodes into DDMetadata categories by content prefix.
   * @param {object[]} nodes - Array of GraphNode from server
   * @returns {object} Classified entities
   * @private
   */
  _classifyEntities(nodes) {
    const result = {
      entities: [],
      apiSpecs: [],
      workflows: [],
      errorCodes: [],
      businessRules: [],
      raw: [],
    };

    const SKIP_PREFIXES = ['PKG-', 'CFG-', 'SEC-', 'db:pk:', 'db:fk:'];

    for (const node of nodes) {
      const content = node.content || '';
      const entry = {
        id: node.id,
        name: content,
        content: content,
        edges: (node.edges_in || 0) + (node.edges_out || 0),
      };

      // Skip non-useful prefixes
      if (SKIP_PREFIXES.some(p => content.startsWith(p))) continue;

      // PRIMARY: classify by content prefix
      if (content.startsWith('CLS-')) {
        result.entities.push({ ...entry, type: 'class' });
      } else if (content.startsWith('API-')) {
        result.apiSpecs.push({ ...entry, type: 'api', endpoint: content.substring(4) });
      } else if (content.startsWith('TBL-') || content.startsWith('ENT-')) {
        result.entities.push({ ...entry, type: 'table' });
      } else if (content.startsWith('DTO-')) {
        result.entities.push({ ...entry, type: 'dto' });
      } else if (content.startsWith('SVC-')) {
        result.businessRules.push({ ...entry, type: 'service' });
      } else if (content.startsWith('REPO-') || content.startsWith('CTL-')) {
        result.entities.push({ ...entry, type: content.startsWith('REPO-') ? 'repository' : 'controller' });
      } else if (content.startsWith('FR-') || content.startsWith('NFR-') || content.startsWith('BR-')) {
        result.businessRules.push({ ...entry, type: 'rule' });
      } else if (content.startsWith('WF-') || content.startsWith('DOC-') || content.startsWith('SCR-') || content.startsWith('EVT-')) {
        result.workflows.push({ ...entry, type: 'workflow' });
      } else if (content.startsWith('COMP-')) {
        result.entities.push({ ...entry, type: 'component' });
      } else {
        // SECONDARY: classify by node.type for non-prefixed
        const nodeType = (node.type || '').toLowerCase();
        if (nodeType === 'class') {
          result.entities.push({ ...entry, type: 'class' });
        } else if (nodeType === 'service') {
          result.businessRules.push({ ...entry, type: 'service' });
        } else {
          result.raw.push({ ...entry, type: nodeType || 'unknown' });
        }
      }
    }

    return result;
  }

  /**
   * Query graph for module entities and classify into DDMetadata structure.
   * @param {string} moduleId - Module identifier (e.g., "cmn015000")
   * @returns {Promise<object>} Classified entities with graphNodeCount and source
   */
  async queryDDEntities(moduleId) {
    try {
      const modulePattern = this._buildModulePattern(moduleId);
      const response = await this.client.graphQueryEntities(this.project, modulePattern, { limit: 200 });
      const classified = this._classifyEntities(response.nodes || []);
      return {
        ...classified,
        graphNodeCount: response.total || 0,
        source: 'graph',
      };
    } catch (err) {
      console.warn(`[HippoRAGService] queryDDEntities error: ${err.message}`);
      return {
        entities: [],
        apiSpecs: [],
        workflows: [],
        errorCodes: [],
        businessRules: [],
        raw: [],
        graphNodeCount: 0,
        source: 'error',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // AST Operations (DD-02: Hybrid Server AST)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Parse source files via server AST endpoint.
   * @param {object[]} files - Array of {path, content} objects
   * @returns {Promise<object[]|null>} Array of UnifiedAST, or null if server unavailable
   */
  async parseAST(files) {
    try {
      const response = await this.client.astParseBatch(this.project, files);
      return (response.results || []).filter(r => !r.error);
    } catch (err) {
      console.warn(`[HippoRAGService] parseAST error: ${err.message}`);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Vector Operations (RAGService compatibility)
  // ─────────────────────────────────────────────────────────────────

  /**
   * RAG 2.0 Query Pipeline.
   * Vector Search + Graph Context.
   *
   * @param {string} query - Natural language query
   * @param {object} agentDef - Agent definition
   * @param {object} [options] - Optional settings
   * @returns {Promise<{chunks: Array, graph: object, mode: string}>}
   */
  async getContext(query, agentDef, options = {}) {
    const {
      topK = 5,
      graphDepth = 2,
      maxLines = 200,
      layer,
      layers,
      docType,
    } = options;

    try {
      let vectorResults;

      // Determine layers to query
      const targetLayers = layers
        ? layers.map((l) => this._mapLayer(l))
        : layer
          ? [this._mapLayer(layer)]
          : [this.defaultLayer];

      // Query vector
      if (targetLayers.length === 1) {
        const response = await this.client.query(
          this.project,
          targetLayers[0],
          query,
          topK,
          true,
        );
        vectorResults = response.results || [];
      } else {
        const response = await this.client.multiQuery(
          this.project,
          targetLayers,
          query,
          Math.ceil(topK / targetLayers.length),
          true,
        );
        vectorResults = response.results || [];
      }

      // Transform to chunks format
      const chunks = vectorResults.map((r) => ({
        id: r.chunk_id,
        content: r.content,
        metadata: r.metadata || {},
        score: r.score,
      }));

      // Query graph context
      let graphContext = { nodes: [], edges: [] };
      try {
        const agentName = agentDef?.name || "default";
        const graphResponse = await this.client.graphQuery(
          this.project,
          this.defaultLayer,
          agentName,
        );
        graphContext = {
          nodes: graphResponse.nodes || [],
          edges: graphResponse.edges || [],
        };
      } catch (graphErr) {
        // Non-blocking graph query
        console.warn(
          `[HippoRAGService] Graph query warning: ${graphErr.message}`,
        );
      }

      // Trim if exceeding maxLines
      const focusedChunks = this._trimChunks(chunks, topK, maxLines);

      return {
        chunks: focusedChunks,
        graph: graphContext,
        mode: chunks.length > 0 ? "rag2" : "graph-only",
      };
    } catch (err) {
      console.warn(
        `[HippoRAGService] getContext fallback to empty: ${err.message}`,
      );
      return {
        chunks: [],
        graph: { nodes: [], edges: [] },
        mode: "error",
      };
    }
  }

  /**
   * Query specialists by tech-stack keywords.
   * @param {string[]} techStack - Technology keywords
   * @param {number} [topK=3] - Results per keyword
   * @returns {Promise<Array>} Specialist chunks
   */
  async querySpecialists(techStack, topK = 3) {
    try {
      const results = [];

      for (const tech of techStack) {
        const response = await this.client.query(
          this.project,
          "eps",
          `${tech} patterns best practices constraints`,
          topK,
          true,
        );

        for (const r of response.results || []) {
          results.push({
            text: r.content,
            metadata: { ...r.metadata, tech },
            score: r.score,
          });
        }
      }

      // Deduplicate by content hash
      const seen = new Set();
      return results.filter((r) => {
        const hash = r.content.substring(0, 100);
        if (seen.has(hash)) return false;
        seen.add(hash);
        return true;
      });
    } catch (err) {
      console.warn(
        `[HippoRAGService] querySpecialists warning: ${err.message}`,
      );
      return [];
    }
  }

  /**
   * Persist (no-op - server auto-persists).
   */
  async persist() {
    // Server handles persistence automatically
  }

  /**
   * Get statistics.
   * @returns {Promise<object>}
   */
  async getStats() {
    try {
      const health = await this.client.health();
      const graphStats = await this.client.graphStats(
        this.project,
        this.defaultLayer,
      );

      return {
        items: graphStats.total_nodes || 0,
        dirty: false,
        mode: "rag2",
        server: {
          status: health.status,
          version: health.version,
          uptime: health.uptime_seconds,
        },
      };
    } catch (err) {
      return {
        items: 0,
        dirty: false,
        mode: "error",
        error: err.message,
      };
    }
  }

  /**
   * Check if dirty (always false - server handles state).
   * @returns {boolean}
   */
  isDirty() {
    return false;
  }

  // ─────────────────────────────────────────────────────────────────
  // Graph Operations (GraphService compatibility)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get focused context for an agent.
   * @param {object} agentDef - Agent definition
   * @returns {Promise<{nodes: Array, edges: Array, summary: string}>}
   */
  async getGraphContext(agentDef) {
    try {
      const agentName = agentDef?.name || "default";
      const response = await this.client.graphQuery(
        this.project,
        this.defaultLayer,
        agentName,
      );

      return {
        nodes: response.nodes || [],
        edges: response.edges || [],
        summary: response.summary || "No context",
      };
    } catch (err) {
      console.warn(`[HippoRAGService] getGraphContext warning: ${err.message}`);
      return { nodes: [], edges: [], summary: "Graph unavailable" };
    }
  }

  /**
   * Impact analysis: what's affected if nodeId changes.
   * @param {string} nodeId - Starting node
   * @param {number} [maxDepth=3] - Max traversal depth
   * @returns {Promise<Array>} Affected nodes
   */
  async getImpact(nodeId, maxDepth = 3) {
    try {
      const response = await this.client.graphImpact(
        this.project,
        this.defaultLayer,
        nodeId,
        maxDepth,
      );
      return response.affected_nodes || [];
    } catch (err) {
      console.warn(`[HippoRAGService] getImpact warning: ${err.message}`);
      return [];
    }
  }

  /**
   * Check quality gate coverage.
   * @param {string} ruleId - 'Q5_FR_COVERAGE' | 'Q6_COMP_ORPHAN' | 'Q7_API_TESTED'
   * @returns {Promise<object>}
   */
  async checkCoverage(ruleId) {
    try {
      const response = await this.client.graphCoverage(
        this.project,
        this.defaultLayer,
        ruleId,
      );
      return response.result || { pass: true, score: 0 };
    } catch (err) {
      console.warn(`[HippoRAGService] checkCoverage warning: ${err.message}`);
      return { pass: true, score: 0, details: "Check unavailable" };
    }
  }

  /**
   * Find orphan nodes.
   * @param {string} [nodeType] - Optional type filter
   * @returns {Promise<string[]>}
   */
  async findOrphans(nodeType = null) {
    try {
      const response = await this.client.graphOrphans(
        this.project,
        this.defaultLayer,
        nodeType,
      );
      return response.orphan_ids || [];
    } catch (err) {
      console.warn(`[HippoRAGService] findOrphans warning: ${err.message}`);
      return [];
    }
  }

  /**
   * Check graph consistency.
   * @returns {Promise<{pass: boolean, violations: Array}>}
   */
  async checkConsistency() {
    try {
      // Use Q6 (orphan detection) as consistency proxy
      const coverage = await this.checkCoverage("Q6_COMP_ORPHAN");
      return {
        pass: coverage.passed !== false,
        violations: coverage.uncovered_ids
          ? coverage.uncovered_ids.map((id) => ({
              type: "ORPHAN",
              id,
            }))
          : [],
      };
    } catch (err) {
      return { pass: true, violations: [] };
    }
  }

  /**
   * Generate quality report.
   * @returns {Promise<string>}
   */
  async generateReport() {
    try {
      const [q5, q6, q7, stats] = await Promise.all([
        this.checkCoverage("Q5_FR_COVERAGE"),
        this.checkCoverage("Q6_COMP_ORPHAN"),
        this.checkCoverage("Q7_API_TESTED"),
        this.client.graphStats(this.project, this.defaultLayer),
      ]);

      const orphans = await this.findOrphans();

      return [
        "=== HippoRAG Quality Report ===",
        `Nodes: ${stats.total_nodes} | Edges: ${stats.total_edges}`,
        `Node Types: ${JSON.stringify(stats.node_types)}`,
        `Edge Types: ${JSON.stringify(stats.edge_types)}`,
        "",
        `Q5 FR Coverage: ${q5.passed ? "PASS" : "FAIL"} (${((q5.score || 0) * 100).toFixed(1)}%)`,
        `Q6 Component Orphans: ${q6.passed ? "PASS" : "FAIL"} (${((q6.score || 0) * 100).toFixed(1)}%)`,
        `Q7 API Tested: ${q7.passed ? "PASS" : "FAIL"} (${((q7.score || 0) * 100).toFixed(1)}%)`,
        "",
        `Orphan Nodes: ${orphans.length}`,
        "=== End Report ===",
      ].join("\n");
    } catch (err) {
      return `=== HippoRAG Quality Report ===\nError: ${err.message}\n=== End Report ===`;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Static Utilities
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get layer configuration for a command context.
   * @param {string} commandContext - EPS command
   * @returns {string[]|null}
   */
  static getLayerForCommand(commandContext) {
    const priority = LAYER_PRIORITY[commandContext];
    if (!priority) return null;

    const layers = [];
    const primary = Array.isArray(priority.primary)
      ? priority.primary
      : [priority.primary];
    const secondary = Array.isArray(priority.secondary)
      ? priority.secondary
      : [priority.secondary];
    layers.push(...primary, ...secondary);
    return layers;
  }

  // ─────────────────────────────────────────────────────────────────
  // Architecture-Aware Query Methods (Phase 2: RAG-SCAN-IMPROVE)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Query with architecture layer filter.
   * Returns only code from specified architectural layer.
   *
   * @param {string} query - Search query
   * @param {object} options - Query options
   * @param {string} [options.archLayer] - Architecture layer (domain, application, infrastructure, presentation)
   * @param {string} [options.stereotype] - Stereotype filter (Controller, Service, Repository, Entity)
   * @param {string} [options.pattern] - Architecture pattern (clean-architecture, hexagonal, etc.)
   * @param {number} [options.topK=10] - Max results
   * @returns {Promise<{chunks: Array, archMeta: object}>}
   */
  async queryWithArchitecture(query, options = {}) {
    const {
      archLayer = null,
      stereotype = null,
      pattern = null,
      topK = 10,
    } = options;

    try {
      // Build metadata filter
      const metadataFilter = {};
      if (archLayer) {
        metadataFilter.layer = archLayer;
      }
      if (stereotype) {
        metadataFilter.stereotype = stereotype;
      }
      if (pattern) {
        metadataFilter.architecturePattern = pattern;
      }

      // Query code layer with metadata filter
      const response = await this.client.query(
        this.project,
        "code",
        query,
        topK,
        true,
        metadataFilter,
      );

      const chunks = (response.results || []).map(r => ({
        id: r.chunk_id,
        text: r.content,
        metadata: r.metadata || {},
        score: r.score,
        archLayer: r.metadata?.layer,
        stereotype: r.metadata?.stereotype,
        pattern: r.metadata?.architecturePattern,
      }));

      return {
        chunks,
        archMeta: {
          filterApplied: { archLayer, stereotype, pattern },
          totalResults: chunks.length,
        },
      };
    } catch (err) {
      console.warn(`[HippoRAGService] queryWithArchitecture warning: ${err.message}`);
      // Fallback: query without filter
      return this._queryWithArchitectureFallback(query, options);
    }
  }

  /**
   * Fallback query without architecture filter.
   * @private
   */
  async _queryWithArchitectureFallback(query, options = {}) {
    const { archLayer, stereotype, topK = 10 } = options;

    try {
      const response = await this.client.query(
        this.project,
        "code",
        query,
        topK * 2, // Get more, then filter locally
        true,
      );

      let chunks = (response.results || []).map(r => ({
        id: r.chunk_id,
        text: r.content,
        metadata: r.metadata || {},
        score: r.score,
        archLayer: r.metadata?.layer,
        stereotype: r.metadata?.stereotype,
        pattern: r.metadata?.architecturePattern,
      }));

      // Local filtering
      if (archLayer) {
        chunks = chunks.filter(c => c.archLayer === archLayer);
      }
      if (stereotype) {
        chunks = chunks.filter(c => c.stereotype === stereotype);
      }

      return {
        chunks: chunks.slice(0, topK),
        archMeta: {
          filterApplied: { archLayer, stereotype },
          totalResults: chunks.length,
          _fallback: true,
        },
      };
    } catch (err) {
      return { chunks: [], archMeta: { error: err.message } };
    }
  }

  /**
   * Find code by stereotype (e.g., all Controllers, all Services).
   *
   * @param {string} stereotype - Stereotype name
   * @param {object} [options] - Query options
   * @returns {Promise<Array>}
   */
  async findByStereotype(stereotype, options = {}) {
    const { topK = 20 } = options;

    try {
      const result = await this.queryWithArchitecture(
        `${stereotype} class implementation`,
        { stereotype, topK }
      );
      return result.chunks;
    } catch (err) {
      console.warn(`[HippoRAGService] findByStereotype warning: ${err.message}`);
      return [];
    }
  }

  /**
   * Find code by architecture layer.
   *
   * @param {string} layer - Layer name (domain, application, infrastructure, presentation)
   * @param {object} [options] - Query options
   * @returns {Promise<Array>}
   */
  async findByLayer(layer, options = {}) {
    const { topK = 20, query = '' } = options;

    try {
      const searchQuery = query || `${layer} layer implementation`;
      const result = await this.queryWithArchitecture(
        searchQuery,
        { archLayer: layer, topK }
      );
      return result.chunks;
    } catch (err) {
      console.warn(`[HippoRAGService] findByLayer warning: ${err.message}`);
      return [];
    }
  }

  /**
   * Get architecture violations from indexed code.
   *
   * @returns {Promise<Array>}
   */
  async getArchitectureViolations() {
    try {
      // Query graph for VIOLATES_RULE edges
      const response = await this.client.graphQuery(
        this.project,
        "code",
        "architecture-violations",
      );

      // Filter edges for violations
      const violations = (response.edges || [])
        .filter(e => e.type === 'VIOLATES_RULE')
        .map(e => ({
          source: e.source,
          target: e.target,
          sourceLayer: e.attributes?.sourceLayer,
          targetLayer: e.attributes?.targetLayer,
          rule: e.attributes?.rule,
          severity: e.attributes?.severity,
          message: e.attributes?.message,
        }));

      return violations;
    } catch (err) {
      console.warn(`[HippoRAGService] getArchitectureViolations warning: ${err.message}`);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Similar Pattern Retrieval
  // ─────────────────────────────────────────────────────────────────

  /**
   * Retrieve similar code patterns for a given stereotype and module.
   *
   * @param {string} stereotype - Target stereotype: 'Service' | 'Repository' | 'Controller' | 'Entity'
   * @param {string} module - Module name: 'core-manager' | 'sfa-manager' | 'common'
   * @param {object} options - Query options
   * @param {number} [options.limit=3] - Max patterns to return
   * @param {number} [options.minConfidence=0.7] - Min confidence threshold
   * @param {boolean} [options.includeCode=true] - Include code snippets
   * @param {boolean} [options.sameLayerOnly=true] - Only return same layer results
   * @returns {Promise<SimilarPatternResult>}
   *
   * @example
   * const result = await ragService.retrieveSimilarPatterns('Service', 'core-manager');
   * // Returns:
   * // {
   * //   patterns: [
   * //     { className: 'CmnMUserService', filePath: '...', markers: ['Service', 'Transactional'], snippet: '...' },
   * //     { className: 'CmnMCategoryService', ... }
   * //   ],
   * //   source: 'rag',
   * //   query: 'Service implementation patterns in core-manager',
   * //   totalFound: 12,
   * //   filtered: 3
   * // }
   */
  async retrieveSimilarPatterns(stereotype, module, options = {}) {
    const {
      limit = 3,
      minConfidence = 0.7,
      includeCode = true,
      sameLayerOnly = true
    } = options;

    const startTime = Date.now();

    try {
      // 1. Build semantic query
      const query = this._buildPatternQuery(stereotype, module);

      // 2. Query RAG with architecture filters
      const result = await this.queryWithArchitecture(query, {
        stereotype,
        topK: limit * 3,  // Get more to filter
      });

      const results = result.chunks || [];

      // 3. Handle no results
      if (!results || results.length === 0) {
        console.log(`[HippoRAG] No patterns found for ${stereotype} in ${module}`);
        return {
          patterns: [],
          source: 'no-results',
          query,
          totalFound: 0,
          filtered: 0,
          latencyMs: Date.now() - startTime
        };
      }

      // 4. Filter and transform results
      const patterns = this._filterAndTransformPatterns(
        results,
        stereotype,
        module,
        { minConfidence, sameLayerOnly, includeCode, limit }
      );

      return {
        patterns,
        source: 'rag',
        query,
        totalFound: results.length,
        filtered: patterns.length,
        latencyMs: Date.now() - startTime
      };

    } catch (error) {
      console.warn(`[HippoRAG] retrieveSimilarPatterns error: ${error.message}`);
      return {
        patterns: [],
        source: 'error',
        error: error.message,
        query: `${stereotype} in ${module}`,
        latencyMs: Date.now() - startTime
      };
    }
  }

  /**
   * Build semantic query for pattern retrieval
   * @private
   */
  _buildPatternQuery(stereotype, module) {
    const queries = {
      'Service': `${stereotype} layer implementation patterns with @Service @Transactional annotations in ${module}`,
      'Repository': `${stereotype} interface extending ReactiveCrudRepository in ${module}`,
      'Controller': `REST ${stereotype} with @RestController @RequestMapping returning Mono ResponseEntity in ${module}`,
      'Entity': `JPA ${stereotype} with @Entity @Table extending AbstractAuditingEntity in ${module}`,
      'DTO': `Data Transfer Object record class in ${module}`,
      'Mapper': `MapStruct ${stereotype} interface with @Mapper annotation in ${module}`
    };

    return queries[stereotype] || `${stereotype} implementation patterns in ${module}`;
  }

  /**
   * Filter and transform RAG results to pattern objects
   * @private
   */
  _filterAndTransformPatterns(results, stereotype, module, options) {
    const { minConfidence, sameLayerOnly, includeCode, limit } = options;

    return results
      .filter(r => {
        // Filter by stereotype match
        const resultStereotype = r.metadata?.stereotype || r.stereotype;
        if (resultStereotype && resultStereotype !== stereotype) {
          return false;
        }

        // Filter by confidence
        const confidence = r.metadata?.archConfidence || r.score || 0;
        if (confidence < minConfidence) {
          return false;
        }

        // Filter by module (allow fallback from other modules if same layer)
        if (module && r.metadata?.module) {
          if (r.metadata.module !== module && sameLayerOnly) {
            return false;
          }
        }

        return true;
      })
      .slice(0, limit)
      .map(r => this._transformToPattern(r, includeCode));
  }

  /**
   * Transform RAG result to pattern object
   * @private
   */
  _transformToPattern(result, includeCode) {
    const content = result.content || '';

    return {
      filePath: result.metadata?.source_path || result.metadata?.filePath || 'unknown',
      className: this._extractClassName(content),
      stereotype: result.metadata?.stereotype || result.stereotype || 'unknown',
      layer: result.metadata?.layer || result.archLayer || 'unknown',
      module: result.metadata?.module || 'unknown',
      markers: this._extractMarkers(content),
      imports: this._extractImports(content),
      snippet: includeCode ? this._extractSnippet(content, 500) : null,
      confidence: result.metadata?.archConfidence || result.score || 0.5
    };
  }

  /**
   * Extract class name from Java/TypeScript code
   * @private
   */
  _extractClassName(content) {
    if (!content) return null;

    // Java: public class ClassName
    const javaMatch = content.match(/(?:public\s+)?(?:abstract\s+)?class\s+(\w+)/);
    if (javaMatch) return javaMatch[1];

    // Java: public interface InterfaceName
    const interfaceMatch = content.match(/(?:public\s+)?interface\s+(\w+)/);
    if (interfaceMatch) return interfaceMatch[1];

    // TypeScript: export class ClassName
    const tsMatch = content.match(/export\s+(?:default\s+)?class\s+(\w+)/);
    if (tsMatch) return tsMatch[1];

    return null;
  }

  /**
   * Extract annotations/decorators from code
   * @private
   */
  _extractMarkers(content) {
    if (!content) return [];

    const markers = new Set();

    // Java annotations: @Service, @Transactional, etc.
    const javaAnnotations = content.match(/@(\w+)(?:\([^)]*\))?/g) || [];
    javaAnnotations.forEach(a => {
      const name = a.match(/@(\w+)/)?.[1];
      if (name) markers.add(name);
    });

    return [...markers];
  }

  /**
   * Extract import statements from code
   * @private
   */
  _extractImports(content) {
    if (!content) return [];

    const imports = [];

    // Java imports
    const javaImports = content.match(/import\s+([\w.]+);/g) || [];
    javaImports.forEach(imp => {
      const match = imp.match(/import\s+([\w.]+);/);
      if (match) imports.push(match[1]);
    });

    // TypeScript imports (simplified)
    const tsImports = content.match(/import\s+.*from\s+['"]([^'"]+)['"]/g) || [];
    tsImports.forEach(imp => {
      const match = imp.match(/from\s+['"]([^'"]+)['"]/);
      if (match) imports.push(match[1]);
    });

    return imports;
  }

  /**
   * Extract code snippet with max length
   * @private
   */
  _extractSnippet(content, maxLength) {
    if (!content) return null;
    if (content.length <= maxLength) return content;

    // Try to cut at a reasonable boundary
    const truncated = content.substring(0, maxLength);
    const lastNewline = truncated.lastIndexOf('\n');

    if (lastNewline > maxLength * 0.7) {
      return truncated.substring(0, lastNewline) + '\n// ... truncated';
    }

    return truncated + '... truncated';
  }

  // ─────────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────────

  /**
   * Trim chunks to max lines.
   * @private
   */
  _trimChunks(chunks, topK, maxLines) {
    const focused = chunks.slice(0, topK);
    let lineCount = 0;
    const trimmed = [];

    for (const chunk of focused) {
      const chunkLines = chunk.content ? chunk.content.split("\n").length : 0;
      if (lineCount + chunkLines <= maxLines) {
        trimmed.push(chunk);
        lineCount += chunkLines;
      } else {
        break;
      }
    }

    return trimmed;
  }
}

// Export for compatibility with both RAGService and GraphService patterns
module.exports = HippoRAGService;
module.exports.HippoRAGService = HippoRAGService;
module.exports.LAYER_MAP = LAYER_MAP;
module.exports.LAYER_PRIORITY = LAYER_PRIORITY;
