/**
 * Execute Pattern Learning Integration
 * Week 15 - Day 6: Pattern Learning Integration with Week 6
 *
 * Integrates Week 6 Pattern Learning with /execute command.
 * Extracts patterns from successful executions and updates Knowledge Base.
 */

const path = require('path');

// Import Week 6 pattern utilities
const PatternExtractor = require('../pattern/pattern-extractor');
const { PatternStorage } = require('../pattern/pattern-storage');
const KBUpdater = require('../knowledge-base/kb-updater');

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const PATTERN_EXTRACTION_THRESHOLD = {
  minConfidence: 90,          // Minimum plan confidence to extract patterns
  minQualityGates: 6,         // All quality gates must pass
  requireSuccess: true         // Execution must be successful
};

// KB paths resolved dynamically via StackManager + KBUpdater
// Legacy KB_PATH_MAP removed - now uses variant-aware resolution

// ============================================
// PATTERN EXTRACTION FROM EXECUTION
// ============================================

/**
 * Extract patterns from successful execution
 *
 * @param {Object} executionResult - Result from Days 3-5
 * @param {Object} context - Validated context
 * @returns {Object} - Extraction result
 */
function extractPatternsFromExecution(executionResult, context) {
  // Validate extraction threshold
  if (!shouldExtractPatterns(executionResult, context)) {
    return {
      extracted: 0,
      patterns: [],
      reason: 'Does not meet extraction threshold'
    };
  }

  const patterns = [];

  // Extract code patterns from generated code
  if (executionResult.code) {
    const codePatterns = extractCodePatterns(executionResult.code, context);
    patterns.push(...codePatterns);
  }

  // Extract test patterns from generated tests
  if (executionResult.tests) {
    const testPatterns = extractTestPatterns(executionResult.tests, context);
    patterns.push(...testPatterns);
  }

  // Extract quality gate patterns
  if (executionResult.qualityGates) {
    const qgPatterns = extractQualityGatePatterns(executionResult.qualityGates, context);
    patterns.push(...qgPatterns);
  }

  // Extract template patterns
  if (executionResult.templateUsed) {
    const templatePatterns = extractTemplatePatterns(executionResult.templateUsed, context);
    patterns.push(...templatePatterns);
  }

  return {
    extracted: patterns.length,
    patterns: patterns,
    confidence: calculatePatternsConfidence(patterns)
  };
}

/**
 * Check if patterns should be extracted from this execution
 */
function shouldExtractPatterns(executionResult, context) {
  // Must be successful
  if (!executionResult.success) {
    return false;
  }

  // Must meet confidence threshold
  const confidence = context.confidence || 0;
  if (confidence < PATTERN_EXTRACTION_THRESHOLD.minConfidence) {
    return false;
  }

  // All quality gates must be present (at least 6 gates)
  if (executionResult.qualityGates) {
    const gateCount = Object.keys(executionResult.qualityGates).length;

    if (gateCount < PATTERN_EXTRACTION_THRESHOLD.minQualityGates) {
      return false;
    }

    // Check if all gates have successful results
    const allSuccess =
      (executionResult.qualityGates.G1?.valid === true) &&
      (executionResult.qualityGates.G2?.valid === true) &&
      (executionResult.qualityGates.G3?.testCount > 0) &&
      (executionResult.qualityGates.G4?.allPassed === true) &&
      (executionResult.qualityGates.G5?.lineCoverage >= 80) &&
      (executionResult.qualityGates.G6?.passed === true);

    if (!allSuccess) {
      return false;
    }
  }

  return true;
}

/**
 * Extract code patterns from generated code
 */
function extractCodePatterns(code, context) {
  const patterns = [];
  const language = context.stack?.stack || 'unknown';

  // Pattern 1: Class structure
  const classPattern = extractClassStructurePattern(code, language);
  if (classPattern) {
    patterns.push(classPattern);
  }

  // Pattern 2: Dependency injection
  const diPattern = extractDependencyInjectionPattern(code, language);
  if (diPattern) {
    patterns.push(diPattern);
  }

  // Pattern 3: Error handling
  const errorPattern = extractErrorHandlingPattern(code, language);
  if (errorPattern) {
    patterns.push(errorPattern);
  }

  return patterns;
}

/**
 * Extract class structure pattern
 */
function extractClassStructurePattern(code, language) {
  // TypeScript/Java class pattern
  const classMatch = code.match(/export\s+class\s+(\w+)|public\s+class\s+(\w+)/);
  if (!classMatch) return null;

  const className = classMatch[1] || classMatch[2];

  // Extract methods
  const methods = [];
  const methodRegex = /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)/g;
  let match;
  while ((match = methodRegex.exec(code)) !== null) {
    methods.push(match[1]);
  }

  return {
    type: 'architecture',
    category: 'class-structure',
    name: `${className} Class Pattern`,
    description: `Class structure pattern for ${className}`,
    language: language,
    frequency: 1,
    examples: [{
      className: className,
      methods: methods,
      code: code.substring(0, 200) + '...'  // First 200 chars
    }],
    source: 'execute-generation',
    learnedFrom: ['execute-day-6']
  };
}

/**
 * Extract dependency injection pattern
 */
function extractDependencyInjectionPattern(code, language) {
  // Check for constructor injection
  const constructorMatch = code.match(/constructor\s*\(([^)]+)\)/);
  if (!constructorMatch) return null;

  const params = constructorMatch[1];
  if (!params.includes(':') && !params.includes('private') && !params.includes('readonly')) {
    return null;  // Not DI pattern
  }

  return {
    type: 'backend',
    category: 'dependency-injection',
    name: 'Constructor Injection Pattern',
    description: 'Constructor-based dependency injection',
    language: language,
    frequency: 1,
    examples: [{
      pattern: 'constructor(private readonly dep: Type)',
      code: constructorMatch[0]
    }],
    source: 'execute-generation',
    learnedFrom: ['execute-day-6']
  };
}

/**
 * Extract error handling pattern
 */
function extractErrorHandlingPattern(code, language) {
  // Check for try-catch blocks
  const hasTryCatch = code.includes('try') && code.includes('catch');
  if (!hasTryCatch) return null;

  return {
    type: 'implementation',
    category: 'error-handling',
    name: 'Try-Catch Error Handling',
    description: 'Try-catch block for error handling',
    language: language,
    frequency: 1,
    examples: [{
      pattern: 'try { ... } catch (error) { ... }'
    }],
    source: 'execute-generation',
    learnedFrom: ['execute-day-6']
  };
}

/**
 * Extract test patterns from generated tests
 */
function extractTestPatterns(tests, context) {
  const patterns = [];
  const language = context.stack?.stack || 'unknown';

  // Pattern: Test structure
  const testStructurePattern = {
    type: 'testing',
    category: 'test-structure',
    name: 'Unit Test Structure',
    description: 'Standard unit test structure',
    language: language,
    frequency: 1,
    examples: [{
      hasDescribe: tests.includes('describe'),
      hasIt: tests.includes('it') || tests.includes('test'),
      hasExpect: tests.includes('expect') || tests.includes('assert')
    }],
    source: 'execute-generation',
    learnedFrom: ['execute-day-6']
  };

  patterns.push(testStructurePattern);

  return patterns;
}

/**
 * Extract quality gate patterns
 */
function extractQualityGatePatterns(qualityGates, context) {
  const patterns = [];

  // Pattern: Quality gate success criteria
  const qgPattern = {
    type: 'implementation',
    category: 'quality-gates',
    name: 'Quality Gate Success Pattern',
    description: 'Successful quality gate execution',
    frequency: 1,
    examples: [{
      G1: qualityGates.G1?.valid,
      G2: qualityGates.G2?.valid,
      G3: qualityGates.G3?.testCount,
      G4: qualityGates.G4?.allPassed,
      G5: qualityGates.G5?.lineCoverage,
      G6: qualityGates.G6?.passed
    }],
    source: 'execute-generation',
    learnedFrom: ['execute-day-6']
  };

  patterns.push(qgPattern);

  return patterns;
}

/**
 * Extract template patterns
 */
function extractTemplatePatterns(templateUsed, context) {
  const patterns = [];

  if (templateUsed) {
    const templatePattern = {
      type: 'implementation',
      category: 'template-usage',
      name: 'Template Generation Pattern',
      description: 'Template-based code generation',
      frequency: 1,
      examples: [{ template: templateUsed }],
      source: 'execute-generation',
      learnedFrom: ['execute-day-6']
    };

    patterns.push(templatePattern);
  }

  return patterns;
}

/**
 * Calculate patterns confidence score
 */
function calculatePatternsConfidence(patterns) {
  if (patterns.length === 0) return 0;

  // Simple average of pattern frequencies
  const totalFrequency = patterns.reduce((sum, p) => sum + (p.frequency || 1), 0);
  const avgFrequency = totalFrequency / patterns.length;

  // Normalize to 0-100 scale (frequency 1-5 -> 80-100%)
  const confidence = Math.min(100, 80 + (avgFrequency - 1) * 5);

  return Math.round(confidence);
}

// ============================================
// KNOWLEDGE BASE UPDATE
// ============================================

/**
 * Update Knowledge Base with learned patterns
 * Uses KBUpdater for proper backup, versioning, and duplicate prevention
 *
 * @param {Array} patterns - Extracted patterns
 * @param {Object} context - Stack context
 * @returns {Object} - Update result
 */
async function updateKnowledgeBase(patterns, context) {
  if (!patterns || patterns.length === 0) {
    return {
      updated: false,
      reason: 'No patterns to update',
      newPatterns: 0
    };
  }

  const kbUpdater = new KBUpdater(path.join(__dirname, '../knowledge-base'));
  let totalUpdated = 0;
  const updateResults = [];

  try {
    // Create backup before updates
    await kbUpdater.createBackup();

    // Group patterns by category
    const backendPatterns = patterns.filter(p => p.type === 'backend' || p.category?.includes('class'));
    const frontendPatterns = patterns.filter(p => p.type === 'frontend');
    const databasePatterns = patterns.filter(p => p.type === 'database');

    // Update backend KB via KBUpdater
    if (backendPatterns.length > 0) {
      const result = await kbUpdater.updateBackendKB(backendPatterns);
      totalUpdated += result.patternsAdded;
      updateResults.push(result);
    }

    // Update frontend KB via KBUpdater
    if (frontendPatterns.length > 0) {
      const result = await kbUpdater.updateFrontendKB(frontendPatterns);
      totalUpdated += result.patternsAdded;
      updateResults.push(result);
    }

    // Update database KB via KBUpdater
    if (databasePatterns.length > 0) {
      const result = await kbUpdater.updateDatabaseKB(databasePatterns);
      totalUpdated += result.patternsAdded;
      updateResults.push(result);
    }
  } catch (error) {
    console.warn(`Warning: KBUpdater failed: ${error.message}`);
  }

  // Store all patterns using PatternStorage
  const patternStorage = new PatternStorage();
  patternStorage.savePatterns(patterns, {
    source: 'execute-generation',
    stack: context.stack?.stack || 'unknown',
    extractedAt: new Date().toISOString()
  }).then(() => {
    console.log(`✅ Patterns saved to storage: ${patterns.length} patterns`);
  }).catch(error => {
    console.warn(`Warning: Could not save patterns to storage: ${error.message}`);
  });

  return {
    updated: totalUpdated > 0,
    newPatterns: totalUpdated,
    results: updateResults,
    totalPatterns: patterns.length
  };
}

// ============================================
// PATTERN VALIDATION
// ============================================

/**
 * Validate patterns before adding to KB
 *
 * @param {Array} patterns - Patterns to validate
 * @returns {Object} - Validation result
 */
function validatePatterns(patterns) {
  const errors = [];
  const warnings = [];
  const valid = [];

  for (const pattern of patterns) {
    const validation = validateSinglePattern(pattern);

    if (validation.errors.length > 0) {
      errors.push({
        pattern: pattern.name,
        errors: validation.errors
      });
    } else {
      valid.push(pattern);
    }

    if (validation.warnings.length > 0) {
      warnings.push({
        pattern: pattern.name,
        warnings: validation.warnings
      });
    }
  }

  return {
    valid: errors.length === 0,
    validPatterns: valid,
    errors: errors,
    warnings: warnings,
    validCount: valid.length,
    errorCount: errors.length
  };
}

/**
 * Validate single pattern
 */
function validateSinglePattern(pattern) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!pattern.name) {
    errors.push('Missing pattern name');
  }
  if (!pattern.type) {
    errors.push('Missing pattern type');
  }
  if (!pattern.category) {
    errors.push('Missing pattern category');
  }

  // Frequency validation
  if (pattern.frequency && pattern.frequency < 1) {
    errors.push('Frequency must be >= 1');
  }

  // Examples validation
  if (!pattern.examples || pattern.examples.length === 0) {
    warnings.push('No examples provided');
  }

  return { errors, warnings };
}

/**
 * Detect conflicts with existing KB patterns
 *
 * @param {Array} newPatterns - New patterns to add
 * @param {Object} existingKB - Existing KB data
 * @returns {Object} - Conflict detection result
 */
function detectPatternConflicts(newPatterns, existingKB) {
  const conflicts = [];

  for (const newPattern of newPatterns) {
    for (const existingPattern of existingKB.patterns || []) {
      // Check for name conflicts
      if (newPattern.name === existingPattern.name) {
        // Check if they're actually different
        if (newPattern.category !== existingPattern.category ||
            newPattern.type !== existingPattern.type) {
          conflicts.push({
            type: 'name-conflict',
            pattern: newPattern.name,
            newCategory: newPattern.category,
            existingCategory: existingPattern.category,
            resolution: 'merge-or-rename'
          });
        }
      }
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts: conflicts,
    conflictCount: conflicts.length
  };
}

// ============================================
// INTEGRATION HELPERS
// ============================================

/**
 * Execute pattern learning workflow
 * (Integrates Days 3-5 with pattern learning)
 *
 * @param {Object} executionResult - Result from Days 3-5
 * @param {Object} context - Validated context
 * @returns {Object} - Pattern learning result
 */
function executePatternLearningWorkflow(executionResult, context) {
  const result = {
    step: 'pattern-learning',
    extracted: 0,
    validated: 0,
    updated: false,
    patterns: [],
    errors: []
  };

  try {
    // Step 1: Extract patterns
    const extraction = extractPatternsFromExecution(executionResult, context);
    result.extracted = extraction.extracted;
    result.patterns = extraction.patterns;

    if (extraction.extracted === 0) {
      result.errors.push(extraction.reason || 'No patterns extracted');
      return result;
    }

    // Step 2: Validate patterns
    const validation = validatePatterns(extraction.patterns);
    result.validated = validation.validCount;

    if (!validation.valid) {
      result.errors.push(...validation.errors.map(e => e.errors.join(', ')));
      return result;
    }

    // Step 3: Update KB
    const update = updateKnowledgeBase(validation.validPatterns, context);
    result.updated = update.updated;
    result.newPatterns = update.newPatterns;

    return result;

  } catch (error) {
    result.errors.push(`Pattern learning failed: ${error.message}`);
    return result;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Core functions
  extractPatternsFromExecution,
  updateKnowledgeBase,
  validatePatterns,
  detectPatternConflicts,

  // Integration
  executePatternLearningWorkflow,

  // Helpers
  shouldExtractPatterns,
  calculatePatternsConfidence,

  // For testing
  extractCodePatterns,
  extractTestPatterns,
  extractQualityGatePatterns
};
