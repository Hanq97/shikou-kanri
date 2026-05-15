'use strict';

// doctor/check-deps.js — Verify required and optional Node.js dependencies
// Uses require.resolve() — no process spawning.
// Read-only (NFR-INIT-05): never writes files.

/**
 * @typedef {Object} CheckResult
 * @property {string} name     - Package name
 * @property {boolean} ok      - Pass/fail
 * @property {string} message  - Human-readable result detail
 */

/**
 * Required packages (missing = FAIL).
 */
const REQUIRED_PACKAGES = [
  { name: 'eps-workflow', description: 'EPS core package' }
];

/**
 * Optional packages (missing = WARN, not a hard failure).
 */
const OPTIONAL_PACKAGES = [
  { name: '@google/generative-ai', description: 'Gemini SDK for /innovate multi-model' },
  { name: 'graphology', description: 'Knowledge graph for RAG 2.0' }
];

/**
 * Attempt to resolve a package using require.resolve().
 * Returns the resolved path or null if not found.
 *
 * @param {string} pkgName
 * @param {string} projectDir - Used as resolution base (searches node_modules in projectDir)
 * @returns {string|null}
 */
function tryResolve(pkgName, projectDir) {
  // require.resolve with paths option searches from the given directory
  try {
    return require.resolve(pkgName, { paths: [projectDir] });
  } catch (_) {
    // Package not found in projectDir hierarchy
  }

  // Fallback: try from this package's own resolution chain
  try {
    return require.resolve(pkgName);
  } catch (_) {
    return null;
  }
}

/**
 * Read the installed version of a package from its package.json.
 * Returns version string or null if not determinable.
 *
 * @param {string} resolvedPath - Absolute path returned by require.resolve
 * @returns {string|null}
 */
function getInstalledVersion(resolvedPath) {
  try {
    const fs = require('fs');
    const path = require('path');

    // Walk up from the resolved file to find the package.json
    let dir = require('path').dirname(resolvedPath);
    for (let i = 0; i < 6; i++) {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.version) return pkg.version;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch (_) { /* ignore */ }
  return null;
}

/**
 * Check required and optional Node.js package dependencies.
 *
 * Required packages return ok: false if missing.
 * Optional packages return ok: true with a 'WARN' note if missing
 * (they do not cause doctor to report failure).
 *
 * Read-only — never modifies the filesystem.
 *
 * @param {string} projectDir - Project root for resolution context
 * @returns {CheckResult[]}
 */
function checkDeps(projectDir) {
  const results = [];

  // Check required packages
  for (const pkg of REQUIRED_PACKAGES) {
    const resolved = tryResolve(pkg.name, projectDir);

    if (!resolved) {
      results.push({
        name: pkg.name,
        ok: false,
        message: `MISSING: ${pkg.name} not found — ${pkg.description} (run: npm install ${pkg.name})`
      });
      continue;
    }

    const version = getInstalledVersion(resolved);
    const versionLabel = version ? `v${version}` : 'version unknown';

    results.push({
      name: pkg.name,
      ok: true,
      message: `OK: ${pkg.name} ${versionLabel} — ${pkg.description}`
    });
  }

  // Check optional packages
  for (const pkg of OPTIONAL_PACKAGES) {
    const resolved = tryResolve(pkg.name, projectDir);

    if (!resolved) {
      // Optional: warn but mark ok: true so doctor doesn't fail
      results.push({
        name: pkg.name,
        ok: true,
        message: `WARN (optional): ${pkg.name} not installed — ${pkg.description}`
      });
      continue;
    }

    const version = getInstalledVersion(resolved);
    const versionLabel = version ? `v${version}` : 'version unknown';

    results.push({
      name: pkg.name,
      ok: true,
      message: `OK: ${pkg.name} ${versionLabel} — ${pkg.description}`
    });
  }

  return results;
}

module.exports = { checkDeps };
