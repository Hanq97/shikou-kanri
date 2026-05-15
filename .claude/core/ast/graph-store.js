/**
 * Graph Store - Graphology wrapper
 * Manages the in-memory graph instance with CRUD operations.
 * Handles serialization/deserialization to/from JSON.
 */
const Graph = require('graphology');

class GraphStore {
  constructor() {
    this.graph = new Graph({ type: 'directed', multi: true });
  }

  // --- Node operations ---

  /**
   * Add or merge node. If node exists, merge attributes.
   * @param {string} id - Node key (e.g., 'FR-LND-INVS-001')
   * @param {object} attributes - Node properties
   */
  addNode(id, attributes) {
    if (this.graph.hasNode(id)) {
      const existing = this.graph.getNodeAttributes(id);
      this.graph.replaceNodeAttributes(id, { ...existing, ...attributes });
    } else {
      this.graph.addNode(id, attributes);
    }
  }

  /**
   * @param {string} id
   * @returns {object|null} Node with key and attributes, or null if not found
   */
  getNode(id) {
    if (!this.graph.hasNode(id)) return null;
    return { key: id, attributes: this.graph.getNodeAttributes(id) };
  }

  /**
   * @param {function} predicate - (key, attributes) => boolean
   * @returns {object[]} Array of {key, attributes}
   */
  filterNodes(predicate) {
    const results = [];
    this.graph.forEachNode((key, attributes) => {
      if (predicate(key, attributes)) {
        results.push({ key, attributes });
      }
    });
    return results;
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  hasNode(id) {
    return this.graph.hasNode(id);
  }

  /**
   * @returns {number}
   */
  nodeCount() {
    return this.graph.order;
  }

  // --- Edge operations ---

  /**
   * Add edge. Skip if duplicate (same source, target, type).
   * Auto-creates placeholder nodes for missing source/target.
   * @param {string} source - Source node ID
   * @param {string} target - Target node ID
   * @param {object} attributes - Edge properties (must include 'type')
   */
  addEdge(source, target, attributes) {
    // Ensure both nodes exist
    if (!this.graph.hasNode(source)) {
      this.addNode(source, { type: 'Unknown', placeholder: true });
    }
    if (!this.graph.hasNode(target)) {
      this.addNode(target, { type: 'Unknown', placeholder: true });
    }
    // Check duplicate
    const existingEdge = this.findEdge(source, target, attributes.type);
    if (existingEdge) return;
    this.graph.addEdge(source, target, attributes);
  }

  /**
   * Find edge by source, target, and type
   * @param {string} source
   * @param {string} target
   * @param {string} edgeType
   * @returns {string|null} Edge key or null
   */
  findEdge(source, target, edgeType) {
    if (!this.graph.hasNode(source) || !this.graph.hasNode(target)) return null;
    const edges = this.graph.edges(source, target);
    return edges.find(e => this.graph.getEdgeAttribute(e, 'type') === edgeType) || null;
  }

  /**
   * Get neighbors connected via specific edge type
   * @param {string} nodeId
   * @param {object} options - { edgeType, direction: 'outbound'|'inbound'|'both' }
   * @returns {object[]} Array of {key, attributes, edgeAttributes}
   */
  neighbors(nodeId, options = {}) {
    if (!this.graph.hasNode(nodeId)) return [];
    const { edgeType, direction = 'both' } = options;
    const results = [];

    const iterFn = direction === 'outbound' ? 'forEachOutEdge'
                 : direction === 'inbound' ? 'forEachInEdge'
                 : 'forEachEdge';

    this.graph[iterFn](nodeId, (edge, edgeAttrs, src, tgt) => {
      if (edgeType && edgeAttrs.type !== edgeType) return;
      const neighborId = src === nodeId ? tgt : src;
      results.push({
        key: neighborId,
        attributes: this.graph.getNodeAttributes(neighborId),
        edgeAttributes: edgeAttrs,
      });
    });
    return results;
  }

  /**
   * @returns {number}
   */
  edgeCount() {
    return this.graph.size;
  }

  // --- Serialization ---

  /**
   * Export graph to JSON-serializable object
   * @returns {object} { nodes: [...], edges: [...] }
   */
  serialize() {
    const nodes = [];
    this.graph.forEachNode((key, attributes) => {
      nodes.push({ key, attributes });
    });
    const edges = [];
    this.graph.forEachEdge((edge, attributes, source, target) => {
      edges.push({ source, target, attributes });
    });
    return { nodes, edges };
  }

  /**
   * Import graph from JSON object
   * @param {object} data - { nodes: [...], edges: [...] }
   */
  deserialize(data) {
    this.graph.clear();
    if (data.nodes) {
      data.nodes.forEach(n => this.graph.addNode(n.key, n.attributes));
    }
    if (data.edges) {
      data.edges.forEach(e => {
        if (this.graph.hasNode(e.source) && this.graph.hasNode(e.target)) {
          this.graph.addEdge(e.source, e.target, e.attributes);
        }
      });
    }
  }

  /**
   * Reset graph to empty state
   */
  clear() {
    this.graph.clear();
  }

  // --- Statistics ---

  /**
   * @returns {{ nodes: number, edges: number, nodeTypes: object, edgeTypes: object }}
   */
  getStats() {
    const nodeTypes = {};
    const edgeTypes = {};
    this.graph.forEachNode((k, a) => {
      nodeTypes[a.type] = (nodeTypes[a.type] || 0) + 1;
    });
    this.graph.forEachEdge((e, a) => {
      edgeTypes[a.type] = (edgeTypes[a.type] || 0) + 1;
    });
    return { nodes: this.graph.order, edges: this.graph.size, nodeTypes, edgeTypes };
  }
}

module.exports = GraphStore;
