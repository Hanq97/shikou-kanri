'use strict';

// init/detect.js — Stack Detector
// Probes local project files to detect tech stack (no HTTP calls, offline-only).

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} DetectResult
 * @property {boolean} detected          - Whether any stack was recognized
 * @property {string[]} stacks           - Detected stack IDs, e.g. ['java-springboot', 'typescript-nextjs']
 * @property {string} projectName        - Derived from package.json / pom.xml / directory name
 * @property {number} confidence         - 0.0–1.0 overall confidence score
 * @property {string|null} probeFile     - Primary probe file that triggered detection
 * @property {string|null} variant       - Sub-variant: 'reactive' | 'standard' | null
 */

/**
 * Read file safely; returns null on any error.
 * @param {string} filePath
 * @returns {string|null}
 */
function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return null;
  }
}

/**
 * Check whether a file path exists (file or directory).
 * @param {string} p
 * @returns {boolean}
 */
function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Derive project name from pom.xml <artifactId> or package.json "name".
 * Falls back to the directory name.
 * @param {string} projectDir
 * @returns {string}
 */
function deriveProjectName(projectDir) {
  // Try package.json first
  const pkgPath = path.join(projectDir, 'package.json');
  const pkgContent = safeRead(pkgPath);
  if (pkgContent) {
    try {
      const pkg = JSON.parse(pkgContent);
      if (pkg.name && typeof pkg.name === 'string') {
        return pkg.name;
      }
    } catch (_) { /* malformed JSON */ }
  }

  // Try pom.xml <artifactId>
  const pomPath = path.join(projectDir, 'pom.xml');
  const pomContent = safeRead(pomPath);
  if (pomContent) {
    const match = pomContent.match(/<artifactId>\s*([^<]+)\s*<\/artifactId>/);
    if (match) return match[1].trim();
  }

  // Fall back to directory name
  return path.basename(projectDir);
}

/**
 * Collect candidate build file paths for Java (monorepo-aware).
 * Searches root + one level of subdirectories (e.g. backend/).
 * @param {string} projectDir
 * @returns {string[]}
 */
function collectJavaBuildCandidates(projectDir) {
  const buildFiles = ['pom.xml', 'build.gradle', 'build.gradle.kts'];
  const candidates = [];

  // Root level
  for (const f of buildFiles) {
    candidates.push(path.join(projectDir, f));
  }

  // One level deep (monorepo sub-dirs like backend/)
  try {
    const entries = fs.readdirSync(projectDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      for (const f of buildFiles) {
        candidates.push(path.join(projectDir, entry.name, f));
      }
    }
  } catch (_) { /* ignore */ }

  return candidates;
}

/**
 * Probe for Java + Spring Boot.
 * Returns detection details or null if not found.
 * @param {string} projectDir
 * @returns {{ stack: string, variant: string, confidence: number, probeFile: string }|null}
 */
function probeJavaSpringBoot(projectDir) {
  const candidates = collectJavaBuildCandidates(projectDir);

  for (const candidate of candidates) {
    const buildContent = safeRead(candidate);
    if (!buildContent) continue;

    // Must contain spring-boot-starter
    if (!buildContent.includes('spring-boot-starter')) continue;

    // Reactive variant: r2dbc or webflux present
    const isReactive = buildContent.includes('r2dbc') ||
      buildContent.includes('webflux') ||
      buildContent.includes('spring-boot-starter-webflux');

    const variant = isReactive ? 'reactive' : 'standard';

    // Higher confidence for root-level pom.xml; slightly lower for nested
    const isRoot = path.dirname(candidate) === projectDir;
    const isPom = path.basename(candidate) === 'pom.xml';
    const confidence = (isPom ? 0.95 : 0.85) * (isRoot ? 1.0 : 0.97);

    return {
      stack: 'java-springboot',
      variant,
      confidence: parseFloat(confidence.toFixed(2)),
      probeFile: candidate
    };
  }

  return null;
}

/**
 * Probe for TypeScript + Next.js.
 * @param {string} projectDir
 * @returns {{ stack: string, variant: string, confidence: number, probeFile: string }|null}
 */
function probeNextJs(projectDir) {
  // Walk up to 2 levels for package.json (monorepo support)
  const candidates = [
    path.join(projectDir, 'package.json'),
    // Try common frontend sub-dirs
    path.join(projectDir, 'frontend', 'package.json'),
    path.join(projectDir, 'web', 'package.json'),
    path.join(projectDir, 'app', 'package.json')
  ];

  for (const pkgPath of candidates) {
    const content = safeRead(pkgPath);
    if (!content) continue;

    let pkg;
    try {
      pkg = JSON.parse(content);
    } catch (_) {
      continue;
    }

    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {})
    };

    if (!('next' in allDeps)) continue;

    // Determine variant: app-router (Next.js 13+) or pages-router
    const nextVersion = allDeps['next'] || '';
    const majorMatch = nextVersion.match(/\^?(\d+)/);
    const majorVersion = majorMatch ? parseInt(majorMatch[1], 10) : 0;
    const variant = majorVersion >= 13 ? 'app-router' : 'pages-router';

    // Check TypeScript
    const isTypeScript = 'typescript' in allDeps ||
      exists(path.join(path.dirname(pkgPath), 'tsconfig.json'));

    return {
      stack: isTypeScript ? 'typescript-nextjs' : 'javascript-nextjs',
      variant,
      confidence: 0.92,
      probeFile: pkgPath
    };
  }

  return null;
}

/**
 * Probe for C# / .NET (*.csproj files).
 * @param {string} projectDir
 * @returns {{ stack: string, variant: string, confidence: number, probeFile: string }|null}
 */
function probeDotNet(projectDir) {
  let foundCsproj = null;

  // Search root and one level deep
  const scanDirs = [projectDir];
  try {
    const entries = fs.readdirSync(projectDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        scanDirs.push(path.join(projectDir, entry.name));
      }
    }
  } catch (_) { /* ignore */ }

  for (const dir of scanDirs) {
    try {
      const files = fs.readdirSync(dir);
      const csproj = files.find(f => f.endsWith('.csproj'));
      if (csproj) {
        foundCsproj = path.join(dir, csproj);
        break;
      }
    } catch (_) { /* ignore */ }
  }

  if (!foundCsproj) return null;

  const content = safeRead(foundCsproj) || '';

  // Determine framework version
  const fwMatch = content.match(/<TargetFramework>\s*(net[\d.]+)\s*<\/TargetFramework>/);
  const variant = fwMatch ? fwMatch[1] : 'unknown';

  return {
    stack: 'csharp-dotnet',
    variant,
    confidence: 0.90,
    probeFile: foundCsproj
  };
}

/**
 * Main stack detection function.
 *
 * Probes local files only (no HTTP). Supports fullstack detection
 * (e.g. Java backend + Next.js frontend in same repo).
 *
 * @param {string} projectDir - Absolute path to the project root
 * @returns {DetectResult}
 */
function detectStack(projectDir) {
  if (!projectDir || typeof projectDir !== 'string') {
    throw new Error('detectStack: projectDir must be a non-empty string');
  }

  // Verify directory exists
  if (!exists(projectDir)) {
    throw new Error(`detectStack: directory does not exist: ${projectDir}`);
  }

  const results = [];

  // Run all probes
  const probeJava = probeJavaSpringBoot(projectDir);
  if (probeJava) results.push(probeJava);

  const probeNext = probeNextJs(projectDir);
  if (probeNext) results.push(probeNext);

  const probeDn = probeDotNet(projectDir);
  if (probeDn) results.push(probeDn);

  const projectName = deriveProjectName(projectDir);

  if (results.length === 0) {
    return {
      detected: false,
      stacks: [],
      projectName,
      confidence: 0,
      probeFile: null,
      variant: null
    };
  }

  // Build stacks array
  const stacks = results.map(r => r.stack);

  // Overall confidence = average of individual confidences
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  // Primary probe file = highest confidence probe
  const primary = results.sort((a, b) => b.confidence - a.confidence)[0];

  return {
    detected: true,
    stacks,
    projectName,
    confidence: parseFloat(avgConfidence.toFixed(2)),
    probeFile: primary.probeFile,
    variant: primary.variant
  };
}

module.exports = { detectStack };
