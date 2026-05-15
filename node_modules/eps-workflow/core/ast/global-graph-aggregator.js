"use strict";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Module: global-graph-aggregator.js
// Pattern: Singleton, lazy load, in-memory Graphology
// Data: 88 per-feature graphs -> 1 unified graph
// SRS: FR-RAG-GGA-001/002, FR-RAG-ARC-001/002/003/004
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const path = require("path");
const fs = require("fs");
const Graph = require("graphology");
const HippoRAGService = require('../rag/hipporag-service');

const _instances = new Map();

// Known prefixes for normalization (Evidence S14.3)
const KNOWN_PREFIXES = [
  "COMP-",
  "ENT-",
  "API-",
  "FR-",
  "NFR-",
  "BR-",
  "US-",
  "UC-",
  "SCR-",
  "UT-",
  "IT-",
  "E2E-",
  "SRC-",
  "CLS-",
  "FN-",
  "DOM-",
  "WF-",
  "UJ-",
  "EVT-",
  "SC-",
  "TC-",
  "AS-",
  // Architecture nodes (Phase 2: RAG-SCAN-IMPROVE)
  "ARCH-",    // Architecture patterns
  "LAYER-",   // Architecture layers
  "STEREO-",  // Stereotypes
  "DB-",      // Database technologies
];

class GlobalGraphAggregator {
  // ─── Constructor (sync only) ───
  constructor(branch = "master", project = null) {
    this._graph = new Graph({ type: "directed", multi: true });
    this._crossEdgeIndex = new Map();
    this._nodeTypeIndex = new Map();
    this._loaded = false;
    this._loadedFeatures = new Set();
    this._invalidating = new Set();
    this._branch = branch;
    this._project = project;
    this._graphDir = path.join(
      __dirname,
      "..",
      "..",
      "knowledge-graph",
      branch,
    );
  }

  // ─── Singleton Factory (keyed by branch:project) ───
  static getInstance(branch = "master", project = null) {
    const key = `${branch}:${project || ""}`;
    if (!_instances.has(key)) {
      _instances.set(key, new GlobalGraphAggregator(branch, project));
    }
    return _instances.get(key);
  }

  static clearInstance(branch = null, project = null) {
    if (branch) {
      const key = `${branch}:${project || ""}`;
      _instances.delete(key);
    } else {
      _instances.clear();
    }
  }

  // ─── Async Init: Load All Graphs (NFR-PERF-004: <5s) ───
  async init() {
    if (this._loaded) return;

    const startTime = Date.now();

    // Load from HippoRAG server, fallback to filesystem
    try {
      await this._initFromHippoRAG();
    } catch (err) {
      console.warn(
        "[RAG-MCP] HippoRAG init failed, falling back to filesystem:",
        err.message,
      );
      await this._initFromFilesystem();
    }

    // Build CrossEdgeIndex (operates on in-memory graph)
    this._buildCrossEdgeIndex();

    this._loaded = true;
    const elapsed = Date.now() - startTime;
    console.error(
      "[RAG-MCP] Loaded " +
        this._loadedFeatures.size +
        " graphs (" +
        this._graph.order +
        " nodes, " +
        this._graph.size +
        " edges) in " +
        elapsed +
        "ms",
    );
  }

  // ─── Init from HippoRAG server ───
  async _initFromHippoRAG() {
    const layers = ["eps", "arch", "design", "code"];

    for (const layer of layers) {
      try {
        const hipporag = HippoRAGService.getInstance("_global", this._branch);
        const context = await hipporag.getGraphContext({ name: layer });

        if (context && context.nodes) {
          for (const node of context.nodes) {
            const fullId = layer + "::" + node.id;
            try {
              this._graph.addNode(fullId, {
                ...node.attributes,
                _feature: layer,
                _originalId: node.id,
              });
            } catch {
              /* node already exists */
            }
          }
        }

        if (context && context.edges) {
          for (const edge of context.edges) {
            const sourceId = layer + "::" + edge.source;
            const targetId = layer + "::" + edge.target;
            try {
              this._graph.addEdge(sourceId, targetId, {
                ...edge.attributes,
                _feature: layer,
              });
            } catch {
              /* source/target not found */
            }
          }
        }

        this._loadedFeatures.add(layer);
      } catch (err) {
        console.warn(`[RAG-MCP] Failed to load layer ${layer}: ${err.message}`);
      }
    }
  }

  // ─── Init from Filesystem (original logic) ───
  async _initFromFilesystem() {
    const graphFiles = [];
    try {
      const features = fs.readdirSync(this._graphDir);
      for (const feature of features) {
        const graphPath = path.join(this._graphDir, feature, "graph.json");
        if (fs.existsSync(graphPath)) {
          graphFiles.push({ feature, path: graphPath });
        }
      }
    } catch (error) {
      console.error("[RAG-MCP] Graph directory not found:", this._graphDir);
      return;
    }

    const fileContents = await Promise.all(
      graphFiles.map((f) =>
        fs.promises
          .readFile(f.path, "utf8")
          .then((content) => {
            const parsed = JSON.parse(content);
            return { feature: f.feature, data: parsed.graph || parsed };
          })
          .catch((err) => {
            console.error(
              "[RAG-MCP] Failed to load graph:",
              f.feature,
              err.message,
            );
            return null;
          }),
      ),
    );

    for (const item of fileContents) {
      if (!item) continue;

      const { feature, data } = item;

      if (data.nodes) {
        for (const node of data.nodes) {
          const fullId = feature + "::" + node.key;
          try {
            this._graph.addNode(fullId, {
              ...node.attributes,
              _feature: feature,
              _originalId: node.key,
            });
          } catch {
            /* node already exists */
          }
        }
      }

      if (data.edges) {
        for (const edge of data.edges) {
          const sourceId = feature + "::" + edge.source;
          const targetId = feature + "::" + edge.target;
          try {
            this._graph.addEdge(sourceId, targetId, {
              ...edge.attributes,
              _feature: feature,
            });
          } catch {
            /* source/target not found */
          }
        }
      }

      this._loadedFeatures.add(feature);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Private Utilities
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ─── Node Name Normalization (Evidence S14.3) ───
  _normalize(nodeId) {
    let name = nodeId;

    for (const prefix of KNOWN_PREFIXES) {
      if (name.startsWith(prefix)) {
        name = name.substring(prefix.length);
        break;
      }
    }

    name = name.toLowerCase();

    if (name.length > 4 && name.endsWith("s")) {
      if (
        !name.endsWith("ss") &&
        !name.endsWith("us") &&
        !name.endsWith("is")
      ) {
        name = name.substring(0, name.length - 1);
      }
    }

    return name;
  }

  // ─── Damerau-Levenshtein Distance (Evidence S14.2) ───
  _damerauLevenshtein(a, b) {
    const lenA = a.length;
    const lenB = b.length;

    if (lenA === 0) return lenB;
    if (lenB === 0) return lenA;

    const d = [];
    for (let i = 0; i <= lenA; i++) {
      d[i] = new Array(lenB + 1);
      d[i][0] = i;
    }
    for (let j = 0; j <= lenB; j++) {
      d[0][j] = j;
    }

    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;

        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + cost,
        );

        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
        }
      }
    }

    return d[lenA][lenB];
  }

  // ─── Build CrossEdgeIndex (Evidence S14.4) ───
  _buildCrossEdgeIndex() {
    this._crossEdgeIndex.clear();
    this._nodeTypeIndex.clear();

    // Step 1: Index all nodes by normalized name
    this._graph.forEachNode((fullId, attrs) => {
      const originalId = attrs._originalId;
      const feature = attrs._feature;
      const nodeType = attrs.type || "Unknown";
      const normalizedName = this._normalize(originalId);

      if (!this._crossEdgeIndex.has(normalizedName)) {
        this._crossEdgeIndex.set(normalizedName, []);
      }
      this._crossEdgeIndex.get(normalizedName).push({
        feature,
        fullId,
        nodeType,
      });

      if (!this._nodeTypeIndex.has(nodeType)) {
        this._nodeTypeIndex.set(nodeType, new Set());
      }
      this._nodeTypeIndex.get(nodeType).add(normalizedName);
    });

    // Step 2: Generate SHARED_BY edges
    let sharedCount = 0;
    for (const [normalizedName, entries] of this._crossEdgeIndex) {
      if (entries.length >= 2) {
        for (let i = 0; i < entries.length - 1; i++) {
          for (let j = i + 1; j < entries.length; j++) {
            try {
              this._graph.addEdge(entries[i].fullId, entries[j].fullId, {
                type: "SHARED_BY",
                normalizedName,
                _crossFeature: true,
              });
              sharedCount++;
            } catch {
              /* edge already exists */
            }
          }
        }
      }
    }

    // Step 3: Generate SAME_AS edges (edit distance <= 2, same nodeType)
    let sameAsCount = 0;
    for (const [nodeType, nameSet] of this._nodeTypeIndex) {
      const names = Array.from(nameSet);
      for (let i = 0; i < names.length - 1; i++) {
        for (let j = i + 1; j < names.length; j++) {
          if (names[i] !== names[j]) {
            const dist = this._damerauLevenshtein(names[i], names[j]);
            if (dist > 0 && dist <= 2) {
              const entriesA = this._crossEdgeIndex.get(names[i]);
              const entriesB = this._crossEdgeIndex.get(names[j]);
              for (const a of entriesA) {
                for (const b of entriesB) {
                  try {
                    this._graph.addEdge(a.fullId, b.fullId, {
                      type: "SAME_AS",
                      editDistance: dist,
                      normalizedA: names[i],
                      normalizedB: names[j],
                      _crossFeature: true,
                    });
                    sameAsCount++;
                  } catch {
                    /* skip */
                  }
                }
              }
            }
          }
        }
      }
    }

    console.error(
      "[RAG-MCP] CrossEdgeIndex: " +
        this._crossEdgeIndex.size +
        " names, " +
        sharedCount +
        " SHARED_BY, " +
        sameAsCount +
        " SAME_AS edges",
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Public Query Methods
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ─── checkConsistency (FR-RAG-ARC-001) ───
  checkConsistency() {
    const violations = [];

    for (const [normalizedName, entries] of this._crossEdgeIndex) {
      const types = new Set(entries.map((e) => e.nodeType));
      if (types.size > 1) {
        violations.push({
          type: "naming_conflict",
          name: normalizedName,
          nodeTypes: Array.from(types),
          features: entries.map((e) => e.feature),
        });
      }
    }

    return {
      pass: violations.length === 0,
      violations,
      stats: {
        totalNames: this._crossEdgeIndex.size,
        totalViolations: violations.length,
      },
    };
  }

  // ─── findDuplicates (FR-RAG-ARC-002) ───
  findDuplicates(nodeType = null) {
    const duplicates = [];

    let namesToCheck;
    if (nodeType && this._nodeTypeIndex.has(nodeType)) {
      namesToCheck = this._nodeTypeIndex.get(nodeType);
    } else {
      namesToCheck = new Set(this._crossEdgeIndex.keys());
    }

    for (const normalizedName of namesToCheck) {
      const entries = this._crossEdgeIndex.get(normalizedName);
      if (!entries || entries.length < 2) continue;

      const filtered = nodeType
        ? entries.filter((e) => e.nodeType === nodeType)
        : entries;
      if (filtered.length < 2) continue;

      duplicates.push({
        normalizedName,
        count: filtered.length,
        features: filtered.map((e) => e.feature),
        entries: filtered,
      });
    }

    duplicates.sort((a, b) => b.count - a.count);

    return {
      duplicates,
      total: duplicates.length,
      nodeType: nodeType || "all",
    };
  }

  // ─── crossImpact (FR-RAG-ARC-003) — BFS with SHARED_BY no-depth-increment ───
  crossImpact(nodeId, maxDepth = 3, maxResults = 100) {
    const normalizedName = this._normalize(nodeId);
    let seeds = this._crossEdgeIndex.get(normalizedName) || [];

    if (seeds.length === 0) {
      if (this._graph.hasNode(nodeId)) {
        seeds = [{ feature: "", fullId: nodeId, nodeType: "" }];
      } else {
        return { nodeId, affected: [], message: "Node not found" };
      }
    }

    const visited = new Set();
    const results = [];

    for (const seed of seeds) {
      if (results.length >= maxResults) break;

      const queue = [
        {
          fullId: seed.fullId,
          depth: 0,
          viaEdge: "SEED",
          feature: seed.feature,
        },
      ];

      while (queue.length > 0 && results.length < maxResults) {
        const current = queue.shift();

        if (visited.has(current.fullId)) continue;
        visited.add(current.fullId);

        results.push({
          nodeId: current.fullId,
          feature: current.feature,
          depth: current.depth,
          viaEdge: current.viaEdge,
        });

        if (current.depth >= maxDepth) continue;

        try {
          this._graph.forEachOutEdge(
            current.fullId,
            (edge, attrs, source, target) => {
              if (visited.has(target)) return;

              const edgeType = attrs.type || "UNKNOWN";
              const nextDepth =
                edgeType === "SHARED_BY" ? current.depth : current.depth + 1;

              const targetAttrs = this._graph.getNodeAttributes(target);
              queue.push({
                fullId: target,
                depth: nextDepth,
                viaEdge: edgeType,
                feature: targetAttrs._feature || "",
              });
            },
          );
        } catch {
          /* node removed during traversal */
        }
      }
    }

    return {
      nodeId,
      normalizedName,
      seedCount: seeds.length,
      affected: results,
      total: results.length,
      maxDepth,
      maxResults,
    };
  }

  // ─── checkCompatibility (FR-RAG-ARC-004) ───
  checkCompatibility(feature, focus = null) {
    let sharedComponents = [];
    const conflicts = [];

    for (const [normalizedName, entries] of this._crossEdgeIndex) {
      const featureEntries = entries.filter((e) => e.feature === feature);
      const otherEntries = entries.filter((e) => e.feature !== feature);

      if (featureEntries.length > 0 && otherEntries.length > 0) {
        sharedComponents.push({
          name: normalizedName,
          thisFeature: featureEntries,
          otherFeatures: otherEntries.map((e) => e.feature),
          sharedWith: otherEntries.length,
        });
      }
    }

    sharedComponents.sort((a, b) => b.sharedWith - a.sharedWith);

    if (focus) {
      sharedComponents = sharedComponents.filter((c) =>
        c.name.includes(focus.toLowerCase()),
      );
    }

    return {
      feature,
      focus,
      sharedComponents,
      totalShared: sharedComponents.length,
      conflicts,
    };
  }

  // ─── Partial Invalidation (FR-RAG-GGA-002, Evidence S14.8) ───
  async invalidateFeature(feature) {
    if (this._invalidating.has(feature)) return;
    this._invalidating.add(feature);

    try {
      // Step 1: Remove all nodes for this feature
      const nodesToRemove = [];
      this._graph.forEachNode((fullId, attrs) => {
        if (attrs._feature === feature) {
          nodesToRemove.push(fullId);
        }
      });
      for (const nodeId of nodesToRemove) {
        this._graph.dropNode(nodeId);
      }

      // Step 2: Remove CrossEdgeIndex entries
      for (const [normalizedName, entries] of this._crossEdgeIndex) {
        const filtered = entries.filter((e) => e.feature !== feature);
        if (filtered.length === 0) {
          this._crossEdgeIndex.delete(normalizedName);
        } else {
          this._crossEdgeIndex.set(normalizedName, filtered);
        }
      }

      // Step 3: Reload graph from HippoRAG or disk
      try {
        await this._reloadFeatureFromHippoRAG(feature);
      } catch (err) {
        console.warn(`[RAG-MCP] HippoRAG reload failed, trying filesystem: ${err.message}`);
        await this._reloadFeatureFromFilesystem(feature);
      }

      // Step 5: Rebuild CrossEdgeIndex for this feature's nodes
      this._graph.forEachNode((fullId, attrs) => {
        if (attrs._feature !== feature) return;

        const normalizedName = this._normalize(attrs._originalId);
        const nodeType = attrs.type || "Unknown";

        if (!this._crossEdgeIndex.has(normalizedName)) {
          this._crossEdgeIndex.set(normalizedName, []);
        }
        this._crossEdgeIndex.get(normalizedName).push({
          feature,
          fullId,
          nodeType,
        });

        if (!this._nodeTypeIndex.has(nodeType)) {
          this._nodeTypeIndex.set(nodeType, new Set());
        }
        this._nodeTypeIndex.get(nodeType).add(normalizedName);
      });

      this._loadedFeatures.add(feature);
    } catch (error) {
      console.error(
        "[RAG-MCP] invalidateFeature failed:",
        feature,
        error.message,
      );
    } finally {
      this._invalidating.delete(feature);
    }
  }

  // ─── Reload single feature from HippoRAG ───
  async _reloadFeatureFromHippoRAG(feature) {
    const hipporag = HippoRAGService.getInstance(feature, this._branch);
    const context = await hipporag.getGraphContext({ name: feature });
    if (!context) return;

    if (context.nodes) {
      for (const node of context.nodes) {
        const fullId = feature + "::" + node.id;
        try {
          this._graph.addNode(fullId, {
            ...node.attributes,
            _feature: feature,
            _originalId: node.id,
          });
        } catch {
          /* skip */
        }
      }
    }

    if (context.edges) {
      for (const edge of context.edges) {
        try {
          this._graph.addEdge(
            feature + "::" + edge.source,
            feature + "::" + edge.target,
            { ...edge.attributes, _feature: feature },
          );
        } catch {
          /* skip */
        }
      }
    }
  }

  // ─── Reload single feature from filesystem ───
  async _reloadFeatureFromFilesystem(feature) {
    const graphPath = path.join(this._graphDir, feature, "graph.json");
    if (!fs.existsSync(graphPath)) return;

    const content = await fs.promises.readFile(graphPath, "utf8");
    const parsed = JSON.parse(content);
    const data = parsed.graph || parsed;

    if (data.nodes) {
      for (const node of data.nodes) {
        const fullId = feature + "::" + node.key;
        try {
          this._graph.addNode(fullId, {
            ...node.attributes,
            _feature: feature,
            _originalId: node.key,
          });
        } catch {
          /* skip */
        }
      }
    }

    if (data.edges) {
      for (const edge of data.edges) {
        try {
          this._graph.addEdge(
            feature + "::" + edge.source,
            feature + "::" + edge.target,
            { ...edge.attributes, _feature: feature },
          );
        } catch {
          /* skip */
        }
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Architecture Query Methods (Phase 2: RAG-SCAN-IMPROVE)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Get architecture summary across all indexed code
   * @returns {ArchitectureSummary}
   */
  getArchitectureSummary() {
    const patterns = new Map();  // ARCH-* nodes
    const layers = new Map();    // LAYER-* nodes
    const stereotypes = new Map(); // STEREO-* nodes
    const databases = new Map(); // DB-* nodes
    const violations = [];

    // Scan all nodes
    this._graph.forEachNode((nodeId, attrs) => {
      if (nodeId.includes('ARCH-')) {
        const name = attrs.name || nodeId.split('::').pop().replace('ARCH-', '');
        patterns.set(name, (patterns.get(name) || 0) + 1);
      } else if (nodeId.includes('LAYER-')) {
        const name = attrs.name || nodeId.split('::').pop().replace('LAYER-', '');
        layers.set(name, (layers.get(name) || 0) + 1);
      } else if (nodeId.includes('STEREO-')) {
        const name = attrs.name || nodeId.split('::').pop().replace('STEREO-', '');
        stereotypes.set(name, (stereotypes.get(name) || 0) + 1);
      } else if (nodeId.includes('DB-')) {
        const name = attrs.name || nodeId.split('::').pop().replace('DB-', '');
        databases.set(name, (databases.get(name) || 0) + 1);
      }
    });

    // Scan for violations
    this._graph.forEachEdge((edge, attrs, source, target) => {
      if (attrs.type === 'VIOLATES_RULE') {
        violations.push({
          source: source.split('::').pop(),
          target: target.split('::').pop(),
          rule: attrs.rule,
          sourceLayer: attrs.sourceLayer,
          targetLayer: attrs.targetLayer,
          severity: attrs.severity,
          feature: attrs._feature,
        });
      }
    });

    return {
      patterns: Object.fromEntries(patterns),
      layers: Object.fromEntries(layers),
      stereotypes: Object.fromEntries(stereotypes),
      databases: Object.fromEntries(databases),
      violations,
      violationCount: violations.length,
    };
  }

  /**
   * Query nodes by architecture layer
   * @param {string} layer - Layer name (domain, application, infrastructure, presentation)
   * @param {object} options - Query options
   * @returns {LayerQueryResult}
   */
  queryByLayer(layer, options = {}) {
    const { stereotype = null, limit = 100 } = options;
    const results = [];
    const layerId = `LAYER-${layer}`;

    // Find all nodes belonging to this layer
    this._graph.forEachEdge((edge, attrs, source, target) => {
      if (results.length >= limit) return;

      if (attrs.type === 'BELONGS_TO_LAYER' && target.includes(layerId)) {
        const nodeAttrs = this._graph.getNodeAttributes(source);

        // Filter by stereotype if specified
        if (stereotype) {
          const hasStereotype = this._graph.someEdge(source, (e, a, s, t) =>
            a.type === 'HAS_STEREOTYPE' && t.includes(`STEREO-${stereotype}`)
          );
          if (!hasStereotype) return;
        }

        results.push({
          id: source.split('::').pop(),
          fullId: source,
          feature: nodeAttrs._feature,
          type: nodeAttrs.type,
          name: nodeAttrs.name,
          layer,
        });
      }
    });

    return {
      layer,
      stereotype,
      results,
      count: results.length,
    };
  }

  /**
   * Query nodes by stereotype
   * @param {string} stereotype - Stereotype name (Controller, Service, Repository, Entity)
   * @param {object} options - Query options
   * @returns {StereotypeQueryResult}
   */
  queryByStereotype(stereotype, options = {}) {
    const { layer = null, limit = 100 } = options;
    const results = [];
    const stereoId = `STEREO-${stereotype}`;

    this._graph.forEachEdge((edge, attrs, source, target) => {
      if (results.length >= limit) return;

      if (attrs.type === 'HAS_STEREOTYPE' && target.includes(stereoId)) {
        const nodeAttrs = this._graph.getNodeAttributes(source);

        // Filter by layer if specified
        if (layer) {
          const hasLayer = this._graph.someEdge(source, (e, a, s, t) =>
            a.type === 'BELONGS_TO_LAYER' && t.includes(`LAYER-${layer}`)
          );
          if (!hasLayer) return;
        }

        results.push({
          id: source.split('::').pop(),
          fullId: source,
          feature: nodeAttrs._feature,
          type: nodeAttrs.type,
          name: nodeAttrs.name,
          stereotype,
        });
      }
    });

    return {
      stereotype,
      layer,
      results,
      count: results.length,
    };
  }

  /**
   * Find architecture violations
   * @param {object} options - Filter options
   * @returns {ViolationQueryResult}
   */
  findViolations(options = {}) {
    const { severity = null, layer = null, limit = 100 } = options;
    const violations = [];

    this._graph.forEachEdge((edge, attrs, source, target) => {
      if (violations.length >= limit) return;

      if (attrs.type === 'VIOLATES_RULE') {
        // Filter by severity
        if (severity && attrs.severity !== severity) return;

        // Filter by layer
        if (layer && attrs.sourceLayer !== layer && attrs.targetLayer !== layer) return;

        violations.push({
          source: source.split('::').pop(),
          target: target.split('::').pop(),
          sourceLayer: attrs.sourceLayer,
          targetLayer: attrs.targetLayer,
          rule: attrs.rule,
          severity: attrs.severity,
          message: attrs.message,
          via: attrs.via,
          feature: attrs._feature,
        });
      }
    });

    return {
      violations,
      count: violations.length,
      filters: { severity, layer },
    };
  }

  // ─── Stats ───
  getStats() {
    // Get architecture stats
    const archSummary = this.getArchitectureSummary();

    return {
      loaded: this._loaded,
      branch: this._branch,
      project: this._project,
      features: this._loadedFeatures.size,
      nodes: this._graph.order,
      edges: this._graph.size,
      crossEdgeNames: this._crossEdgeIndex.size,
      nodeTypes: Object.fromEntries(
        Array.from(this._nodeTypeIndex.entries()).map(([k, v]) => [k, v.size]),
      ),
      // Architecture stats
      architecture: {
        patterns: Object.keys(archSummary.patterns).length,
        layers: Object.keys(archSummary.layers).length,
        stereotypes: Object.keys(archSummary.stereotypes).length,
        databases: Object.keys(archSummary.databases).length,
        violations: archSummary.violationCount,
      },
    };
  }
}

module.exports = GlobalGraphAggregator;
