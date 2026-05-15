'use strict';

/**
 * specialist-validator.js — Quality gate for specialist files.
 *
 * Layer: L4 GUARD
 * Pattern: Gate pattern (E-DD-05)
 *
 * Checks Q1-Q4 gates per specialist:
 *   Q1: Evidence references present (YAML evidence[] field)
 *   Q2: ID unique across all specialists
 *   Q3: Bilingual content (Japanese title ≥1 line)
 *   Q4: test-plan → interfaces only (no implementation code)
 *       code-gen → MUST have code templates with ${placeholder}
 */

const fs = require('fs');
const path = require('path');

/**
 * Validate a single specialist file.
 *
 * @param {string} filePath - Absolute path to specialist .md file
 * @param {Set<string>} [seenIds] - Set of already-seen IDs for uniqueness check
 * @returns {{ passed: boolean, errors: string[] }}
 */
function validateSpecialist(filePath, seenIds) {
  seenIds = seenIds || new Set();
  const errors = [];

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return { passed: false, errors: ['File not readable: ' + filePath] };
  }

  const yaml = _extractYaml(content);

  // Q1: Evidence references
  if (!yaml.evidence || yaml.evidence === '[]' || yaml.evidence === '') {
    errors.push('Q1: Missing evidence references in YAML metadata');
  }

  // Q2: Unique ID
  if (!yaml.id) {
    errors.push('Q2: Missing id in YAML metadata');
  } else if (seenIds.has(yaml.id)) {
    errors.push('Q2: Duplicate id "' + yaml.id + '"');
  } else {
    seenIds.add(yaml.id);
  }

  // Q3: Bilingual content (at least 1 Japanese line)
  const q3Result = checkQ3(content);
  if (!q3Result.passed) {
    errors.push('Q3: ' + q3Result.reason);
  }

  // Q4: Category-specific content check
  const category = yaml.category || _inferCategory(filePath);
  const q4Result = checkQ4(content, category);
  if (!q4Result.passed) {
    errors.push('Q4: ' + q4Result.reason);
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Validate all specialist files under a base directory.
 *
 * @param {string} [baseDir] - Base directory to scan (default: 'specialists/')
 * @returns {{ passed: boolean, total: number, valid: number, invalid: number, details: object[] }}
 */
function validateAll(baseDir) {
  baseDir = baseDir || 'specialists/';
  const seenIds = new Set();
  const details = [];
  let valid = 0;
  let invalid = 0;

  const files = _findSpecialistFiles(baseDir);

  for (const file of files) {
    const result = validateSpecialist(file, seenIds);
    details.push({ file, ...result });
    if (result.passed) {
      valid++;
    } else {
      invalid++;
    }
  }

  return {
    passed: invalid === 0,
    total: files.length,
    valid,
    invalid,
    details,
  };
}

/**
 * Check Q3: Bilingual content.
 * Requires at least 1 line with Japanese characters.
 *
 * @param {string} content
 * @returns {{ passed: boolean, reason?: string }}
 */
function checkQ3(content) {
  if (!content) return { passed: false, reason: 'Empty content' };

  // Check for Japanese characters (Hiragana, Katakana, Kanji)
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
  if (!japanesePattern.test(content)) {
    return { passed: false, reason: 'No Japanese content found (bilingual required)' };
  }

  return { passed: true };
}

/**
 * Check Q4: Category-specific content rules.
 *
 * test-plan: interfaces/patterns only — no implementation code blocks
 * code-gen: MUST have code templates with ${placeholder} syntax
 *
 * @param {string} content
 * @param {string} category - 'test-plan' or 'code-gen'
 * @returns {{ passed: boolean, reason?: string }}
 */
function checkQ4(content, category) {
  if (!content) return { passed: false, reason: 'Empty content' };

  if (category === 'test-plan') {
    // test-plan must NOT have fenced code blocks with implementation
    const codeBlocks = content.match(/```(?:java|tsx?|javascript)\n[\s\S]*?```/g) || [];
    if (codeBlocks.length > 0) {
      return { passed: false, reason: 'test-plan specialist contains implementation code blocks (only patterns allowed)' };
    }
    return { passed: true };
  }

  if (category === 'code-gen') {
    // code-gen MUST have code blocks
    const codeBlocks = content.match(/```(?:java|tsx?|javascript|typescript|markdown)\n[\s\S]*?```/g) || [];
    if (codeBlocks.length === 0) {
      return { passed: false, reason: 'code-gen specialist missing code template blocks' };
    }

    // code-gen MUST have placeholder syntax
    const hasPlaceholders = /\$\{[A-Za-z]\w*\}/.test(content);
    if (!hasPlaceholders) {
      return { passed: false, reason: 'code-gen specialist missing ${placeholder} syntax in templates' };
    }

    return { passed: true };
  }

  // Unknown category — pass by default
  return { passed: true };
}

// ── Internal Helpers ──────────────────────────────────────────────────────────

function _extractYaml(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const kv = line.match(/^(\w+):\s*(.+)/);
    if (kv) {
      yaml[kv[1]] = kv[2].trim();
    }
  }
  return yaml;
}

function _inferCategory(filePath) {
  if (filePath.includes('/test-plan/')) return 'test-plan';
  if (filePath.includes('/testing/')) return 'code-gen';
  return 'unknown';
}

function _findSpecialistFiles(baseDir) {
  const files = [];
  if (!fs.existsSync(baseDir)) return files;

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
        files.push(fullPath);
      }
    }
  }

  walk(baseDir);
  return files;
}

module.exports = { validateSpecialist, validateAll, checkQ3, checkQ4 };
