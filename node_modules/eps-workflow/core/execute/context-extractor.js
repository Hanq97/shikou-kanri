/**
 * Context Extractor for Execute Command
 * Week 15 - Day 1: Context Extraction
 *
 * Extracts 5 context types from approved plan:
 * 1. Stack Context - Tech stack, variant, KB selection
 * 2. Type Context - Backend/Frontend, layer mapping
 * 3. Pattern Context - Pattern application from plan
 * 4. Dependency Context - Execution order, dependency graph
 * 5. Requirements Context - FR/NFR validation
 */

const fs = require('fs');

// ========================================
// SECTION 1: STACK CONTEXT EXTRACTION
// ========================================

/**
 * Pattern 1.1: Extract Stack from Plan Metadata
 */
function extractStackFromMetadata(plan) {
  const stack = plan.metadata?.stack;
  const variant = plan.metadata?.variant;

  if (!stack) {
    throw new Error('Missing stack in plan metadata');
  }

  return { stack, variant };
}

/**
 * Pattern 1.2: Load Stack Configuration
 */
function loadStackConfig(stack, variant) {
  const { getStackResolver } = require("../state/stack-resolver.js");
  const resolver = getStackResolver();
  const stackDef = resolver.getStack(stack);

  if (!stackDef) {
    throw new Error(`Invalid stack: ${stack}`);
  }

  return stackDef;
}

/**
 * Pattern 1.3: Load Backend Knowledge Base
 */
function loadBackendKB(kbPath) {
  if (!fs.existsSync(kbPath)) {
    console.warn(`Backend KB not found: ${kbPath}`);
    return { patterns: [], specialists: [] };
  }

  const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
  return {
    patterns: kb.patterns || [],
    specialists: kb.specialists || []
  };
}

/**
 * Pattern 1.4: Load Frontend Knowledge Base
 */
function loadFrontendKB(kbPath) {
  if (!fs.existsSync(kbPath)) {
    console.warn(`Frontend KB not found: ${kbPath}`);
    return { patterns: [] };
  }

  const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
  return {
    patterns: kb.patterns || []
  };
}

/**
 * Pattern 1.7: Build Stack Context Object
 */
function extractStackContext(plan) {
  const { stack, variant } = extractStackFromMetadata(plan);
  const stackConfig = loadStackConfig(stack, variant || 'standard');

  let backendKB = { patterns: [], specialists: [] };
  let frontendKB = { patterns: [] };

  if (stackConfig.backend_kb) {
    backendKB = loadBackendKB(stackConfig.backend_kb);
  }

  if (stackConfig.frontend_kb) {
    frontendKB = loadFrontendKB(stackConfig.frontend_kb);
  }

  return {
    stack,
    variant: variant || 'standard',
    config: stackConfig,
    kb: {
      backend: backendKB,
      frontend: frontendKB
    }
  };
}

// ========================================
// SECTION 2: TYPE CONTEXT EXTRACTION
// ========================================

/**
 * Pattern 2.1: Extract Type from Step
 */
function extractTypeFromStep(step) {
  const type = step.type;
  const validTypes = ['backend', 'frontend', 'database', 'infrastructure'];

  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  return type;
}

/**
 * Pattern 2.2: Extract Layer from Step
 */
function extractLayerFromStep(step) {
  const layer = step.layer;
  const type = step.type;

  const validLayers = {
    backend: ['domain', 'repository', 'service', 'controller', 'dto', 'exception'],
    frontend: ['component', 'page', 'hook', 'api', 'layout', 'utility']
  };

  if (type === 'backend' || type === 'frontend') {
    const allowed = validLayers[type];
    if (!allowed.includes(layer)) {
      throw new Error(`Invalid layer '${layer}' for type '${type}'. Must be one of: ${allowed.join(', ')}`);
    }
  }

  return layer;
}

/**
 * Pattern 2.3: Build Type Context
 */
function extractTypeContext(step, stackContext) {
  const type = extractTypeFromStep(step);
  const layer = extractLayerFromStep(step);

  return {
    type,
    layer,
    stack: stackContext.stack
  };
}

// ========================================
// SECTION 3: PATTERN CONTEXT EXTRACTION
// ========================================

/**
 * Pattern 3.1: Extract Patterns from Step
 */
function extractPatternsFromStep(step) {
  const patterns = step.patterns || [];
  return patterns.map(p => (typeof p === 'string' ? { name: p, source: 'plan' } : { ...p, source: 'plan' }));
}

/**
 * Pattern 3.2: Match Patterns to KB
 */
function matchPatternsToKB(stepPatterns, kb) {
  const matched = [];

  for (const stepPattern of stepPatterns) {
    const name = stepPattern.name || stepPattern;
    const kbPattern = kb.patterns.find(p => p.name === name || p.id === name);

    if (kbPattern) {
      matched.push({
        ...kbPattern,
        source: 'kb',
        stepSource: stepPattern.source
      });
    } else {
      matched.push({
        name,
        source: 'unknown',
        confidence: 50
      });
    }
  }

  return matched;
}

/**
 * Pattern 3.4: Build Pattern Context
 */
function extractPatternContext(step, stackContext) {
  const stepPatterns = extractPatternsFromStep(step);
  const kb = step.type === 'backend' ? stackContext.kb.backend : stackContext.kb.frontend;
  const matched = matchPatternsToKB(stepPatterns, kb);

  return {
    patterns: matched,
    count: matched.length
  };
}

// ========================================
// SECTION 4: DEPENDENCY CONTEXT EXTRACTION
// ========================================

/**
 * Pattern 4.1: Extract Dependencies from Step
 */
function extractDependenciesFromStep(step) {
  const deps = step.dependencies || [];
  return deps.map(d => {
    if (typeof d === 'string') {
      return { stepId: d, type: 'blocking' };
    }
    return { stepId: d.stepId || d, type: d.type || 'blocking' };
  });
}

/**
 * Pattern 4.2: Build Dependency Graph
 */
function buildDependencyGraph(plan) {
  const graph = { nodes: [], edges: [] };

  for (const step of plan.steps) {
    graph.nodes.push({
      id: step.id,
      layer: step.layer,
      type: step.type
    });

    const deps = extractDependenciesFromStep(step);
    for (const dep of deps) {
      graph.edges.push({
        from: dep.stepId,
        to: step.id,
        type: dep.type
      });
    }
  }

  return graph;
}

/**
 * Pattern 4.3: Topological Sort for Execution Order
 */
function topologicalSort(graph) {
  const inDegree = {};
  const queue = [];
  const result = [];

  // Initialize in-degree
  for (const node of graph.nodes) {
    inDegree[node.id] = 0;
  }

  // Calculate in-degree
  for (const edge of graph.edges) {
    inDegree[edge.to] = (inDegree[edge.to] || 0) + 1;
  }

  // Find nodes with no dependencies
  for (const node of graph.nodes) {
    if (inDegree[node.id] === 0) {
      queue.push(node.id);
    }
  }

  // Process nodes
  while (queue.length > 0) {
    const id = queue.shift();
    result.push(id);

    // Reduce in-degree for dependent nodes
    for (const edge of graph.edges) {
      if (edge.from === id) {
        inDegree[edge.to]--;
        if (inDegree[edge.to] === 0) {
          queue.push(edge.to);
        }
      }
    }
  }

  // Check for circular dependencies
  if (result.length !== graph.nodes.length) {
    throw new Error('Circular dependency detected');
  }

  return result;
}

/**
 * Pattern 4.5: Group Steps by Dependency Level
 */
function groupStepsByLevel(graph) {
  const levels = [];
  const inDegree = {};

  // Initialize in-degree
  for (const node of graph.nodes) {
    inDegree[node.id] = 0;
  }

  for (const edge of graph.edges) {
    inDegree[edge.to] = (inDegree[edge.to] || 0) + 1;
  }

  // Find first level (no dependencies)
  let currentLevel = [];
  for (const node of graph.nodes) {
    if (inDegree[node.id] === 0) {
      currentLevel.push(node.id);
    }
  }

  if (currentLevel.length > 0) {
    levels.push(currentLevel);
  }

  // Process remaining levels
  while (currentLevel.length > 0) {
    const nextLevel = [];

    for (const id of currentLevel) {
      for (const edge of graph.edges) {
        if (edge.from === id) {
          inDegree[edge.to]--;
          if (inDegree[edge.to] === 0) {
            nextLevel.push(edge.to);
          }
        }
      }
    }

    if (nextLevel.length > 0) {
      levels.push(nextLevel);
    }

    currentLevel = nextLevel;
  }

  return levels;
}

/**
 * Pattern 4.6: Build Dependency Context
 */
function extractDependencyContext(plan) {
  const graph = buildDependencyGraph(plan);
  const order = topologicalSort(graph);
  const levels = groupStepsByLevel(graph);

  return {
    graph,
    executionOrder: order,
    levels,
    totalSteps: graph.nodes.length
  };
}

// ========================================
// SECTION 5: REQUIREMENTS CONTEXT EXTRACTION
// ========================================

/**
 * Pattern 5.1: Extract Requirements from Plan
 */
function extractRequirementsFromPlan(plan) {
  const reqs = plan.context?.requirements || {};
  return {
    functional: reqs.functional || [],
    nonFunctional: reqs.nonFunctional || [],
    evidence: reqs.evidence || []
  };
}

/**
 * Pattern 5.8: Map Steps to Requirements
 */
function mapStepsToRequirements(plan) {
  const mapping = {};

  for (const step of plan.steps) {
    mapping[step.id] = {
      functional: step.satisfies?.functional || [],
      nonFunctional: step.satisfies?.nonFunctional || []
    };
  }

  return mapping;
}

/**
 * Pattern 5.5: Build Requirements Context
 */
function extractRequirementsContext(plan) {
  const reqs = extractRequirementsFromPlan(plan);
  const mapping = mapStepsToRequirements(plan);

  return {
    functional: reqs.functional,
    nonFunctional: reqs.nonFunctional,
    evidence: reqs.evidence,
    mapping,
    totalFRs: reqs.functional.length,
    totalNFRs: reqs.nonFunctional.length
  };
}

// ========================================
// MAIN ENTRY POINT
// ========================================

/**
 * Extract full context from plan
 */
function extractFullContext(planPath) {
  // Load plan
  let plan;
  if (typeof planPath === 'string') {
    if (!fs.existsSync(planPath)) {
      throw new Error(`Plan file not found: ${planPath}`);
    }
    plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  } else {
    plan = planPath;
  }

  // Extract all contexts
  const stackContext = extractStackContext(plan);
  const dependencyContext = extractDependencyContext(plan);
  const requirementsContext = extractRequirementsContext(plan);

  return {
    stack: stackContext,
    dependency: dependencyContext,
    requirements: requirementsContext
  };
}

// Export
module.exports = {
  extractFullContext,
  extractStackContext,
  extractTypeContext,
  extractPatternContext,
  extractDependencyContext,
  extractRequirementsContext
};

// CLI support
if (require.main === module) {
  const planPath = process.argv[2];

  if (!planPath) {
    console.error('Usage: node context-extractor.js <plan-path>');
    process.exit(1);
  }

  try {
    const context = extractFullContext(planPath);
    console.log(JSON.stringify(context, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
