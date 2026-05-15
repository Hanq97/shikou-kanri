'use strict';

/**
 * Edge Density Enhancer - Inference rules to increase graph edge density.
 * Runs AFTER initial extraction to add inferred edges based on naming conventions,
 * path matching, and NestJS architectural patterns.
 *
 * Target: Increase from 0.48 edges/node to 2.5-3.0 edges/node.
 *
 * @module edge-density-enhancer
 */

/**
 * Infer PERSISTS edges from naming conventions.
 * If Component name contains Entity name + ends with "Service" → PERSISTS.
 * Example: ENT-LoanApplication + COMP-LoanApplicationService → PERSISTS
 *
 * @param {object[]} nodes - All graph nodes with { id, attributes }
 * @returns {object[]} Inferred edges
 */
function inferPersistsFromNaming(nodes) {
  const entities = nodes.filter(n => n.attributes && n.attributes.type === 'Entity');
  const comps = nodes.filter(n => n.attributes && n.attributes.type === 'Component');
  const edges = [];

  for (const entity of entities) {
    const entityName = entity.id.replace('ENT-', '');
    for (const comp of comps) {
      const compName = comp.id.replace('COMP-', '');
      if (compName.includes(entityName) && compName.endsWith('Service')) {
        edges.push({
          source: entity.id,
          target: comp.id,
          attributes: { type: 'PERSISTS', confidence: 0.80, source: 'naming-inference' },
        });
      }
    }
  }

  return edges;
}

/**
 * Infer EXPOSES edges from API path → Controller name matching.
 * If API path contains resource name matching a Controller component → EXPOSES.
 * Example: API-POST-/api/v1/loans + COMP-LoanController → EXPOSES
 *
 * @param {object[]} nodes - All graph nodes
 * @returns {object[]} Inferred edges
 */
function inferExposesFromPath(nodes) {
  const apis = nodes.filter(n => n.attributes && n.attributes.type === 'API');
  const comps = nodes.filter(n => n.attributes && n.attributes.type === 'Component');
  const edges = [];

  for (const api of apis) {
    const apiPath = api.attributes.path || '';
    const pathParts = apiPath.split('/').filter(Boolean);
    // Use second-to-last or last segment as resource (skip 'api', 'v1' prefixes)
    const resource = pathParts.filter(p => !['api', 'v1', 'v2'].includes(p)).pop();
    if (!resource) continue;

    const resourceLower = resource.toLowerCase().replace(/s$/, ''); // Remove trailing 's' (plural)

    for (const comp of comps) {
      const compName = comp.id.replace('COMP-', '').toLowerCase();
      if (compName.includes(resourceLower) && compName.includes('controller')) {
        edges.push({
          source: api.id,
          target: comp.id,
          attributes: { type: 'EXPOSES', confidence: 0.75, source: 'path-inference' },
        });
      }
    }
  }

  return edges;
}

/**
 * Infer DEPENDS_ON edges for Service → Repository convention.
 * If COMP-XxxService and COMP-XxxRepository exist → DEPENDS_ON.
 * NestJS convention: Service depends on Repository.
 *
 * @param {object[]} nodes - All graph nodes
 * @returns {object[]} Inferred edges
 */
function inferServiceDependencies(nodes) {
  const comps = nodes.filter(n => n.attributes && n.attributes.type === 'Component');
  const edges = [];

  const services = comps.filter(c => c.id.endsWith('Service'));
  const repos = comps.filter(c => c.id.endsWith('Repository'));

  for (const svc of services) {
    const baseName = svc.id.replace('COMP-', '').replace('Service', '');
    const matchingRepo = repos.find(r =>
      r.id.replace('COMP-', '').replace('Repository', '') === baseName
    );
    if (matchingRepo) {
      edges.push({
        source: svc.id,
        target: matchingRepo.id,
        attributes: { type: 'DEPENDS_ON', confidence: 0.85, source: 'convention-inference' },
      });
    }
  }

  return edges;
}

/**
 * Infer DEPENDS_ON edges for Controller → Service convention.
 * If COMP-XxxController and COMP-XxxService exist → DEPENDS_ON.
 *
 * @param {object[]} nodes - All graph nodes
 * @returns {object[]} Inferred edges
 */
function inferControllerDependencies(nodes) {
  const comps = nodes.filter(n => n.attributes && n.attributes.type === 'Component');
  const edges = [];

  const controllers = comps.filter(c => c.id.endsWith('Controller'));
  const services = comps.filter(c => c.id.endsWith('Service'));

  for (const ctrl of controllers) {
    const baseName = ctrl.id.replace('COMP-', '').replace('Controller', '');
    const matchingService = services.find(s =>
      s.id.replace('COMP-', '').replace('Service', '') === baseName
    );
    if (matchingService) {
      edges.push({
        source: ctrl.id,
        target: matchingService.id,
        attributes: { type: 'DEPENDS_ON', confidence: 0.85, source: 'convention-inference' },
      });
    }
  }

  return edges;
}

/**
 * Run all inference rules and add edges to the graph.
 * Deduplicates edges (won't add if edge already exists).
 *
 * @param {object} graphService - GraphService instance with getNodes(), addEdge(), hasEdge()
 * @returns {Promise<{ addedEdges: number }>}
 */
async function enhance(graphService) {
  const nodes = graphService.getNodes();
  let addedEdges = 0;

  // Run all inference rules
  const allInferred = [
    ...inferPersistsFromNaming(nodes),
    ...inferExposesFromPath(nodes),
    ...inferServiceDependencies(nodes),
    ...inferControllerDependencies(nodes),
  ];

  // Add edges (skip duplicates)
  for (const edge of allInferred) {
    // Check if both source and target nodes exist in graph
    if (!graphService.hasNode(edge.source) || !graphService.hasNode(edge.target)) {
      continue;
    }

    // Check if edge already exists
    if (graphService.hasEdge(edge.source, edge.target)) {
      continue;
    }

    try {
      graphService.addEdge(edge.source, edge.target, edge.attributes);
      addedEdges++;
    } catch (err) {
      // Non-blocking: skip edges that fail validation
      console.warn(`[EdgeDensityEnhancer] Skip edge ${edge.source} → ${edge.target}: ${err.message}`);
    }
  }

  return { addedEdges };
}

module.exports = {
  inferPersistsFromNaming,
  inferExposesFromPath,
  inferServiceDependencies,
  inferControllerDependencies,
  enhance,
};
