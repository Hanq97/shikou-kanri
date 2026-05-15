'use strict';

// doctor/check-symlinks.js — Verify the 4 EPS symlinks in .claude/
// Checks: core, specialists, guards, skills
// Each check: exists → isSymlink → resolve target → target exists
// Read-only (NFR-INIT-05): never writes files.

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} CheckResult
 * @property {string} name     - Symlink name (e.g. 'core')
 * @property {boolean} ok      - Overall pass/fail
 * @property {string} message  - Human-readable result detail
 */

/**
 * The 4 symlinks expected under <projectDir>/.claude/
 */
const EXPECTED_SYMLINKS = ['core', 'specialists', 'guards', 'skills'];

/**
 * Check a single symlink entry.
 * @param {string} linkPath     - Absolute path to the symlink
 * @param {string} name         - Display name
 * @returns {CheckResult}
 */
function checkOneSymlink(linkPath, name) {
  // Step 1: Does the path exist at all?
  let stat;
  try {
    // lstatSync does NOT follow symlinks (so it sees the symlink itself)
    stat = fs.lstatSync(linkPath);
  } catch (_) {
    return {
      name,
      ok: false,
      message: `MISSING: path does not exist at ${linkPath}`
    };
  }

  // Step 2: Is it a symlink?
  if (!stat.isSymbolicLink()) {
    return {
      name,
      ok: false,
      message: `NOT A SYMLINK: ${linkPath} exists but is not a symbolic link (${stat.isDirectory() ? 'directory' : 'file'})`
    };
  }

  // Step 3: Resolve the symlink target
  let target;
  try {
    target = fs.readlinkSync(linkPath);
  } catch (err) {
    return {
      name,
      ok: false,
      message: `UNREADABLE: cannot read symlink target at ${linkPath}: ${err.message}`
    };
  }

  // Make target absolute (symlinks can be relative)
  const absoluteTarget = path.isAbsolute(target)
    ? target
    : path.resolve(path.dirname(linkPath), target);

  // Step 4: Does the target actually exist?
  let targetExists = false;
  try {
    fs.accessSync(absoluteTarget);
    targetExists = true;
  } catch (_) {
    targetExists = false;
  }

  if (!targetExists) {
    return {
      name,
      ok: false,
      message: `BROKEN: symlink exists but target missing — ${linkPath} → ${absoluteTarget}`
    };
  }

  return {
    name,
    ok: true,
    message: `OK: ${linkPath} → ${absoluteTarget}`
  };
}

/**
 * Verify the 4 EPS symlinks under <projectDir>/.claude/.
 *
 * Read-only check — never modifies the filesystem.
 *
 * @param {string} projectDir - Project root (where .claude/ lives)
 * @returns {CheckResult[]}   - One result per expected symlink
 */
function checkSymlinks(projectDir) {
  if (!projectDir || typeof projectDir !== 'string') {
    return EXPECTED_SYMLINKS.map(name => ({
      name,
      ok: false,
      message: 'INVALID: projectDir must be a non-empty string'
    }));
  }

  const claudeDir = path.join(projectDir, '.claude');

  // If .claude/ itself is missing, all checks fail immediately
  let claudeStat;
  try {
    claudeStat = fs.statSync(claudeDir);
  } catch (_) {
    return EXPECTED_SYMLINKS.map(name => ({
      name,
      ok: false,
      message: `MISSING .claude/: directory not found at ${claudeDir}`
    }));
  }

  if (!claudeStat.isDirectory()) {
    return EXPECTED_SYMLINKS.map(name => ({
      name,
      ok: false,
      message: `INVALID: ${claudeDir} exists but is not a directory`
    }));
  }

  return EXPECTED_SYMLINKS.map(name => {
    const linkPath = path.join(claudeDir, name);
    return checkOneSymlink(linkPath, name);
  });
}

module.exports = { checkSymlinks };
