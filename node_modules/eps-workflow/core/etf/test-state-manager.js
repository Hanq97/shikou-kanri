'use strict';

/**
 * test-state-manager.js — Per-module test pipeline state tracking.
 *
 * Layer: L5 SKILL
 * Pattern: Single Track + Flexible Entry Points [BD D5, CON-TECH-006]
 *
 * States: none → scan_complete → generate_complete → validate_complete
 * Independent track: reverse_dd_complete
 * Staleness detection via git timestamps.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VALID_STATES = [
  'none',
  'scan_complete',
  'scan_stale',
  'generate_complete',
  'validate_complete',
  'reverse_dd_complete',
];

/**
 * Get current test pipeline state for a module.
 *
 * @param {string} moduleName
 * @returns {{stage: string, lastUpdated: string, results: object}|null}
 */
function getModuleState(moduleName) {
  const file = _stateFilePath(moduleName);
  if (!fs.existsSync(file)) return null;

  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Update module state after successful command.
 *
 * @param {string} moduleName
 * @param {object} newState - { stage, ... }
 */
function updateState(moduleName, newState) {
  const file = _stateFilePath(moduleName);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const current = getModuleState(moduleName) || {
    stage: 'none',
    lastUpdated: null,
    results: {},
  };

  const updated = {
    ...current,
    ...newState,
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(file, JSON.stringify(updated, null, 2));
}

/**
 * Validate if a state transition is allowed.
 *
 * @param {string} from - Current state
 * @param {string} command - "test" | "reverse-dd"
 * @param {string} sub - Sub-command
 * @returns {{allowed: boolean, error?: string}}
 */
function validateTransition(from, command, sub) {
  if (command === 'reverse-dd') {
    return { allowed: true }; // Independent track
  }

  if (command !== 'test') {
    return { allowed: false, error: 'Unknown command: ' + command };
  }

  // scan: always allowed
  if (sub === 'scan') return { allowed: true };

  // generate: requires scan_complete or later
  if (sub === 'generate') {
    const allowed = from && from !== 'none';
    return allowed
      ? { allowed: true }
      : { allowed: false, error: 'Run /test scan first' };
  }

  // validate: requires generate_complete or later
  if (sub === 'validate') {
    const allowed = ['generate_complete', 'validate_complete'].includes(from);
    return allowed
      ? { allowed: true }
      : { allowed: false, error: 'Run /test generate first' };
  }

  return { allowed: false, error: 'Unknown sub-command: ' + sub };
}

/**
 * Check if scan results are stale (source code changed since last scan).
 *
 * @param {string} moduleName
 * @returns {{stale: boolean, changedCount: number}}
 */
function checkStaleness(moduleName) {
  const state = getModuleState(moduleName);
  if (!state || !state.lastUpdated) {
    return { stale: true, changedCount: 0 };
  }

  try {
    const since = state.lastUpdated;
    const output = execSync(
      'git log --oneline --since="' + since + '" -- "**/*' + moduleName + '*"',
      { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    const lines = output ? output.split('\n').length : 0;
    return { stale: lines > 0, changedCount: lines };
  } catch {
    // Git not available or error — assume not stale
    return { stale: false, changedCount: 0 };
  }
}

/**
 * Reset module state to 'none'.
 *
 * @param {string} moduleName
 */
function resetState(moduleName) {
  const file = _stateFilePath(moduleName);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _stateFilePath(moduleName) {
  return path.join(process.cwd(), '.claude', 'cache', 'etf', moduleName, 'test-state.json');
}

module.exports = { getModuleState, updateState, validateTransition, checkStaleness, resetState };
