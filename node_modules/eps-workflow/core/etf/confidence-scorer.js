'use strict';

/**
 * confidence-scorer.js — Hybrid Multi-Signal confidence scoring engine.
 *
 * DD Decision D20: rules 80% + LLM 20% (cost-optimized).
 * LLM invoked ONLY when ruleScore in [0.50, 0.80] range.
 *
 * Thresholds:
 *   HIGH    ≥ 0.80
 *   MEDIUM  ≥ 0.50
 *   LOW     < 0.50
 *
 * DD Confidence:
 *   EXTRACTED ≥ 90%
 *   INFERRED  55-75%
 *   MISSING   < 55%
 */

// ── Test Quality Scoring ─────────────────────────────────────────────────────

/**
 * Score test file quality using hybrid multi-signal approach.
 *
 * @param {string} testContent  - Test file source code
 * @param {string} targetClass  - Source class being tested
 * @param {object} [options]
 * @param {boolean} [options.llmEnabled]  - Enable LLM signal (default: false)
 * @param {string}  [options.specialistTemplate] - Specialist content for pattern check
 * @param {string[]} [options.targetMethods] - All methods in target class
 * @returns {{ score: number, level: string, signals: object }}
 */
function scoreTestQuality(testContent, targetClass, options) {
  options = options || {};

  const signals = {
    assertion: calculateAssertionScore(testContent),
    pattern: calculatePatternCompliance(testContent, options.specialistTemplate || ''),
    astCoverage: calculateASTCoverage(
      _extractTestedMethods(testContent),
      options.targetMethods || []
    ),
    naming: calculateNamingScore(testContent),
  };

  // Rule-based composite: weighted sum
  const ruleScore =
    signals.assertion * 0.25 +
    signals.pattern * 0.25 +
    signals.astCoverage * 0.20 +
    signals.naming * 0.10;

  // Coverage weight (0.20) applied to astCoverage since it's the most important structural signal
  const baseScore = ruleScore + signals.astCoverage * 0.20;

  let finalScore = baseScore;
  let llmScore = null;

  // LLM invoked ONLY for borderline range [0.50, 0.80]
  if (options.llmEnabled && baseScore >= 0.50 && baseScore <= 0.80) {
    llmScore = _assessBusinessLogicSync(testContent, targetClass);
    if (llmScore !== null) {
      finalScore = baseScore * 0.80 + llmScore * 0.20;
    }
  }

  const level = finalScore >= 0.80 ? 'HIGH' : finalScore >= 0.50 ? 'MEDIUM' : 'LOW';

  return {
    score: Math.round(finalScore * 100) / 100,
    level,
    signals: {
      assertion: signals.assertion,
      pattern: signals.pattern,
      astCoverage: signals.astCoverage,
      naming: signals.naming,
      ruleScore: Math.round(baseScore * 100) / 100,
      llmScore,
    },
  };
}

// ── DD Section Confidence Scoring ────────────────────────────────────────────

/**
 * Score a reverse-DD section's confidence level.
 *
 * @param {string} sectionContent - Section markdown content
 * @param {object} sourceEvidence - { extractedCount, inferredCount, totalFields }
 * @returns {{ level: string, confidence: number }}
 */
function scoreDDSection(sectionContent, sourceEvidence) {
  sourceEvidence = sourceEvidence || {};

  const extractedCount = sourceEvidence.extractedCount || 0;
  const totalFields = sourceEvidence.totalFields || 1;

  // Base confidence from extraction ratio
  const extractionRatio = extractedCount / totalFields;
  let confidence = Math.round(extractionRatio * 100);

  // Boost for content richness
  const lines = (sectionContent || '').split('\n').filter(l => l.trim()).length;
  if (lines > 10) confidence = Math.min(100, confidence + 5);

  // Penalty for TODO/placeholder markers
  const todoCount = ((sectionContent || '').match(/TODO|FIXME|PLACEHOLDER|\?\?\?/gi) || []).length;
  confidence = Math.max(0, confidence - todoCount * 10);

  const level = confidence >= 90 ? 'EXTRACTED' : confidence >= 55 ? 'INFERRED' : 'MISSING';

  return { level, confidence };
}

// ── Rule-Based Signal Calculators ────────────────────────────────────────────

/**
 * Calculate assertion density score.
 * Checks: assert/expect count, variety of assertion types.
 */
function calculateAssertionScore(testContent) {
  if (!testContent) return 0;

  const assertPatterns = [
    /assert\w*\s*\(/gi,
    /assert\.\w+\s*\(/gi,
    /expect\s*\(/gi,
    /\.should\b/gi,
    /assertThat\s*\(/gi,
    /assertEquals\s*\(/gi,
    /verify\s*\(/gi,
  ];

  let totalAssertions = 0;
  const typesUsed = new Set();

  for (let i = 0; i < assertPatterns.length; i++) {
    const matches = testContent.match(assertPatterns[i]) || [];
    if (matches.length > 0) {
      totalAssertions += matches.length;
      typesUsed.add(i);
    }
  }

  // Count test methods/blocks
  const testBlocks = (
    testContent.match(/@Test\b/g) ||
    testContent.match(/\bit\s*\(/g) ||
    testContent.match(/\btest\s*\(/g) ||
    []
  ).length || 1;

  const avgAssertions = totalAssertions / testBlocks;

  // Score: 0-1 based on assertions per test and type variety
  let score = 0;
  if (avgAssertions >= 3) score = 1.0;
  else if (avgAssertions >= 2) score = 0.8;
  else if (avgAssertions >= 1) score = 0.5;
  else score = 0.1;

  // Bonus for assertion variety (max +0.1)
  if (typesUsed.size >= 3) score = Math.min(1.0, score + 0.1);

  return Math.round(score * 100) / 100;
}

/**
 * Calculate pattern compliance against specialist template.
 */
function calculatePatternCompliance(testContent, specialistTemplate) {
  if (!testContent || !specialistTemplate) return 0.5; // neutral if no template

  const patterns = _extractPatternKeywords(specialistTemplate);
  if (patterns.length === 0) return 0.5;

  let matched = 0;
  for (const pattern of patterns) {
    if (testContent.includes(pattern)) matched++;
  }

  return Math.round((matched / patterns.length) * 100) / 100;
}

/**
 * Calculate AST coverage: tested methods / total methods.
 */
function calculateASTCoverage(testedMethods, totalMethods) {
  if (!Array.isArray(totalMethods) || totalMethods.length === 0) return 0.5; // neutral
  if (!Array.isArray(testedMethods)) return 0;

  const testedSet = new Set(testedMethods.map(m => m.toLowerCase()));
  let covered = 0;
  for (const method of totalMethods) {
    if (testedSet.has(method.toLowerCase())) covered++;
  }

  return Math.round((covered / totalMethods.length) * 100) / 100;
}

/**
 * Calculate test naming convention score.
 */
function calculateNamingScore(testContent) {
  if (!testContent) return 0;

  // Detect naming patterns
  const goodPatterns = [
    /test_\w+_\w+_\w+/g,             // test_{method}_{scenario}_{expected}
    /should\w+When\w+/g,              // shouldReturnXWhenY
    /it\s*\(\s*['"]should\s/g,        // it('should ...'
    /\bdescribe\s*\(\s*['"][A-Z]/g,   // describe('ClassName'
  ];

  let goodCount = 0;
  for (const pattern of goodPatterns) {
    const matches = testContent.match(pattern) || [];
    goodCount += matches.length;
  }

  // Detect bad patterns
  const badPatterns = [
    /test\d+\s*\(/g,                  // test1(), test2()
    /\bit\s*\(\s*['"]test\d/g,        // it('test1 ...'
  ];

  let badCount = 0;
  for (const pattern of badPatterns) {
    const matches = testContent.match(pattern) || [];
    badCount += matches.length;
  }

  const total = goodCount + badCount;
  if (total === 0) return 0.5; // neutral

  return Math.round((goodCount / total) * 100) / 100;
}

// ── LLM Signal (placeholder — actual impl in SP-3) ──────────────────────────

/**
 * Assess business logic coverage using LLM.
 * Returns null if LLM unavailable.
 */
function assessBusinessLogicCoverage(testFile, targetClass) {
  // Placeholder: actual LLM integration in SP-3 multi-model coordinator
  return { score: null, reasoning: 'LLM assessment not yet available (SP-3)' };
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

function _extractTestedMethods(testContent) {
  if (!testContent) return [];

  const methods = new Set();

  // Java: method references in test names
  const javaPatterns = testContent.match(/test_(\w+)_/g) || [];
  for (const p of javaPatterns) {
    const m = p.match(/test_(\w+)_/);
    if (m) methods.add(m[1]);
  }

  // JS/TS: method references in describe/it blocks
  const jsPatterns = testContent.match(/['"](\w+)\s+should/g) || [];
  for (const p of jsPatterns) {
    const m = p.match(/['"](\w+)\s+should/);
    if (m) methods.add(m[1]);
  }

  // Direct method call patterns
  const callPatterns = testContent.match(/\.(\w+)\s*\(/g) || [];
  for (const p of callPatterns) {
    const m = p.match(/\.(\w+)\s*\(/);
    if (m && !['describe', 'it', 'test', 'expect', 'assert', 'mock', 'spy', 'fn', 'before', 'after', 'each'].includes(m[1])) {
      methods.add(m[1]);
    }
  }

  return [...methods];
}

function _extractPatternKeywords(template) {
  const keywords = new Set();

  // Extract annotation patterns (Java)
  const annotations = template.match(/@\w+/g) || [];
  for (const a of annotations) keywords.add(a);

  // Extract import patterns
  const imports = template.match(/import\s+\{([^}]+)\}/g) || [];
  for (const imp of imports) {
    const m = imp.match(/import\s+\{([^}]+)\}/);
    if (m) {
      m[1].split(',').forEach(k => {
        const trimmed = k.trim();
        if (trimmed) keywords.add(trimmed);
      });
    }
  }

  // Extract class/function names
  const classes = template.match(/(?:class|function)\s+(\w+)/g) || [];
  for (const c of classes) {
    const m = c.match(/(?:class|function)\s+(\w+)/);
    if (m) keywords.add(m[1]);
  }

  return [...keywords];
}

function _assessBusinessLogicSync(testContent, targetClass) {
  // Placeholder: returns null (LLM not available in SP-1)
  return null;
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  scoreTestQuality,
  scoreDDSection,
  calculateAssertionScore,
  calculatePatternCompliance,
  calculateASTCoverage,
  calculateNamingScore,
  assessBusinessLogicCoverage,
};
