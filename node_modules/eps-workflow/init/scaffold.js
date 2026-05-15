'use strict';

// init/scaffold.js — Template Renderer
// Renders .tmpl files from defaults/ into the project's .claude/ directory.
// Supports {{VAR}} token replacement, atomic writes, and non-destructive mode.

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * @typedef {Object} ScaffoldFileEntry
 * @property {string} src         - Source template path
 * @property {string} dest        - Destination file path
 * @property {string} status      - 'written' | 'skipped' | 'preview' | 'error'
 * @property {string} [reason]    - Reason for skip or error
 */

/**
 * @typedef {Object} ScaffoldResult
 * @property {ScaffoldFileEntry[]} files
 * @property {boolean} success
 * @property {string[]} errors
 */

/**
 * Replace all {{VAR}} tokens in template content.
 * @param {string} content
 * @param {Object.<string, string>} tokens
 * @returns {string}
 */
function renderTokens(content, tokens) {
  return content.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : match;
  });
}

/**
 * Atomic file write: write to a .tmp file then rename.
 * Satisfies NFR-INIT-03 (atomic write).
 * @param {string} destPath
 * @param {string} content
 */
function atomicWrite(destPath, content) {
  const tmpPath = destPath + '.tmp.' + process.pid;
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    fs.mkdirSync(destDir, { recursive: true });

    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, destPath);
  } catch (err) {
    // Clean up .tmp on failure
    try { fs.unlinkSync(tmpPath); } catch (_) { /* ignore */ }
    throw err;
  }
}

/**
 * Build token map from detected stack + project info.
 * @param {import('./detect').DetectResult} detectResult
 * @param {string} projectDir
 * @returns {Object.<string, string>}
 */
function buildTokens(detectResult, projectDir) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

  const primaryStack = detectResult.stacks && detectResult.stacks.length > 0
    ? detectResult.stacks[0]
    : 'unknown';

  // Build tech stack label
  let techStackLabel = primaryStack;
  if (detectResult.variant) {
    techStackLabel += ` (${detectResult.variant})`;
  }

  // Load stack rules from defaults/config/stacks/ JSON files
  const stackRules = loadStackRules(primaryStack, detectResult.variant);

  return {
    PROJECT_NAME: detectResult.projectName || path.basename(projectDir),
    PROJECT_DIR: projectDir,
    PRIMARY_STACK: primaryStack,
    STACK: primaryStack,
    TECH_STACK: techStackLabel,
    STACKS: (detectResult.stacks || []).join(', '),
    VARIANT: detectResult.variant || '',
    STACK_RULES: stackRules,
    RAG_SERVER: 'http://localhost:8000',
    EMBEDDING_SERVER: 'http://localhost:8080',
    DATE: dateStr,
    YEAR: String(now.getFullYear()),
    EPS_VERSION: '3.2'
  };
}

/**
 * Load stack rules from defaults/config/stacks/ JSON files.
 * Falls back to a generic label if the stack file is not found.
 * @param {string} stack - e.g. 'java-springboot'
 * @param {string|null} variant - e.g. 'reactive'
 * @returns {string}
 */
function loadStackRules(stack, variant) {
  const stacksDir = path.join(__dirname, '..', 'defaults', 'config', 'stacks');

  // Map detector stack IDs to file names (detector uses 'java-springboot', file is 'java-spring-boot.json')
  const indexPath = path.join(stacksDir, '_index.json');
  let stackFile = null;

  try {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    // Try exact match first, then fuzzy match (e.g. java-springboot → java-spring-boot)
    for (const [key, entry] of Object.entries(index.stacks || {})) {
      if (key === stack || key.replace(/-/g, '') === stack.replace(/-/g, '')) {
        stackFile = path.join(stacksDir, entry.file);
        break;
      }
    }
  } catch (_) { /* index not found */ }

  if (!stackFile || !fs.existsSync(stackFile)) {
    return `- Stack: ${stack}${variant ? ' (' + variant + ')' : ''}`;
  }

  try {
    const stackConfig = JSON.parse(fs.readFileSync(stackFile, 'utf8'));
    const lines = [];
    lines.push(`- Stack: ${stackConfig.name || stack}`);
    lines.push(`- Language: ${stackConfig.language || 'unknown'} ${stackConfig.version ? Object.entries(stackConfig.version).map(([k, v]) => k + ' ' + v).join(', ') : ''}`);

    if (variant && stackConfig.variants && stackConfig.variants[variant]) {
      const v = stackConfig.variants[variant];
      lines.push(`- Variant: ${v.name || variant} — ${v.description || ''}`);
    }

    const archs = stackConfig.architecture?.supportedArchitectures;
    if (archs && archs.length > 0) {
      lines.push(`- Architecture: ${archs.join(', ')}`);
    }

    return lines.join('\n');
  } catch (_) {
    return `- Stack: ${stack}${variant ? ' (' + variant + ')' : ''}`;
  }
}

/**
 * Resolve template files to scaffold.
 * Returns a list of { src, dest } pairs based on the detected stack.
 * @param {import('./detect').DetectResult} detectResult
 * @param {string} defaultsDir  - Path to the defaults/ directory
 * @param {string} projectDir   - Target project directory
 * @returns {{ src: string, dest: string }[]}
 */
function resolvePlan(detectResult, defaultsDir, projectDir) {
  const claudeDir = path.join(projectDir, '.claude');
  const configDir = path.join(claudeDir, 'config');
  const defaultsConfigDir = path.join(defaultsDir, 'config');

  // Core templates always scaffolded
  const entries = [
    {
      src: path.join(defaultsDir, 'settings.json.tmpl'),
      dest: path.join(claudeDir, 'settings.json')
    },
    {
      src: path.join(defaultsDir, 'CLAUDE.md.tmpl'),
      dest: path.join(claudeDir, 'CLAUDE.md')
    }
  ];

  // project-config.json — template (.tmpl) preferred, fallback to plain JSON
  const configTmpl = path.join(defaultsConfigDir, 'project-config.json.tmpl');
  if (fs.existsSync(configTmpl)) {
    entries.push({ src: configTmpl, dest: path.join(configDir, 'project-config.json') });
  } else {
    const configJson = path.join(defaultsConfigDir, 'project-config.json');
    if (fs.existsSync(configJson)) {
      entries.push({ src: configJson, dest: path.join(configDir, 'project-config.json') });
    }
  }

  // Config files to scaffold (project-specific, need per-project editing)
  // Prefer .tmpl version (token replacement), fallback to plain JSON (copy as-is)
  const configFiles = [
    'rag-server.json',
    'external-apis.json',
    'feature-dictionary.json'
  ];

  for (const file of configFiles) {
    const tmplSrc = path.join(defaultsConfigDir, file + '.tmpl');
    const plainSrc = path.join(defaultsConfigDir, file);
    const src = fs.existsSync(tmplSrc) ? tmplSrc : plainSrc;
    if (fs.existsSync(src)) {
      entries.push({ src, dest: path.join(configDir, file) });
    }
  }

  return entries;
}

/**
 * Determine if a source file is a template (.tmpl extension).
 * @param {string} srcPath
 * @returns {boolean}
 */
function isTemplate(srcPath) {
  return srcPath.endsWith('.tmpl');
}

/**
 * Scaffold EPS configuration files into the target project directory.
 *
 * Options:
 *   previewOnly {boolean} - if true, return plan without writing (for confirm display)
 *   force {boolean}       - overwrite existing files
 *   dryRun {boolean}      - alias for previewOnly (writes nothing)
 *   verbose {boolean}     - log each action
 *
 * Satisfies:
 *   NFR-INIT-03: Atomic writes (write to .tmp then rename)
 *   NFR-INIT-04: Non-destructive (skip existing unless --force)
 *
 * @param {import('./detect').DetectResult} detectResult
 * @param {string} projectDir
 * @param {{ previewOnly?: boolean, force?: boolean, dryRun?: boolean, verbose?: boolean }} options
 * @returns {ScaffoldResult}
 */
function scaffold(detectResult, projectDir, options = {}) {
  const { previewOnly = false, force = false, dryRun = false, verbose = false } = options;
  const preview = previewOnly || dryRun;

  // Locate defaults directory relative to this package
  const defaultsDir = path.join(__dirname, '..', 'defaults');

  const tokens = buildTokens(detectResult, projectDir);
  const plan = resolvePlan(detectResult, defaultsDir, projectDir);

  const files = [];
  const errors = [];

  for (const entry of plan) {
    const { src, dest } = entry;
    const fileEntry = { src, dest, status: 'preview' };

    // Check source exists
    if (!fs.existsSync(src)) {
      fileEntry.status = 'skipped';
      fileEntry.reason = `Template not found: ${src}`;
      files.push(fileEntry);
      continue;
    }

    // Non-destructive: skip if destination exists and not --force
    if (!force && fs.existsSync(dest)) {
      fileEntry.status = 'skipped';
      fileEntry.reason = 'File exists (use --force to overwrite)';
      files.push(fileEntry);
      if (verbose) {
        console.log(`  [SKIP] ${path.relative(projectDir, dest)} — already exists`);
      }
      continue;
    }

    if (preview) {
      fileEntry.status = 'preview';
      files.push(fileEntry);
      continue;
    }

    // Read source content
    let content;
    try {
      content = fs.readFileSync(src, 'utf8');
    } catch (err) {
      fileEntry.status = 'error';
      fileEntry.reason = `Read error: ${err.message}`;
      errors.push(fileEntry.reason);
      files.push(fileEntry);
      continue;
    }

    // Apply token replacement if .tmpl file
    if (isTemplate(src)) {
      content = renderTokens(content, tokens);
    }

    // Atomic write
    try {
      atomicWrite(dest, content);
      fileEntry.status = 'written';
      if (verbose) {
        console.log(`  [WRITE] ${path.relative(projectDir, dest)}`);
      }
    } catch (err) {
      fileEntry.status = 'error';
      fileEntry.reason = `Write error: ${err.message}`;
      errors.push(fileEntry.reason);
    }

    files.push(fileEntry);
  }

  return {
    files,
    success: errors.length === 0,
    errors
  };
}

module.exports = { scaffold, renderTokens, buildTokens };
