'use strict';

/**
 * bootstrapper.js — Detect and fill test infrastructure gaps.
 *
 * Layer: L2 MICRO-CMD
 *
 * Scans pom.xml (BE) and package.json (FE) for missing test dependencies.
 * Generates setup files (config, base test classes).
 */

const fs = require('fs');
const path = require('path');

// Required backend test dependencies (Java reactive)
const REQUIRED_BE_DEPS = [
  { group: 'org.springframework.boot', artifact: 'spring-boot-starter-test', name: 'spring-boot-starter-test' },
  { group: 'io.projectreactor', artifact: 'reactor-test', name: 'reactor-test' },
  { group: 'org.testcontainers', artifact: 'r2dbc', name: 'testcontainers-r2dbc' },
  { group: 'org.testcontainers', artifact: 'postgresql', name: 'testcontainers-postgresql' },
  { group: 'org.testcontainers', artifact: 'junit-jupiter', name: 'testcontainers-junit-jupiter' },
];

// Required frontend test dependencies (Next.js)
const REQUIRED_FE_DEPS = [
  { name: 'vitest', devDep: true },
  { name: '@testing-library/react', devDep: true },
  { name: '@testing-library/jest-dom', devDep: true },
  { name: 'msw', devDep: true },
  { name: '@playwright/test', devDep: true },
];

/**
 * Detect gaps in test infrastructure.
 *
 * @param {object} moduleContext - { pkgRoot, sourcePaths }
 * @returns {object[]} GapItem[] { category, name, severity, fix }
 */
function detectGaps(moduleContext) {
  const gaps = [];
  const pkgRoot = moduleContext.pkgRoot || process.cwd();

  // Check backend dependencies (pom.xml)
  const pomPath = _findPomXml(pkgRoot);
  if (pomPath) {
    const pomContent = fs.readFileSync(pomPath, 'utf8');
    for (const dep of REQUIRED_BE_DEPS) {
      if (!pomContent.includes(dep.artifact)) {
        gaps.push({
          category: 'backend',
          name: dep.name,
          severity: dep.artifact === 'spring-boot-starter-test' ? 'critical' : 'high',
          fix: 'Add <dependency> for ' + dep.group + ':' + dep.artifact + ' to pom.xml',
        });
      }
    }
  }

  // Check frontend dependencies (package.json)
  const pkgJsonPath = _findPackageJson(pkgRoot);
  if (pkgJsonPath) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const allDeps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };

    for (const dep of REQUIRED_FE_DEPS) {
      if (!allDeps[dep.name]) {
        gaps.push({
          category: 'frontend',
          name: dep.name,
          severity: dep.name === 'vitest' ? 'critical' : 'high',
          fix: 'npm install --save-dev ' + dep.name,
        });
      }
    }
  }

  // Check for test config files
  if (pomPath && !_hasFile(pkgRoot, 'src/test/resources/application-test.yml')) {
    gaps.push({
      category: 'backend',
      name: 'application-test.yml',
      severity: 'medium',
      fix: 'Generate application-test.yml with test database config',
    });
  }

  if (pkgJsonPath && !_hasFile(pkgRoot, 'vitest.config.ts') && !_hasFile(pkgRoot, 'vitest.config.js')) {
    gaps.push({
      category: 'frontend',
      name: 'vitest.config.ts',
      severity: 'medium',
      fix: 'Generate vitest.config.ts',
    });
  }

  return gaps;
}

/**
 * Generate backend setup files.
 *
 * @param {object[]} gaps - Backend gaps
 * @returns {object[]} ActionItem[] { file, action, content }
 */
function setupBackend(gaps) {
  const actions = [];

  // POM dependency additions
  const depGaps = gaps.filter(g => g.category === 'backend' && !g.name.includes('.'));
  if (depGaps.length > 0) {
    const deps = depGaps.map(g => {
      const dep = REQUIRED_BE_DEPS.find(d => d.name === g.name);
      if (!dep) return '';
      return '        <dependency>\n' +
             '            <groupId>' + dep.group + '</groupId>\n' +
             '            <artifactId>' + dep.artifact + '</artifactId>\n' +
             '            <scope>test</scope>\n' +
             '        </dependency>';
    }).filter(Boolean).join('\n');

    actions.push({
      file: 'pom.xml',
      action: 'add-dependencies',
      content: deps,
    });
  }

  // application-test.yml
  if (gaps.some(g => g.name === 'application-test.yml')) {
    actions.push({
      file: 'src/test/resources/application-test.yml',
      action: 'create',
      content: [
        'spring:',
        '  r2dbc:',
        '    url: r2dbc:tc:postgresql:///testdb?TC_IMAGE_TAG=17',
        '  liquibase:',
        '    enabled: false',
        '',
        'logging:',
        '  level:',
        '    org.testcontainers: WARN',
      ].join('\n'),
    });
  }

  return actions;
}

/**
 * Generate frontend setup files.
 *
 * @param {object[]} gaps - Frontend gaps
 * @returns {object[]} ActionItem[] { file, action, content }
 */
function setupFrontend(gaps) {
  const actions = [];

  // vitest.config.ts
  if (gaps.some(g => g.name === 'vitest.config.ts')) {
    actions.push({
      file: 'vitest.config.ts',
      action: 'create',
      content: [
        "import { defineConfig } from 'vitest/config';",
        "import react from '@vitejs/plugin-react';",
        '',
        'export default defineConfig({',
        '  plugins: [react()],',
        '  test: {',
        "    environment: 'jsdom',",
        "    setupFiles: ['./src/test-setup.ts'],",
        "    include: ['**/*.test.{ts,tsx}'],",
        '    coverage: {',
        "      reporter: ['text', 'json', 'html'],",
        '    },',
        '  },',
        '});',
      ].join('\n'),
    });
  }

  // npm install commands for missing deps
  const depGaps = gaps.filter(g => g.category === 'frontend' && g.fix.startsWith('npm'));
  if (depGaps.length > 0) {
    actions.push({
      file: 'package.json',
      action: 'install',
      content: 'npm install --save-dev ' + depGaps.map(g => g.name).join(' '),
    });
  }

  return actions;
}

/**
 * Check if bootstrapping is needed for a module.
 *
 * @param {object} moduleContext
 * @returns {{needed: boolean, ready: boolean}}
 */
function checkBootstrapNeeded(moduleContext) {
  const cacheFile = path.join(
    moduleContext.cacheDir || path.join(moduleContext.pkgRoot, '.claude', 'cache', 'etf', moduleContext.moduleId || 'default'),
    'bootstrap-state.json'
  );

  if (fs.existsSync(cacheFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      return { needed: false, ready: state.ready || false };
    } catch {
      // Corrupt state file — re-check
    }
  }

  const gaps = detectGaps(moduleContext);
  const criticalGaps = gaps.filter(g => g.severity === 'critical');

  return {
    needed: criticalGaps.length > 0,
    ready: criticalGaps.length === 0,
  };
}

/**
 * Full bootstrap flow: detect → generate actions.
 *
 * @param {object} moduleContext
 * @returns {{status: string, gaps: object[], actions: object[]}}
 */
function runBootstrapper(moduleContext) {
  const gaps = detectGaps(moduleContext);

  if (gaps.length === 0) {
    return { status: 'ready', gaps: [], actions: [] };
  }

  const beGaps = gaps.filter(g => g.category === 'backend');
  const feGaps = gaps.filter(g => g.category === 'frontend');

  const actions = [
    ...setupBackend(beGaps),
    ...setupFrontend(feGaps),
  ];

  return { status: 'needs_setup', gaps, actions };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _findPomXml(root) {
  const candidates = [
    path.join(root, 'pom.xml'),
    path.join(root, 'backend', 'pom.xml'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function _findPackageJson(root) {
  const candidates = [
    path.join(root, 'package.json'),
    path.join(root, 'frontend', 'package.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function _hasFile(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

module.exports = { detectGaps, setupBackend, setupFrontend, checkBootstrapNeeded, runBootstrapper };
