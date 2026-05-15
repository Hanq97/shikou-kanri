/**
 * design-context.js — Per-section graph context for design document generation
 *
 * Queries HippoRAG graph per section (not 1 generic query for all).
 * Returns structured entities, relationships, patterns, constraints as JSON.
 *
 * Usage:
 *   node core/cli/ops.js design-context --section N --type bdd|fdd|basic|srs|plan|execute|validate --module CST [--feature FEAT-ID]
 */

const { HippoRAGService } = require('../../rag/hipporag-service');

// ═══════════════════════════════════════════════════════
// BDD Section Query Functions
// ═══════════════════════════════════════════════════════

async function sectionDocInfo(rag, opts) {
  try {
    const stats = await rag.generateReport();
    return { graphReport: stats };
  } catch (_) {
    return { graphReport: null };
  }
}

async function sectionServiceOverview(rag, opts) {
  const [entities, patterns] = await Promise.all([
    rag.queryDDEntities(opts.module),
    rag.retrieveSimilarPatterns('Service', opts.module, { limit: 5, minConfidence: 0.6 }),
  ]);
  return {
    entities: entities.entities || [],
    services: (entities.businessRules || []).filter(n => n.type === 'Service'),
    patterns: patterns.patterns || [],
    componentCount: entities.graphNodeCount || 0,
  };
}

async function sectionBusinessLogic(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  const requirements = (entities.raw || []).filter(n => n.id?.startsWith('FR-'));
  let impactNodes = [];
  if (requirements.length > 0) {
    try {
      impactNodes = await rag.getImpact(requirements[0].id, 3);
    } catch (_) { /* non-blocking */ }
  }
  return {
    businessRules: entities.businessRules || [],
    requirements: requirements.slice(0, 20),
    impactAnalysis: impactNodes.slice(0, 30),
  };
}

async function sectionApiEndpoints(rag, opts) {
  const [entities, controllerPatterns] = await Promise.all([
    rag.queryDDEntities(opts.module),
    rag.retrieveSimilarPatterns('Controller', opts.module, { limit: 5, includeCode: true }),
  ]);
  return {
    existingApis: entities.apiSpecs || [],
    controllerPatterns: controllerPatterns.patterns || [],
    entities: entities.entities || [],
  };
}

async function sectionDataDatabase(rag, opts) {
  const [entities, repoPatterns] = await Promise.all([
    rag.queryDDEntities(opts.module),
    rag.retrieveSimilarPatterns('Repository', opts.module, { limit: 5, includeCode: true }),
  ]);
  return {
    entities: entities.entities || [],
    repositoryPatterns: repoPatterns.patterns || [],
  };
}

async function sectionIntegration(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  const services = (entities.businessRules || []).filter(n => n.type === 'Service');
  let integrationMap = [];
  if (services.length > 0) {
    try {
      integrationMap = await rag.getImpact(services[0].id, 2);
    } catch (_) { /* non-blocking */ }
  }
  return {
    services: services.slice(0, 20),
    integrationMap: integrationMap.slice(0, 30),
    workflows: entities.workflows || [],
  };
}

async function sectionErrorHandling(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  return {
    businessRules: entities.businessRules || [],
    errorRelatedNodes: (entities.raw || []).filter(n =>
      n.id?.includes('ERR') || n.id?.includes('VALID')
    ),
  };
}

async function sectionPerformance(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  return {
    highImportanceNodes: (entities.raw || [])
      .filter(n => (n.importance || 0) >= 0.7)
      .slice(0, 20),
    totalNodes: entities.graphNodeCount || 0,
  };
}

async function sectionSecurity(rag, opts) {
  let violations = [];
  try {
    violations = await rag.getArchitectureViolations();
  } catch (_) { /* non-blocking */ }
  return {
    violations: violations.slice(0, 20),
    moduleViolations: violations.filter(v =>
      v.source?.includes(opts.module) || v.target?.includes(opts.module)
    ),
  };
}

async function sectionTestCases(rag, opts) {
  let coverage = { passed: true, score: 1.0, uncovered_ids: [] };
  let orphans = [];
  try {
    [coverage, orphans] = await Promise.all([
      rag.checkCoverage('Q5_FR_COVERAGE'),
      rag.findOrphans('API'),
    ]);
  } catch (_) { /* non-blocking */ }
  return {
    coverage,
    untestedApis: orphans.slice(0, 20),
  };
}

// ═══════════════════════════════════════════════════════
// FDD Section Query Functions
// ═══════════════════════════════════════════════════════

async function sectionFddOverview(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  return {
    entities: entities.entities || [],
    workflows: entities.workflows || [],
    componentCount: entities.graphNodeCount || 0,
  };
}

async function sectionFddBusinessFlow(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  return {
    businessRules: entities.businessRules || [],
    workflows: entities.workflows || [],
  };
}

async function sectionFddScreens(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  return {
    screens: (entities.workflows || []).filter(n => n.id?.startsWith('SCR-')),
    components: entities.entities || [],
  };
}

async function sectionFddState(rag, opts) {
  const patterns = await rag.retrieveSimilarPatterns('Service', opts.module, {
    limit: 5, sameLayerOnly: false,
  });
  return {
    statePatterns: patterns.patterns || [],
  };
}

async function sectionFddDataIntegration(rag, opts) {
  const [entities, patterns] = await Promise.all([
    rag.queryDDEntities(opts.module),
    rag.retrieveSimilarPatterns('Controller', opts.module, { limit: 3 }),
  ]);
  return {
    entities: entities.entities || [],
    apiPatterns: patterns.patterns || [],
  };
}

async function sectionFddError(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  return {
    businessRules: entities.businessRules || [],
    errorRelatedNodes: (entities.raw || []).filter(n =>
      n.id?.includes('ERR') || n.id?.includes('VALID')
    ),
  };
}

async function sectionFddResponsive(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  return {
    screens: (entities.workflows || []).filter(n => n.id?.startsWith('SCR-')),
    componentCount: entities.graphNodeCount || 0,
  };
}

async function sectionFddPerformance(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  return {
    highImportanceNodes: (entities.raw || [])
      .filter(n => (n.importance || 0) >= 0.7)
      .slice(0, 20),
    totalNodes: entities.graphNodeCount || 0,
  };
}

async function sectionFddVisualDesign(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  return {
    screens: (entities.workflows || []).filter(n => n.id?.startsWith('SCR-')),
    components: entities.entities || [],
  };
}

// ═══════════════════════════════════════════════════════
// BASIC DESIGN Section Query Functions (7: C0-C6)
// ═══════════════════════════════════════════════════════

// C0: Reasoning — Pre-generation context
async function sectionBasicReasoning(rag, opts) {
  try {
    const [report, patterns] = await Promise.all([
      rag.generateReport(),
      rag.retrieveSimilarPatterns('Architecture', opts.module, { limit: 5, minConfidence: 0.5 }),
    ]);
    return { graphReport: report, architecturePatterns: patterns.patterns || [] };
  } catch (_) {
    return { graphReport: null, architecturePatterns: [] };
  }
}

// C1: Architecture — System architecture diagram + patterns
async function sectionBasicArchitecture(rag, opts) {
  const [layerNodes, patterns] = await Promise.all([
    rag.findByLayer('all', { module: opts.module, limit: 20 }),
    rag.retrieveSimilarPatterns('Architecture', opts.module, { limit: 10, includeCode: false }),
  ]);
  return {
    layers: layerNodes.slice(0, 20),
    patterns: patterns.patterns || [],
    layerCount: new Set(layerNodes.map(n => n.attributes?.layer)).size,
  };
}

// C2: Component — Component diagram + specifications
async function sectionBasicComponent(rag, opts) {
  const [entities, componentNodes] = await Promise.all([
    rag.queryDDEntities(opts.module),
    rag.findByStereotype('Component', { module: opts.module, limit: 20 }),
  ]);
  return {
    entities: entities.entities || [],
    components: componentNodes.slice(0, 20),
    services: (entities.businessRules || []).filter(n => n.type === 'Service'),
  };
}

// C3: Data Flow — Data flow diagrams + integration flows
async function sectionBasicDataflow(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  const services = (entities.businessRules || []).filter(n => n.type === 'Service');
  let impactNodes = [];
  if (services.length > 0) {
    try { impactNodes = await rag.getImpact(services[0].id, 3); }
    catch (_) { /* non-blocking */ }
  }
  return {
    services: services.slice(0, 15),
    dataFlows: impactNodes.slice(0, 30),
    workflows: entities.workflows || [],
  };
}

// C4: Data Model — Entity relationship diagram + specifications
async function sectionBasicDatamodel(rag, opts) {
  const [entities, entityNodes] = await Promise.all([
    rag.queryDDEntities(opts.module),
    rag.findByStereotype('Entity', { module: opts.module, limit: 20 }),
  ]);
  return {
    entities: entities.entities || [],
    entityNodes: entityNodes.slice(0, 20),
    relationships: (entities.raw || []).filter(n => n.type === 'Relationship').slice(0, 30),
  };
}

// C5: State — State diagrams + management strategy + cache
async function sectionBasicState(rag, opts) {
  const [patterns, stateNodes] = await Promise.all([
    rag.retrieveSimilarPatterns('Service', opts.module, { limit: 5, sameLayerOnly: false }),
    rag.findByStereotype('State', { module: opts.module, limit: 10 }),
  ]);
  return { statePatterns: patterns.patterns || [], stateNodes: stateNodes.slice(0, 10) };
}

// C6: NFR — Performance + Security + Scalability requirements
async function sectionBasicNfr(rag, opts) {
  let violations = [];
  let coverage = { passed: true, score: 1.0 };
  try {
    [violations, coverage] = await Promise.all([
      rag.getArchitectureViolations(),
      rag.checkCoverage('Q5_NFR_COVERAGE'),
    ]);
  } catch (_) { /* non-blocking */ }
  return {
    violations: violations.filter(v =>
      v.source?.includes(opts.module) || v.target?.includes(opts.module)
    ).slice(0, 20),
    nfrCoverage: coverage,
  };
}

// ═══════════════════════════════════════════════════════
// SRS Section Query Functions (7: sections 00-06)
// ═══════════════════════════════════════════════════════

// 00: Document Information — Project metadata
async function sectionSrsDocInfo(rag, opts) {
  try { return { graphReport: await rag.generateReport() }; }
  catch (_) { return { graphReport: null }; }
}

// 01: Overview — Business context, objectives
async function sectionSrsOverview(rag, opts) {
  const [specialists, context] = await Promise.all([
    rag.querySpecialists(opts.module, 3),
    rag.getContext(
      `${opts.module} business objectives overview scope`,
      { name: 'srs-overview', agent: 'srs' },
      { layers: ['docs'], topK: 5 }
    ),
  ]);
  return {
    specialists: specialists?.specialists || [],
    docsContext: (context?.chunks || []).map(c => ({
      content: c.content?.substring(0, 500) || '',
      source: c.metadata?.source || '',
      score: c.score,
    })),
  };
}

// 02: Functional Requirements — FR dependencies and impact
async function sectionSrsFunctionalReqs(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  const requirements = (entities.raw || []).filter(n => n.id?.startsWith('FR-'));
  let impactNodes = [];
  if (requirements.length > 0) {
    try { impactNodes = await rag.getImpact(requirements[0].id, 2); }
    catch (_) { /* non-blocking */ }
  }
  return {
    existingFRs: requirements.slice(0, 30),
    impactAnalysis: impactNodes.slice(0, 20),
    entityCount: entities.graphNodeCount || 0,
  };
}

// 03: Non-Functional Requirements — Architecture constraints
async function sectionSrsNonFunctionalReqs(rag, opts) {
  let [violations, layerNodes] = [[], []];
  try {
    [violations, layerNodes] = await Promise.all([
      rag.getArchitectureViolations(),
      rag.findByLayer('all', { module: opts.module, limit: 10 }),
    ]);
  } catch (_) { /* non-blocking */ }
  return { violations: violations.slice(0, 15), layers: layerNodes.slice(0, 10) };
}

// 04: User Stories — Entity context for story generation
async function sectionSrsUserStories(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  return {
    entities: entities.entities || [],
    workflows: entities.workflows || [],
    businessRules: entities.businessRules || [],
  };
}

// 05: Acceptance Criteria — Coverage analysis
async function sectionSrsAcceptanceCriteria(rag, opts) {
  let coverage = { passed: true, score: 1.0, uncovered_ids: [] };
  let orphans = [];
  try {
    [coverage, orphans] = await Promise.all([
      rag.checkCoverage('Q5_FR_COVERAGE'),
      rag.findOrphans('FR'),
    ]);
  } catch (_) { /* non-blocking */ }
  return { coverage, uncoveredFRs: orphans.slice(0, 20) };
}

// 06: Constraints — Architecture and technology constraints
async function sectionSrsConstraints(rag, opts) {
  let [violations, archContext] = [[], null];
  try {
    [violations, archContext] = await Promise.all([
      rag.getArchitectureViolations(),
      rag.queryWithArchitecture(`${opts.module} constraints limitations`, { topK: 5 }),
    ]);
  } catch (_) { /* non-blocking */ }
  return {
    violations: violations.slice(0, 15),
    architectureConstraints: archContext?.chunks?.map(c => c.content?.substring(0, 300)) || [],
  };
}

// ═══════════════════════════════════════════════════════
// PLAN Section Query Functions (6: context types)
// ═══════════════════════════════════════════════════════

// Plan section 0: Context patterns — existing implementation patterns
async function sectionPlanContextPatterns(rag, opts) {
  const [patterns, stereotypes] = await Promise.all([
    rag.retrieveSimilarPatterns('Service', opts.module, { limit: 10, includeCode: true }),
    rag.findByStereotype('Repository', { module: opts.module, limit: 10 }),
  ]);
  return { servicePatterns: patterns.patterns || [], repositoryNodes: stereotypes.slice(0, 10) };
}

// Plan section 1: Impact analysis — change impact prediction
async function sectionPlanImpactAnalysis(rag, opts) {
  const entities = await rag.queryDDEntities(opts.module);
  const services = (entities.businessRules || []).filter(n => n.type === 'Service');
  let impactNodes = [];
  if (services.length > 0) {
    try { impactNodes = await rag.getImpact(services[0].id, 3); }
    catch (_) { /* non-blocking */ }
  }
  return {
    services: services.slice(0, 15),
    impactNodes: impactNodes.slice(0, 40),
    totalEntities: entities.graphNodeCount || 0,
  };
}

// Plan section 2: Dependencies — dependency graph
async function sectionPlanDependencies(rag, opts) {
  const [layerNodes, graphCtx] = await Promise.all([
    rag.findByLayer('all', { module: opts.module, limit: 20 }),
    rag.getGraphContext({ name: 'plan-deps', agent: 'plan' }),
  ]);
  return { layerNodes: layerNodes.slice(0, 20), graphContext: graphCtx };
}

// Plan section 3: Code patterns — implementation reference
async function sectionPlanCodePatterns(rag, opts) {
  const [archResults, repoNodes] = await Promise.all([
    rag.queryWithArchitecture(`${opts.module} implementation patterns`, { topK: 10 }),
    rag.findByStereotype('Repository', { module: opts.module, limit: 10 }),
  ]);
  return {
    architectureResults: (archResults?.chunks || []).map(c => ({
      content: c.content?.substring(0, 400) || '', score: c.score,
    })),
    repositoryPatterns: repoNodes.slice(0, 10),
  };
}

// Plan section 4: Validation — pre-plan validation context
async function sectionPlanValidation(rag, opts) {
  let [coverage, violations] = [{ passed: true }, []];
  try {
    [coverage, violations] = await Promise.all([
      rag.checkCoverage('Q5_FR_COVERAGE'),
      rag.getArchitectureViolations(),
    ]);
  } catch (_) { /* non-blocking */ }
  return { coverage, violations: violations.slice(0, 15) };
}

// Plan section 5: Specialist matching — recommend specialists for steps
async function sectionPlanSpecialists(rag, opts) {
  const specialists = await rag.querySpecialists(opts.module, 5);
  return { specialists: specialists?.specialists || [] };
}

// ═══════════════════════════════════════════════════════
// EXECUTE Section Query Functions (D2: 1 aggregate)
// ═══════════════════════════════════════════════════════

// opts.module = file type being generated (e.g. "service", "controller")
async function sectionExecuteCodeContext(rag, opts) {
  try {
    const [patterns, entities, specialists] = await Promise.all([
      rag.retrieveSimilarPatterns(opts.module, opts.module, {
        limit: 5, minConfidence: 0.5, includeCode: true,
      }),
      rag.queryDDEntities(opts.module),
      rag.querySpecialists(opts.module, 3),
    ]);
    return {
      codePatterns: patterns.patterns || [],
      dependencies: entities.entities || [],
      imports: (entities.raw || []).filter(n => n.type === 'Import').slice(0, 20),
      specialistHints: specialists?.specialists || [],
    };
  } catch (_) {
    return { codePatterns: [], dependencies: [], imports: [], specialistHints: [] };
  }
}

// ═══════════════════════════════════════════════════════
// VALIDATE Section Query Functions (D2: 1 aggregate)
// ═══════════════════════════════════════════════════════

// opts.module = file path being validated
async function sectionValidateContext(rag, opts) {
  try {
    const [patterns, violations] = await Promise.all([
      rag.retrieveSimilarPatterns(opts.module, opts.module, {
        limit: 5, minConfidence: 0.6,
      }),
      rag.getArchitectureViolations(),
    ]);
    return {
      expectedPatterns: patterns.patterns || [],
      violations: (violations || []).filter(v =>
        v.source?.includes(opts.module) || v.target?.includes(opts.module)
      ).slice(0, 20),
    };
  } catch (_) {
    return { expectedPatterns: [], violations: [] };
  }
}

// ═══════════════════════════════════════════════════════
// Section Query Routing
// ═══════════════════════════════════════════════════════

const SECTION_QUERIES = {
  bdd: {
    0: { name: 'document-info', query: sectionDocInfo },
    1: { name: 'service-overview', query: sectionServiceOverview },
    2: { name: 'business-logic', query: sectionBusinessLogic },
    3: { name: 'api-endpoints', query: sectionApiEndpoints },
    4: { name: 'data-database', query: sectionDataDatabase },
    5: { name: 'integration', query: sectionIntegration },
    6: { name: 'error-handling', query: sectionErrorHandling },
    7: { name: 'performance', query: sectionPerformance },
    8: { name: 'security', query: sectionSecurity },
    9: { name: 'test-cases', query: sectionTestCases },
  },
  fdd: {
    0: { name: 'document-info', query: sectionDocInfo },
    1: { name: 'overview', query: sectionFddOverview },
    2: { name: 'business-flow', query: sectionFddBusinessFlow },
    3: { name: 'screens', query: sectionFddScreens },
    4: { name: 'state', query: sectionFddState },
    5: { name: 'data-integration', query: sectionFddDataIntegration },
    6: { name: 'error', query: sectionFddError },
    7: { name: 'responsive', query: sectionFddResponsive },
    8: { name: 'performance', query: sectionFddPerformance },
    9: { name: 'visual-design', query: sectionFddVisualDesign },
  },

  // NEW: Basic Design sections (C0-C6)
  basic: {
    0: { name: 'reasoning',     query: sectionBasicReasoning },
    1: { name: 'architecture',  query: sectionBasicArchitecture },
    2: { name: 'component',     query: sectionBasicComponent },
    3: { name: 'dataflow',      query: sectionBasicDataflow },
    4: { name: 'datamodel',     query: sectionBasicDatamodel },
    5: { name: 'state',         query: sectionBasicState },
    6: { name: 'nfr',           query: sectionBasicNfr },
  },

  // NEW: SRS sections (00-06)
  srs: {
    0: { name: 'document-info',           query: sectionSrsDocInfo },
    1: { name: 'overview',                query: sectionSrsOverview },
    2: { name: 'functional-requirements', query: sectionSrsFunctionalReqs },
    3: { name: 'non-functional-reqs',     query: sectionSrsNonFunctionalReqs },
    4: { name: 'user-stories',            query: sectionSrsUserStories },
    5: { name: 'acceptance-criteria',     query: sectionSrsAcceptanceCriteria },
    6: { name: 'constraints',             query: sectionSrsConstraints },
  },

  // NEW: Plan context types
  plan: {
    0: { name: 'context-patterns',   query: sectionPlanContextPatterns },
    1: { name: 'impact-analysis',    query: sectionPlanImpactAnalysis },
    2: { name: 'dependencies',       query: sectionPlanDependencies },
    3: { name: 'code-patterns',      query: sectionPlanCodePatterns },
    4: { name: 'validation',         query: sectionPlanValidation },
    5: { name: 'specialists',        query: sectionPlanSpecialists },
  },

  // EXECUTE-VALIDATE-FIX: Execute/Validate context (D2 — 1 aggregate per type)
  execute: {
    0: { name: 'code-context', query: sectionExecuteCodeContext },
  },
  validate: {
    0: { name: 'validation-context', query: sectionValidateContext },
  },
};

// ops.js contract: handler({ action, args, pkgRoot })
module.exports = async function(ctx) {
  const { args } = ctx;
  const opts = {
    section: parseInt(args.section, 10),
    type: args.type,
    module: args.module || '_global',
    feature: args.feature || '_global',
  };

  if (!opts.type || isNaN(opts.section)) {
    return { ok: false, error: 'Required: --section N --type bdd|fdd|basic|srs|plan [--module CODE]' };
  }

  const sectionConfig = SECTION_QUERIES[opts.type]?.[opts.section];
  if (!sectionConfig) {
    return { ok: false, error: `Unknown section ${opts.section} for type ${opts.type}` };
  }

  const rag = HippoRAGService.getInstance(opts.feature, 'dev');
  const start = Date.now();

  try {
    const context = await sectionConfig.query(rag, opts);
    return {
      ok: true,
      section: opts.section,
      type: opts.type,
      sectionName: sectionConfig.name,
      context,
      source: 'graph',
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    // Non-blocking: return empty context on failure
    return {
      ok: true,
      section: opts.section,
      type: opts.type,
      sectionName: sectionConfig.name,
      context: { entities: [], relationships: [], patterns: [], note: 'RAG unavailable' },
      source: 'fallback',
      error: err.message,
      latencyMs: Date.now() - start,
    };
  }
};
