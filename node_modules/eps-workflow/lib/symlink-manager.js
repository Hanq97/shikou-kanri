'use strict';

/**
 * symlink-manager.js — Platform-aware symlink creation for eps-workflow
 *
 * Handles creation and removal of symlinks from consumer .claude/ dirs
 * to the installed eps-workflow package directories.
 *
 * Unix:    fs.symlinkSync(target, link, 'dir')
 * Windows: fs.symlinkSync(target, link, 'junction')
 * Fallback: cp -r if symlink creation fails
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const isWindows = process.platform === 'win32';

/**
 * Create a directory symlink from `link` → `target`.
 * Falls back to recursive copy if symlink is not permitted.
 *
 * @param {string} target - Absolute path to the source directory (inside node_modules/eps-workflow)
 * @param {string} link   - Absolute path where the symlink (or copy) should appear
 * @returns {{ method: 'symlink'|'junction'|'copy', ok: boolean, error?: string }}
 */
function create(target, link) {
  // Remove stale link/dir if it already exists
  if (fs.existsSync(link)) {
    try {
      const stat = fs.lstatSync(link);
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(link);
      } else {
        // Not a symlink — leave user-owned directory untouched
        return { method: 'skip', ok: true };
      }
    } catch (e) {
      return { method: 'skip', ok: false, error: e.message };
    }
  }

  // Ensure parent directory exists
  const parentDir = path.dirname(link);
  fs.mkdirSync(parentDir, { recursive: true });

  // Attempt platform-native symlink
  const symlinkType = isWindows ? 'junction' : 'dir';
  try {
    fs.symlinkSync(target, link, symlinkType);
    return { method: isWindows ? 'junction' : 'symlink', ok: true };
  } catch (symlinkErr) {
    // Fallback: recursive copy (useful in environments without symlink privileges)
    try {
      if (isWindows) {
        execSync(`xcopy /E /I /Q "${target}" "${link}"`, { stdio: 'ignore' });
      } else {
        execSync(`cp -r "${target}" "${link}"`, { stdio: 'ignore' });
      }
      return { method: 'copy', ok: true };
    } catch (copyErr) {
      return {
        method: 'copy',
        ok: false,
        error: `symlink: ${symlinkErr.message} | copy: ${copyErr.message}`
      };
    }
  }
}

/**
 * Remove a symlink created by `create()`.
 * Does NOT remove regular directories (user-owned content is preserved).
 *
 * @param {string} link - Path to the symlink to remove
 * @returns {{ ok: boolean, error?: string }}
 */
function remove(link) {
  if (!fs.existsSync(link)) {
    return { ok: true }; // already gone
  }

  try {
    const stat = fs.lstatSync(link);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(link);
      return { ok: true };
    }
    // Not a symlink — skip silently (it may be a copy-fallback directory or user content)
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Doctor check — verify each entry in a list of expected symlinks.
 *
 * @param {Array<{ target: string, link: string }>} entries
 * @returns {Array<{ link: string, status: 'ok'|'missing'|'broken'|'not-symlink' }>}
 */
function doctor(entries) {
  return entries.map(({ target, link }) => {
    if (!fs.existsSync(link)) {
      return { link, status: 'missing' };
    }

    let stat;
    try {
      stat = fs.lstatSync(link);
    } catch (e) {
      return { link, status: 'broken' };
    }

    if (!stat.isSymbolicLink()) {
      return { link, status: 'not-symlink' };
    }

    try {
      const resolved = fs.realpathSync(link);
      const expectedResolved = fs.realpathSync(target);
      return { link, status: resolved === expectedResolved ? 'ok' : 'broken' };
    } catch (e) {
      return { link, status: 'broken' };
    }
  });
}

module.exports = { create, remove, doctor };
