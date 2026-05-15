/**
 * Code Quality Metrics Utility
 *
 * Calculates code quality metrics:
 * - Cyclomatic Complexity (decision points)
 * - Cognitive Complexity (human readability)
 * - Duplication Detection
 * - Maintainability Index
 *
 * Version: 1.0.0
 * Created: 2025-12-26
 */

/**
 * Calculate Cyclomatic Complexity (McCabe)
 * Formula: E - N + 2P (edges - nodes + 2 * connected components)
 * Simplified: Count decision points + 1
 *
 * @param {string} code - Source code to analyze
 * @returns {number} Cyclomatic complexity score
 */
function calculateCyclomaticComplexity(code) {
  // Decision keywords that increase complexity
  const decisionKeywords = [
    /\bif\b/g,           // if statement
    /\belse\s+if\b/g,   // else if
    /\bfor\b/g,         // for loop
    /\bwhile\b/g,       // while loop
    /\bcase\b/g,        // switch case
    /\bcatch\b/g,       // try-catch
    /\b\&\&\b/g,        // logical AND
    /\b\|\|\b/g,        // logical OR
    /\?\s*.*\s*:/g      // ternary operator
  ];

  let complexity = 1; // Base complexity

  decisionKeywords.forEach(keyword => {
    const matches = code.match(keyword);
    if (matches) {
      complexity += matches.length;
    }
  });

  return complexity;
}

/**
 * Calculate Cognitive Complexity (SonarSource)
 * More aligned with human perception of complexity
 *
 * @param {string} code - Source code to analyze
 * @returns {number} Cognitive complexity score
 */
function calculateCognitiveComplexity(code) {
  let complexity = 0;
  let nestingLevel = 0;

  // Split code into lines for analysis
  const lines = code.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Increment nesting for opening braces
    if (trimmed.includes('{')) {
      nestingLevel++;
    }

    // Check for complexity-increasing structures
    if (/\b(if|for|while|catch)\b/.test(trimmed)) {
      // Add base complexity + nesting penalty
      complexity += 1 + nestingLevel;
    }

    // Logical operators add complexity
    const andMatches = trimmed.match(/\&\&/g);
    const orMatches = trimmed.match(/\|\|/g);
    if (andMatches) complexity += andMatches.length;
    if (orMatches) complexity += orMatches.length;

    // Decrement nesting for closing braces
    if (trimmed.includes('}')) {
      nestingLevel = Math.max(0, nestingLevel - 1);
    }
  }

  return complexity;
}

/**
 * Detect code duplication
 * Finds repeated code blocks (≥5 lines)
 *
 * @param {string} code - Source code to analyze
 * @returns {Object} Duplication statistics
 */
function detectDuplication(code) {
  const lines = code.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const blockSize = 5; // Minimum duplicate block size
  const duplicates = [];

  for (let i = 0; i < lines.length - blockSize; i++) {
    const block = lines.slice(i, i + blockSize).join('\n');

    // Search for this block later in the code
    for (let j = i + blockSize; j < lines.length - blockSize; j++) {
      const compareBlock = lines.slice(j, j + blockSize).join('\n');

      if (block === compareBlock) {
        duplicates.push({
          firstOccurrence: i + 1,
          secondOccurrence: j + 1,
          lines: blockSize,
          code: block.substring(0, 50) + '...'
        });
      }
    }
  }

  const totalLines = lines.length;
  const duplicatedLines = duplicates.length * blockSize;
  const duplicationPercentage = totalLines > 0 ? (duplicatedLines / totalLines * 100).toFixed(2) : 0;

  return {
    duplicates,
    totalDuplicates: duplicates.length,
    duplicatedLines,
    duplicationPercentage: parseFloat(duplicationPercentage)
  };
}

/**
 * Calculate Maintainability Index (MI)
 * Formula: 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code)
 * Simplified version using approximations
 *
 * @param {string} code - Source code to analyze
 * @returns {number} Maintainability Index (0-100, higher is better)
 */
function calculateMaintainabilityIndex(code) {
  const lines = code.split('\n').filter(line => line.trim().length > 0);
  const linesOfCode = lines.length;

  if (linesOfCode === 0) return 100;

  const cyclomaticComplexity = calculateCyclomaticComplexity(code);
  const cognitiveComplexity = calculateCognitiveComplexity(code);

  // Simplified MI formula
  // MI = 171 - 5.2 * ln(Volume) - 0.23 * CC - 16.2 * ln(LOC)
  // Approximation: Volume ≈ LOC * 10 (operators + operands)

  const volume = linesOfCode * 10;
  const mi = 171
    - 5.2 * Math.log(volume)
    - 0.23 * cyclomaticComplexity
    - 16.2 * Math.log(linesOfCode);

  // Normalize to 0-100 scale
  const normalized = Math.max(0, Math.min(100, mi));

  return Math.round(normalized);
}

/**
 * Comprehensive code quality analysis
 *
 * @param {string} code - Source code to analyze
 * @returns {Object} Quality metrics report
 */
function analyzeCodeQuality(code) {
  const cyclomaticComplexity = calculateCyclomaticComplexity(code);
  const cognitiveComplexity = calculateCognitiveComplexity(code);
  const duplication = detectDuplication(code);
  const maintainabilityIndex = calculateMaintainabilityIndex(code);

  // Quality assessment
  const assessment = {
    cyclomaticComplexity: {
      value: cyclomaticComplexity,
      status: cyclomaticComplexity <= 10 ? 'PASS' : 'FAIL',
      message: cyclomaticComplexity <= 10
        ? 'Complexity is acceptable (≤10)'
        : `Complexity too high (${cyclomaticComplexity} > 10). Consider refactoring.`
    },
    cognitiveComplexity: {
      value: cognitiveComplexity,
      status: cognitiveComplexity <= 7 ? 'PASS' : 'FAIL',
      message: cognitiveComplexity <= 7
        ? 'Cognitive complexity is acceptable (≤7)'
        : `Cognitive complexity too high (${cognitiveComplexity} > 7). Hard to understand.`
    },
    duplication: {
      percentage: duplication.duplicationPercentage,
      status: duplication.duplicationPercentage < 5 ? 'PASS' : 'FAIL',
      message: duplication.duplicationPercentage < 5
        ? 'Low duplication (<5%)'
        : `High duplication (${duplication.duplicationPercentage}%). Extract common logic.`
    },
    maintainabilityIndex: {
      value: maintainabilityIndex,
      status: maintainabilityIndex >= 65 ? 'PASS' : 'FAIL',
      message: maintainabilityIndex >= 65
        ? 'Good maintainability (≥65)'
        : `Low maintainability (${maintainabilityIndex} < 65). Needs refactoring.`
    }
  };

  // Overall quality score (average of pass/fail)
  const passCount = Object.values(assessment).filter(a => a.status === 'PASS').length;
  const overallScore = (passCount / 4 * 100).toFixed(0);

  return {
    metrics: {
      cyclomaticComplexity,
      cognitiveComplexity,
      duplicationPercentage: duplication.duplicationPercentage,
      maintainabilityIndex
    },
    assessment,
    overallScore: parseInt(overallScore),
    overallStatus: overallScore >= 75 ? 'PASS' : 'FAIL'
  };
}

module.exports = {
  calculateCyclomaticComplexity,
  calculateCognitiveComplexity,
  detectDuplication,
  calculateMaintainabilityIndex,
  analyzeCodeQuality
};
