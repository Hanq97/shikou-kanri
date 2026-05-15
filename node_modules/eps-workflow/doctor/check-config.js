'use strict';

// doctor/check-config.js — Validate EPS configuration files
// Checks: project-config.json (valid JSON + has sourceRoots),
//         settings.json (valid JSON + has hooks), CLAUDE.md (exists + non-empty).
// Read-only (NFR-INIT-05): never writes files.

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} CheckResult
 * @property {string} name     - Config item name
 * @property {boolean} ok      - Pass/fail
 * @property {string} message  - Human-readable result detail
 */

/**
 * Safely read and parse a JSON file.
 * Returns { parsed, error } — error is null on success.
 * @param {string} filePath
 * @returns {{ parsed: any|null, error: string|null }}
 */
function safeReadJson(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return { parsed: null, error: `Cannot read file: ${err.message}` };
  }

  try {
    const parsed = JSON.parse(raw);
    return { parsed, error: null };
  } catch (err) {
    return { parsed: null, error: `Invalid JSON: ${err.message}` };
  }
}

/**
 * Check project-config.json.
 * Must exist, be valid JSON, and contain a `sourceRoots` array.
 * @param {string} claudeDir
 * @returns {CheckResult}
 */
function checkProjectConfig(claudeDir) {
  const filePath = path.join(claudeDir, 'config', 'project-config.json');
  const name = 'project-config.json';

  if (!fs.existsSync(filePath)) {
    return {
      name,
      ok: false,
      message: `MISSING: ${filePath} not found — run 'npx eps init' to scaffold`
    };
  }

  const { parsed, error } = safeReadJson(filePath);
  if (error) {
    return { name, ok: false, message: `INVALID JSON: ${error} in ${filePath}` };
  }

  // Must have sourceRoots array (schema v2.0)
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sourceRoots)) {
    return {
      name,
      ok: false,
      message: `INVALID: ${filePath} is missing required key "sourceRoots" (array)`
    };
  }

  const roots = parsed.sourceRoots;
  const stackSummary = roots
    .map(r => `${r.label || r.type || '?'}=${r.stackKey || r.stack || 'n/a'}`)
    .join(', ');

  return {
    name,
    ok: true,
    message: `OK: ${filePath} — ${roots.length} sourceRoot(s) (${stackSummary})`
  };
}

/**
 * Check settings.json.
 * Must exist, be valid JSON, and contain a `hooks` property.
 * @param {string} claudeDir
 * @returns {CheckResult}
 */
function checkSettings(claudeDir) {
  const filePath = path.join(claudeDir, 'settings.json');
  const name = 'settings.json';

  if (!fs.existsSync(filePath)) {
    return {
      name,
      ok: false,
      message: `MISSING: ${filePath} not found — run 'npx eps init' to scaffold`
    };
  }

  const { parsed, error } = safeReadJson(filePath);
  if (error) {
    return { name, ok: false, message: `INVALID JSON: ${error} in ${filePath}` };
  }

  if (!parsed || typeof parsed !== 'object' || !('hooks' in parsed)) {
    return {
      name,
      ok: false,
      message: `INVALID: ${filePath} is missing required key "hooks"`
    };
  }

  const hooksCount = Array.isArray(parsed.hooks)
    ? parsed.hooks.length
    : Object.keys(parsed.hooks || {}).length;

  return {
    name,
    ok: true,
    message: `OK: ${filePath} — hooks present (${hooksCount} entr${hooksCount === 1 ? 'y' : 'ies'})`
  };
}

/**
 * Check CLAUDE.md.
 * Must exist and be non-empty (at least 1 byte).
 * @param {string} claudeDir
 * @returns {CheckResult}
 */
function checkClaudeMd(claudeDir) {
  const filePath = path.join(claudeDir, 'CLAUDE.md');
  const name = 'CLAUDE.md';

  if (!fs.existsSync(filePath)) {
    return {
      name,
      ok: false,
      message: `MISSING: ${filePath} not found — run 'npx eps init' to scaffold`
    };
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (err) {
    return { name, ok: false, message: `STAT ERROR: ${err.message}` };
  }

  if (stat.size === 0) {
    return {
      name,
      ok: false,
      message: `EMPTY: ${filePath} exists but has no content`
    };
  }

  return {
    name,
    ok: true,
    message: `OK: ${filePath} — ${stat.size} bytes`
  };
}

/**
 * Validate EPS configuration files in the project.
 *
 * Checks:
 *   1. .claude/config/project-config.json — valid JSON with `sourceRoots`
 *   2. .claude/settings.json              — valid JSON with `hooks`
 *   3. .claude/CLAUDE.md                  — exists and non-empty
 *
 * Read-only — never modifies the filesystem.
 *
 * @param {string} projectDir - Project root
 * @returns {CheckResult[]}
 */
function checkConfig(projectDir) {
  if (!projectDir || typeof projectDir !== 'string') {
    return [
      { name: 'project-config.json', ok: false, message: 'INVALID: projectDir must be a non-empty string' },
      { name: 'settings.json', ok: false, message: 'INVALID: projectDir must be a non-empty string' },
      { name: 'CLAUDE.md', ok: false, message: 'INVALID: projectDir must be a non-empty string' }
    ];
  }

  const claudeDir = path.join(projectDir, '.claude');

  // If .claude/ is missing, all config checks fail
  if (!fs.existsSync(claudeDir)) {
    return [
      { name: 'project-config.json', ok: false, message: `MISSING .claude/: ${claudeDir} not found` },
      { name: 'settings.json', ok: false, message: `MISSING .claude/: ${claudeDir} not found` },
      { name: 'CLAUDE.md', ok: false, message: `MISSING .claude/: ${claudeDir} not found` }
    ];
  }

  return [
    checkProjectConfig(claudeDir),
    checkSettings(claudeDir),
    checkClaudeMd(claudeDir)
  ];
}

module.exports = { checkConfig };
