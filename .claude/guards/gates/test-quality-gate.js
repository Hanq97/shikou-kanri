'use strict';

/**
 * test-quality-gate.js — Quality gate for test code quality.
 *
 * Layer: L4 GUARD
 * Pattern: Gate pattern (E-DD-05)
 *
 * Detects test smells:
 *   1. Empty tests (no assertions)
 *   2. No assertions in test block
 *   3. Hardcoded values (magic numbers/strings)
 *   4. Duplicate test names
 */

/**
 * Check test file quality for common test smells.
 *
 * @param {object[]} testFiles - Array of { path, content } from TestFile schema
 * @param {object} [qualityCriteria] - { minAssertionsPerTest, maxHardcodedValues }
 * @returns {{ passed: boolean, details: object[], score: number }}
 */
function checkQuality(testFiles, qualityCriteria) {
  qualityCriteria = qualityCriteria || {};
  const minAssertions = qualityCriteria.minAssertionsPerTest || 1;
  const maxHardcoded = qualityCriteria.maxHardcodedValues || 10;

  const details = [];
  let totalSmells = 0;
  let totalTests = 0;

  for (const file of (testFiles || [])) {
    const content = file.content || '';
    const filePath = file.path || 'unknown';
    const fileSmells = [];

    // 1. Empty tests (test blocks with no body)
    const emptyTests = _detectEmptyTests(content);
    if (emptyTests.length > 0) {
      fileSmells.push({ smell: 'empty-test', count: emptyTests.length, locations: emptyTests });
      totalSmells += emptyTests.length;
    }

    // 2. No assertions
    const noAssertTests = _detectNoAssertions(content);
    if (noAssertTests.length > 0) {
      fileSmells.push({ smell: 'no-assertions', count: noAssertTests.length, locations: noAssertTests });
      totalSmells += noAssertTests.length;
    }

    // 3. Hardcoded values
    const hardcoded = _detectHardcodedValues(content);
    if (hardcoded > maxHardcoded) {
      fileSmells.push({ smell: 'hardcoded-values', count: hardcoded, threshold: maxHardcoded });
      totalSmells += 1;
    }

    // 4. Duplicate test names
    const duplicates = _detectDuplicateNames(content);
    if (duplicates.length > 0) {
      fileSmells.push({ smell: 'duplicate-names', count: duplicates.length, names: duplicates });
      totalSmells += duplicates.length;
    }

    // Count test blocks
    const testCount = _countTests(content);
    totalTests += testCount;

    details.push({
      file: filePath,
      testCount,
      smells: fileSmells,
      clean: fileSmells.length === 0,
    });
  }

  // Score: 1.0 = no smells, degrades per smell
  const score = totalTests > 0
    ? Math.max(0, Math.round((1 - totalSmells / totalTests) * 100) / 100)
    : 0;

  return {
    passed: totalSmells === 0,
    details,
    score,
  };
}

// ── Smell Detectors ──────────────────────────────────────────────────────────

function _detectEmptyTests(content) {
  const locations = [];

  // Java: @Test followed by empty method body
  const javaEmpty = content.match(/@Test\s+\w+\s+void\s+(\w+)\s*\(\s*\)\s*\{\s*\}/g) || [];
  for (const m of javaEmpty) {
    const name = m.match(/void\s+(\w+)/);
    if (name) locations.push(name[1]);
  }

  // JS: it('...', () => {})  or it('...', function() {})
  const jsEmpty = content.match(/it\s*\(\s*['"][^'"]+['"]\s*,\s*(?:\(\)\s*=>|function\s*\(\s*\))\s*\{\s*\}\s*\)/g) || [];
  for (const m of jsEmpty) {
    const name = m.match(/it\s*\(\s*['"]([^'"]+)['"]/);
    if (name) locations.push(name[1]);
  }

  return locations;
}

function _detectNoAssertions(content) {
  const locations = [];
  const assertionPatterns = /assert|expect|should|verify|assertThat/i;

  // Split by test blocks and check each
  // Java: @Test ... void methodName() { ... }
  const javaTests = content.match(/@Test[\s\S]*?void\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/g) || [];
  for (const block of javaTests) {
    const name = block.match(/void\s+(\w+)/);
    if (name && !assertionPatterns.test(block)) {
      locations.push(name[1]);
    }
  }

  // JS: it('name', () => { ... })
  const jsTests = content.match(/it\s*\(\s*['"]([^'"]+)['"][\s\S]*?\}\s*\)/g) || [];
  for (const block of jsTests) {
    const name = block.match(/it\s*\(\s*['"]([^'"]+)['"]/);
    if (name && !assertionPatterns.test(block)) {
      locations.push(name[1]);
    }
  }

  return locations;
}

function _detectHardcodedValues(content) {
  // Count magic numbers (excluding 0, 1, common constants)
  const numbers = (content.match(/(?<!=\s*)(?<!\w)\d{2,}(?!\w)/g) || [])
    .filter(n => !['10', '100', '200', '404', '500'].includes(n));

  // Count magic strings (long hardcoded strings, >20 chars)
  const strings = (content.match(/['"][^'"]{20,}['"]/g) || []);

  return numbers.length + strings.length;
}

function _detectDuplicateNames(content) {
  const names = [];

  // Java: @Test void methodName
  const javaMethods = content.match(/void\s+(\w+)\s*\(/g) || [];
  for (const m of javaMethods) {
    const name = m.match(/void\s+(\w+)/);
    if (name) names.push(name[1]);
  }

  // JS: it('name' or test('name'
  const jsNames = content.match(/(?:it|test)\s*\(\s*['"]([^'"]+)['"]/g) || [];
  for (const m of jsNames) {
    const name = m.match(/(?:it|test)\s*\(\s*['"]([^'"]+)['"]/);
    if (name) names.push(name[1]);
  }

  // Find duplicates
  const seen = new Set();
  const duplicates = [];
  for (const name of names) {
    if (seen.has(name)) duplicates.push(name);
    seen.add(name);
  }

  return [...new Set(duplicates)];
}

function _countTests(content) {
  const javaTests = (content.match(/@Test/g) || []).length;
  const jsTests = (content.match(/\bit\s*\(/g) || []).length;
  const jsTestFn = (content.match(/\btest\s*\(/g) || []).length;
  return javaTests + jsTests + jsTestFn;
}

module.exports = { checkQuality };
