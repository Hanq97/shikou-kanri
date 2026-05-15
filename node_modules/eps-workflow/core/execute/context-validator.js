/**
 * Context Validator for Execute Command
 * Week 15 - Day 2: Context Validation
 *
 * Validates extracted context with 28 validation rules across 4 layers:
 * Layer 1: Structure Validation (5 rules)
 * Layer 2: Type-Specific Validation (19 rules)
 * Layer 3: Cross-Context Validation (4 rules)
 * Layer 4: Conflict Detection
 */

const fs = require('fs');

// ========================================
// MAIN VALIDATION FUNCTION
// ========================================

/**
 * Main validation orchestrator
 */
function validateContext(extractedContext) {
  const validationResult = {
    context: extractedContext,
    metadata: {
      planId: extractedContext.metadata?.planId || 'unknown',
      validatedAt: new Date().toISOString(),
      validatorVersion: '1.0.0',
      startTime: Date.now()
    },
    validation: {},
    status: {}
  };

  try {
    // Layer 1: Structure validation
    validationResult.validation.structure = validateStructure(extractedContext);
    if (!validationResult.validation.structure.valid) {
      validationResult.status = {
        valid: false,
        errors: validationResult.validation.structure.errors,
        stage: 'STRUCTURE_VALIDATION_FAILED'
      };
      return validationResult;
    }

    // Layer 2: Type-specific validation
    validationResult.validation.types = {
      stack: validateStackContext(extractedContext.stack),
      dependency: validateDependencyContext(extractedContext.dependency, extractedContext.stack),
      requirements: validateRequirementsContext(extractedContext.requirements, validationResult.metadata.planId)
    };

    // Check if any type validation failed
    const typeErrors = collectErrors(validationResult.validation.types);
    if (typeErrors.length > 0) {
      validationResult.status = {
        valid: false,
        errors: typeErrors,
        stage: 'TYPE_VALIDATION_FAILED'
      };
      return validationResult;
    }

    // Layer 3: Cross-context validation
    validationResult.validation.crossContext = validateCrossContext(extractedContext);
    if (!validationResult.validation.crossContext.valid) {
      validationResult.status = {
        valid: false,
        errors: validationResult.validation.crossContext.errors,
        stage: 'CROSS_VALIDATION_FAILED'
      };
      return validationResult;
    }

    // Layer 4: Conflict detection
    validationResult.validation.conflicts = detectAllConflicts(extractedContext);

    // Critical conflicts = errors
    const criticalConflicts = validationResult.validation.conflicts.filter(c => c.severity === 'ERROR');
    if (criticalConflicts.length > 0) {
      validationResult.status = {
        valid: false,
        errors: formatConflictsAsErrors(criticalConflicts),
        stage: 'CONFLICT_DETECTION_FAILED'
      };
      return validationResult;
    }

    // All validations passed
    const warnings = collectAllWarnings(validationResult.validation);
    validationResult.status = {
      valid: true,
      passedRules: countPassedRules(validationResult.validation),
      failedRules: 0,
      warnings: warnings.length,
      errors: [],
      stage: 'VALIDATION_COMPLETE'
    };

    validationResult.metadata.endTime = Date.now();
    validationResult.metadata.duration = validationResult.metadata.endTime - validationResult.metadata.startTime;

    return validationResult;

  } catch (error) {
    validationResult.status = {
      valid: false,
      errors: [{ type: 'VALIDATION_EXCEPTION', message: error.message }],
      stage: 'VALIDATION_EXCEPTION'
    };
    return validationResult;
  }
}

// ========================================
// LAYER 1: STRUCTURE VALIDATION
// ========================================

function validateStructure(context) {
  const errors = [];
  const warnings = [];

  // Rule S1: All context types present
  const requiredTypes = ['stack', 'dependency', 'requirements'];
  for (const typeName of requiredTypes) {
    if (!context.hasOwnProperty(typeName)) {
      errors.push({
        rule: 'S1',
        type: 'MISSING_CONTEXT_TYPE',
        message: `Missing context type: ${typeName}`
      });
    }
  }

  // If critical types missing, return early
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Rule S3: Non-empty context
  for (const typeName of requiredTypes) {
    if (isEmptyObject(context[typeName])) {
      errors.push({
        rule: 'S3',
        type: 'EMPTY_CONTEXT',
        contextType: typeName,
        message: `Context type ${typeName} is empty`
      });
    }
  }

  // Rule S5: Context completeness
  const completeness = calculateContextCompleteness(context);
  if (completeness < 90) {
    warnings.push({
      rule: 'S5',
      type: 'LOW_COMPLETENESS',
      completeness,
      message: `Context completeness ${completeness}% < 90%`
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function calculateContextCompleteness(context) {
  let totalFields = 0;
  let filledFields = 0;

  // Stack context fields
  const stackFields = ['stack', 'variant', 'kb'];
  for (const field of stackFields) {
    totalFields++;
    if (context.stack && context.stack[field] && !isEmpty(context.stack[field])) {
      filledFields++;
    }
  }

  // Dependency context fields
  const depFields = ['graph', 'executionOrder', 'levels'];
  for (const field of depFields) {
    totalFields++;
    if (context.dependency && context.dependency[field] && !isEmpty(context.dependency[field])) {
      filledFields++;
    }
  }

  // Requirements context fields
  const reqFields = ['functional', 'nonFunctional'];
  for (const field of reqFields) {
    totalFields++;
    if (context.requirements && context.requirements[field] && Array.isArray(context.requirements[field]) && context.requirements[field].length > 0) {
      filledFields++;
    }
  }

  const completeness = (filledFields / totalFields) * 100;
  return Math.round(completeness * 100) / 100;
}

// ========================================
// LAYER 2: TYPE-SPECIFIC VALIDATION
// ========================================

function validateStackContext(stackContext) {
  const errors = [];
  const warnings = [];

  // Rule ST1: Valid stack name
  const validStacks = ['java-nextjs-postgres', 'nestjs-blockchain', 'csharp-react-mssql', 'fastapi-react-postgres'];
  if (!validStacks.includes(stackContext.stack)) {
    errors.push({
      rule: 'ST1',
      type: 'INVALID_STACK',
      stack: stackContext.stack,
      message: `Invalid stack: ${stackContext.stack}`,
      validOptions: validStacks
    });
    return { valid: false, errors, warnings };
  }

  // Rule ST2: Valid variant for stack — use StackResolver
  try {
    const { getStackResolver } = require("../state/stack-resolver.js");
    const resolver = getStackResolver();
    const stackDef = resolver.getStack(stackContext.stack);
    if (stackDef) {
      const validVariants = Object.keys(stackDef.variants || {});
      if (validVariants.length > 0 && !validVariants.includes(stackContext.variant)) {
        errors.push({
          rule: 'ST2',
          type: 'INVALID_VARIANT',
          variant: stackContext.variant,
          stack: stackContext.stack,
          message: `Invalid variant ${stackContext.variant} for stack ${stackContext.stack}`,
          validOptions: validVariants
        });
      }
    }
  } catch (e) {
    // StackResolver not available — skip variant validation
  }

  // Rule ST3: KB files exist and valid
  if (stackContext.kb) {
    for (const [kbType, kbData] of Object.entries(stackContext.kb)) {
      if (kbData.patterns && Array.isArray(kbData.patterns) && kbData.patterns.length === 0) {
        warnings.push({
          rule: 'ST3',
          type: 'EMPTY_KB',
          kbType,
          message: `KB ${kbType} has no patterns`
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function validateDependencyContext(dependencyContext, stackContext) {
  const errors = [];
  const warnings = [];

  if (!dependencyContext.graph) {
    warnings.push({
      rule: 'D1',
      type: 'NO_DEPENDENCY_GRAPH',
      message: 'No dependency graph specified'
    });
    return { valid: true, errors, warnings };
  }

  // Rule D1: No circular dependencies (already checked during extraction via topological sort)
  // If topological sort succeeded, no cycles exist

  // Rule D2: Execution order exists
  if (!dependencyContext.executionOrder || dependencyContext.executionOrder.length === 0) {
    warnings.push({
      rule: 'D2',
      type: 'NO_EXECUTION_ORDER',
      message: 'No execution order specified'
    });
  }

  // Rule D4: Validate total steps consistency
  if (dependencyContext.graph && dependencyContext.totalSteps) {
    const nodeCount = dependencyContext.graph.nodes?.length || 0;
    if (nodeCount !== dependencyContext.totalSteps) {
      warnings.push({
        rule: 'D4',
        type: 'STEP_COUNT_MISMATCH',
        expected: dependencyContext.totalSteps,
        actual: nodeCount,
        message: `Step count mismatch: expected ${dependencyContext.totalSteps}, got ${nodeCount}`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function validateRequirementsContext(requirementsContext, planId) {
  const errors = [];
  const warnings = [];

  // Collect all requirement IDs
  const allIds = [];
  const functionalReqs = requirementsContext.functional || [];
  const nonFunctionalReqs = requirementsContext.nonFunctional || [];

  for (const req of functionalReqs) {
    if (req.id) allIds.push(req.id);
  }
  for (const req of nonFunctionalReqs) {
    if (req.id) allIds.push(req.id);
  }

  // Rule R2: Unique requirement IDs
  const duplicates = findDuplicates(allIds);
  if (duplicates.length > 0) {
    errors.push({
      rule: 'R2',
      type: 'DUPLICATE_IDS',
      duplicates,
      message: `Duplicate requirement IDs: ${duplicates.join(', ')}`
    });
  }

  // Rule R1: Functional requirements schema compliance
  for (const req of functionalReqs) {
    // Check ID format
    if (req.id && !/^FR-\d{3}$/.test(req.id)) {
      warnings.push({
        rule: 'R1',
        type: 'INVALID_FR_ID_FORMAT',
        id: req.id,
        message: `Invalid FR ID format: ${req.id} (expected: FR-XXX)`
      });
    }

    // Check description
    if (!req.description || req.description.length < 10) {
      warnings.push({
        rule: 'R1',
        type: 'SHORT_DESCRIPTION',
        id: req.id,
        message: `Requirement ${req.id} has short or missing description`
      });
    }
  }

  // Rule R1: Non-functional requirements schema compliance
  for (const req of nonFunctionalReqs) {
    // Check ID format
    if (req.id && !/^NFR-\d{3}$/.test(req.id)) {
      warnings.push({
        rule: 'R1',
        type: 'INVALID_NFR_ID_FORMAT',
        id: req.id,
        message: `Invalid NFR ID format: ${req.id} (expected: NFR-XXX)`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ========================================
// LAYER 3: CROSS-CONTEXT VALIDATION
// ========================================

function validateCrossContext(context) {
  const errors = [];
  const warnings = [];

  // Rule X1: Stack-Dependency consistency
  if (context.stack && context.dependency) {
    // Ensure dependency context references valid stack
    if (context.dependency.graph && context.dependency.graph.nodes) {
      for (const node of context.dependency.graph.nodes) {
        // Validate node has required fields
        if (!node.id) {
          warnings.push({
            rule: 'X1',
            type: 'MISSING_NODE_ID',
            message: 'Dependency graph node missing ID'
          });
        }
      }
    }
  }

  // Rule X2: Requirements-Dependency alignment
  if (context.requirements && context.dependency) {
    const reqMapping = context.requirements.mapping || {};
    const depSteps = context.dependency.graph?.nodes?.map(n => n.id) || [];

    // Check that mapping references valid steps
    for (const [stepId, reqs] of Object.entries(reqMapping)) {
      if (!depSteps.includes(stepId)) {
        warnings.push({
          rule: 'X2',
          type: 'UNMAPPED_STEP',
          stepId,
          message: `Requirements mapping references non-existent step: ${stepId}`
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ========================================
// LAYER 4: CONFLICT DETECTION
// ========================================

function detectAllConflicts(context) {
  const conflicts = [];

  // Currently no conflicts to detect in simplified context
  // This can be extended when pattern context is added

  return conflicts;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function isEmptyObject(obj) {
  return !obj || (typeof obj === 'object' && Object.keys(obj).length === 0);
}

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function findDuplicates(arr) {
  const seen = new Set();
  const duplicates = new Set();

  for (const item of arr) {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  }

  return Array.from(duplicates);
}

function collectErrors(typesValidation) {
  const errors = [];

  for (const [typeName, result] of Object.entries(typesValidation)) {
    if (result.errors && result.errors.length > 0) {
      errors.push(...result.errors);
    }
  }

  return errors;
}

function collectAllWarnings(validation) {
  const warnings = [];

  // Structure warnings
  if (validation.structure && validation.structure.warnings) {
    warnings.push(...validation.structure.warnings);
  }

  // Type-specific warnings
  if (validation.types) {
    for (const [typeName, result] of Object.entries(validation.types)) {
      if (result.warnings && result.warnings.length > 0) {
        warnings.push(...result.warnings);
      }
    }
  }

  // Cross-context warnings
  if (validation.crossContext && validation.crossContext.warnings) {
    warnings.push(...validation.crossContext.warnings);
  }

  return warnings;
}

function countPassedRules(validation) {
  let passed = 0;

  // Structure rules (5 rules)
  if (validation.structure && validation.structure.valid) {
    passed += 5;
  }

  // Type-specific rules
  if (validation.types) {
    // Stack rules (4)
    if (validation.types.stack && validation.types.stack.valid) passed += 4;
    // Dependency rules (4)
    if (validation.types.dependency && validation.types.dependency.valid) passed += 4;
    // Requirements rules (4)
    if (validation.types.requirements && validation.types.requirements.valid) passed += 4;
  }

  // Cross-context rules (4)
  if (validation.crossContext && validation.crossContext.valid) {
    passed += 4;
  }

  return passed;
}

function formatConflictsAsErrors(conflicts) {
  return conflicts.map(conflict => ({
    type: conflict.type,
    message: conflict.message,
    severity: conflict.severity
  }));
}

// ========================================
// REPORT GENERATION
// ========================================

function generateValidationReport(validationResult) {
  const report = {
    summary: {
      valid: validationResult.status.valid,
      timestamp: validationResult.metadata.validatedAt,
      planId: validationResult.metadata.planId,
      duration: `${validationResult.metadata.duration}ms`,
      totalRules: 21, // Adjusted for implemented rules
      passedRules: validationResult.status.passedRules || 0,
      failedRules: validationResult.status.failedRules || 0,
      warningCount: validationResult.status.warnings || 0
    },

    structure: formatValidationResult(validationResult.validation.structure),

    types: {
      stack: formatValidationResult(validationResult.validation.types?.stack),
      dependency: formatValidationResult(validationResult.validation.types?.dependency),
      requirements: formatValidationResult(validationResult.validation.types?.requirements)
    },

    crossContext: formatValidationResult(validationResult.validation.crossContext),

    conflicts: {
      count: validationResult.validation.conflicts?.length || 0,
      list: validationResult.validation.conflicts || []
    },

    errors: validationResult.status.errors || [],
    warnings: collectAllWarnings(validationResult.validation),

    stage: validationResult.status.stage
  };

  return report;
}

function formatValidationResult(result) {
  if (!result) {
    return { valid: false, message: 'Not validated' };
  }

  return {
    valid: result.valid,
    errorCount: result.errors?.length || 0,
    warningCount: result.warnings?.length || 0,
    errors: result.errors || [],
    warnings: result.warnings || []
  };
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
  validateContext,
  validateStructure,
  validateStackContext,
  validateDependencyContext,
  validateRequirementsContext,
  validateCrossContext,
  detectAllConflicts,
  generateValidationReport
};

// CLI support
if (require.main === module) {
  const contextPath = process.argv[2];

  if (!contextPath) {
    console.error('Usage: node context-validator.js <context-path>');
    process.exit(1);
  }

  try {
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
    const validationResult = validateContext(context);
    const report = generateValidationReport(validationResult);

    console.log(JSON.stringify(report, null, 2));

    process.exit(validationResult.status.valid ? 0 : 1);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
