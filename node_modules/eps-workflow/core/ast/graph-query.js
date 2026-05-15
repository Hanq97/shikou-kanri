/**
 * Graph Query Engine
 * Provides traversal, subgraph extraction, impact analysis, and coverage calculation.
 */
const { AGENT_CONTEXT_MAP } = require('./graph-schema');

class GraphQuery {

  /**
   * Get focused context for a specific agent
   * @param {GraphStore} store - Graph store instance
   * @param {object} agentDef - { name, checkpoint, sections }
   * @returns {object} Focused context: { nodes, edges, summary }
   */
  getContext(store, agentDef) {
    const mapping = AGENT_CONTEXT_MAP[agentDef.name];
    if (!mapping) {
      return { nodes: [], edges: [], summary: 'No graph context mapping for this agent' };
    }

    const { nodeTypes, edgeTypes } = mapping;

    // Get relevant nodes
    const nodes = store.filterNodes((key, attrs) => nodeTypes.includes(attrs.type));

    // Get edges between relevant nodes
    const nodeIds = new Set(nodes.map(n => n.key));
    const edges = [];
    const edgesSeen = new Set();

    for (const node of nodes) {
      const neighbors = store.neighbors(node.key);
      for (const neighbor of neighbors) {
        if (nodeIds.has(neighbor.key) && edgeTypes.includes(neighbor.edgeAttributes.type)) {
          const edgeKey = `${node.key}->${neighbor.key}:${neighbor.edgeAttributes.type}`;
          if (!edgesSeen.has(edgeKey)) {
            edgesSeen.add(edgeKey);
            edges.push({
              source: node.key,
              target: neighbor.key,
              attributes: neighbor.edgeAttributes,
            });
          }
        }
      }
    }

    return {
      nodes: nodes.map(n => ({ id: n.key, ...n.attributes })),
      edges,
      summary: `${nodes.length} nodes, ${edges.length} edges (types: ${nodeTypes.join(', ')})`,
    };
  }

  /**
   * Impact analysis: BFS traversal from a node, following specified edge types
   * @param {GraphStore} store
   * @param {string} startNodeId - Starting node
   * @param {number} maxDepth - Maximum traversal depth (default: 3)
   * @param {string[]|null} edgeTypes - Edge types to follow (default: all)
   * @returns {object[]} Affected nodes with depth info
   */
  getImpact(store, startNodeId, maxDepth = 3, edgeTypes = null) {
    if (!store.hasNode(startNodeId)) return [];

    const visited = new Set([startNodeId]);
    const result = [];
    let queue = [{ id: startNodeId, depth: 0 }];

    while (queue.length > 0) {
      const nextQueue = [];
      for (const { id, depth } of queue) {
        if (depth >= maxDepth) continue;

        const neighbors = store.neighbors(id, { direction: 'both' });
        for (const neighbor of neighbors) {
          if (visited.has(neighbor.key)) continue;
          if (edgeTypes && !edgeTypes.includes(neighbor.edgeAttributes.type)) continue;

          visited.add(neighbor.key);
          result.push({
            id: neighbor.key,
            type: neighbor.attributes.type,
            depth: depth + 1,
            viaEdge: neighbor.edgeAttributes.type,
          });
          nextQueue.push({ id: neighbor.key, depth: depth + 1 });
        }
      }
      queue = nextQueue;
    }

    return result;
  }

  /**
   * Extract subgraph containing only specified nodes and their interconnecting edges
   * @param {GraphStore} store
   * @param {string[]} nodeIds
   * @returns {object} { nodes, edges }
   */
  getSubgraph(store, nodeIds) {
    const nodeSet = new Set(nodeIds);
    const nodes = nodeIds
      .filter(id => store.hasNode(id))
      .map(id => store.getNode(id));

    const edges = [];
    for (const id of nodeIds) {
      if (!store.hasNode(id)) continue;
      const outNeighbors = store.neighbors(id, { direction: 'outbound' });
      for (const n of outNeighbors) {
        if (nodeSet.has(n.key)) {
          edges.push({ source: id, target: n.key, attributes: n.edgeAttributes });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Get coverage percentage: how many nodes of type X have edge of type Y
   * @param {GraphStore} store
   * @param {string} nodeType - e.g., 'Requirement'
   * @param {string} edgeType - e.g., 'TESTS'
   * @param {string} direction - 'inbound' | 'outbound' | 'both'
   * @returns {{ total: number, covered: number, coverage: number, uncoveredIds: string[] }}
   */
  getCoverage(store, nodeType, edgeType, direction = 'inbound') {
    const allNodes = store.filterNodes((k, a) => a.type === nodeType);
    const covered = [];
    const uncovered = [];

    for (const node of allNodes) {
      const neighbors = store.neighbors(node.key, { edgeType, direction });
      if (neighbors.length > 0) {
        covered.push(node.key);
      } else {
        uncovered.push(node.key);
      }
    }

    return {
      total: allNodes.length,
      covered: covered.length,
      coverage: allNodes.length > 0 ? covered.length / allNodes.length : 0,
      uncoveredIds: uncovered,
    };
  }
}

module.exports = GraphQuery;
