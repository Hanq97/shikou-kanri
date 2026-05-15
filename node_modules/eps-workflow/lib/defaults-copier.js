'use strict';

/**
 * defaults-copier.js — Copy-on-first-install logic for eps-workflow
 *
 * Copies from `defaults/` inside the package to the consumer's `.claude/` directory.
 * Existing files are SKIPPED to preserve user customisation unless `--force` is passed.
 *
 * Usage:
 *   const { copyDefaults } = require('./lib/defaults-copier');
 *   copyDefaults(srcDir, destDir, { force: false });
 */

const fs = require('fs');
const path = require('path');

/**
 * Recursively walk `dir` and yield every file path relative to `dir`.
 *
 * @param {string} dir
 * @param {string} [base]
 * @returns {string[]}
 */
function walkFiles(dir, base) {
  base = base || dir;
  let results = [];

  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch (e) {
    return results;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch (e) {
      continue;
    }

    if (stat.isDirectory()) {
      results = results.concat(walkFiles(full, base));
    } else {
      results.push(path.relative(base, full));
    }
  }

  return results;
}

/**
 * Copy defaults from `srcDir` to `destDir`.
 *
 * Files in `srcDir` that end with `.tmpl` are stripped of the `.tmpl`
 * extension before writing so that `CLAUDE.md.tmpl` → `CLAUDE.md`.
 *
 * @param {string} srcDir   - Absolute path to defaults/ in the installed package
 * @param {string} destDir  - Absolute path to consumer's .claude/ directory
 * @param {{ force?: boolean, dryRun?: boolean }} [options]
 * @returns {{ copied: string[], skipped: string[], errors: string[] }}
 */
function copyDefaults(srcDir, destDir, options) {
  options = options || {};
  const force = Boolean(options.force);
  const dryRun = Boolean(options.dryRun);

  const copied = [];
  const skipped = [];
  const errors = [];

  const files = walkFiles(srcDir);

  for (const relPath of files) {
    // v9.0: Skip legacy files (replaced by streamlined workflow)
    const legacyPatterns = ['-v1', '-old'];
    const isLegacy = legacyPatterns.some(p =>
      relPath.includes(p) || relPath.split(path.sep).some(seg => seg.includes(p))
    );
    if (isLegacy) {
      skipped.push(relPath + ' (legacy-skip)');
      continue;
    }

    const srcFile = path.join(srcDir, relPath);

    // Strip .tmpl extension for destination
    const destRelPath = relPath.endsWith('.tmpl') ? relPath.slice(0, -5) : relPath;
    const destFile = path.join(destDir, destRelPath);

    // Skip-if-exists unless --force
    if (!force && fs.existsSync(destFile)) {
      skipped.push(destRelPath);
      continue;
    }

    if (dryRun) {
      copied.push(destRelPath);
      continue;
    }

    try {
      const destParent = path.dirname(destFile);
      fs.mkdirSync(destParent, { recursive: true });

      const content = fs.readFileSync(srcFile);
      fs.writeFileSync(destFile, content);
      copied.push(destRelPath);
    } catch (e) {
      errors.push(`${destRelPath}: ${e.message}`);
    }
  }

  return { copied, skipped, errors };
}

module.exports = { copyDefaults };
