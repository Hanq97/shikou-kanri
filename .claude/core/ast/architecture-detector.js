'use strict';

const path = require('path');
const fs = require('fs');
const { minimatch } = require('minimatch');

/**
 * Architecture Detector - Architecture-agnostic code analysis
 *
 * WHY: RAG needs to understand architecture context for precise queries
 * HOW: Auto-detect architecture pattern, then analyze layers accordingly
 *
 * SUPPORTED ARCHITECTURES:
 * - Clean Architecture (Uncle Bob)
 * - Hexagonal / Ports & Adapters (Alistair Cockburn)
 * - Onion Architecture (Jeffrey Palermo)
 * - Vertical Slices (Jimmy Bogard)
 * - Feature-Sliced Design (Frontend)
 * - MVC, MVVM, MTV (Django)
 * - CQRS, DDD, Modular Monolith
 * - Traditional Layered (N-Tier)
 *
 * Usage:
 * - detectArchitecturePattern(sourceRoot, stack) → { pattern, confidence, evidence }
 * - detectLayer(ast, stack, pattern) → { layer, confidence, evidence }
 * - detectDatabasePattern(ast, stack) → { technology, pattern, reactive }
 * - enrichASTWithArchitecture(ast, stack, pattern) → enriched AST
 *
 * @module architecture-detector
 * @version 2.0
 */

// Load architecture definitions from defaults (single source of truth)
const ARCH_DEFS_PATH = path.resolve(__dirname, '../../defaults/config/architecture-definitions.json');
let archDefinitions = null;

function loadArchitectureDefinitions() {
  if (archDefinitions) return archDefinitions;

  try {
    const content = fs.readFileSync(ARCH_DEFS_PATH, 'utf8');
    archDefinitions = JSON.parse(content);
    return archDefinitions;
  } catch (err) {
    console.warn(`[ArchitectureDetector] Failed to load definitions: ${err.message}`);
    return null;
  }
}

/**
 * Resolve architecture pattern key from project config.
 * Checks multiple config locations and normalizes friendly names to pattern keys.
 * @param {object} projectConfig - Project config object
 * @param {string} stack - Stack identifier (e.g., 'java-spring-boot')
 * @returns {string|null} Normalized pattern key or null
 */
function resolvePatternFromConfig(projectConfig, stack) {
  if (!projectConfig) return null;

  // Friendly name → pattern key mapping
  const nameToKey = {
    'clean architecture': 'clean-architecture',
    'clean architecture + hexagonal': 'clean-architecture',
    'hexagonal': 'hexagonal',
    'ports & adapters': 'hexagonal',
    'ports and adapters': 'hexagonal',
    'onion': 'onion',
    'onion architecture': 'onion',
    'layered': 'layered',
    'n-tier': 'layered',
    'vertical slices': 'vertical-slices',
    'feature-sliced design': 'feature-sliced-design',
    'mvc': 'mvc',
    'mvvm': 'mvvm',
    'cqrs': 'cqrs',
    'ddd': 'ddd',
    'modular monolith': 'modular-monolith',
  };

  function normalize(value) {
    if (!value || typeof value !== 'string') return null;
    // Try exact match first
    if (value.match(/^[a-z-]+$/)) return value;
    // Then try friendly name mapping
    const lower = value.toLowerCase().trim();
    return nameToKey[lower] || null;
  }

  // Location 1: projectConfig.architecture.pattern (direct)
  let raw = projectConfig.architecture?.pattern;
  let resolved = normalize(raw);
  if (resolved) return resolved;

  // Location 2: sourceRoots — find matching root by stack key
  const roots = projectConfig.sourceRoots || [];
  for (const root of roots) {
    if (stack && (root.stackKey || root.stack) === stack) {
      resolved = normalize(root.architecture);
      if (resolved) return resolved;
    }
  }

  // Location 3: try all sourceRoots as fallback
  for (const root of roots) {
    resolved = normalize(root.architecture);
    if (resolved) return resolved;
  }

  return null;
}

/**
 * Auto-detect architecture pattern from source root
 *
 * Detection order:
 * 1. Check project-config.json for explicit architecture
 * 2. Scan directory structure for pattern indicators
 * 3. Fallback to "layered" if no pattern detected
 *
 * @param {string} sourceRoot - Root directory to analyze
 * @param {string} stack - Stack identifier (e.g., 'java-spring-boot')
 * @param {object} projectConfig - Optional project config with explicit architecture
 * @returns {ArchitectureDetectionResult}
 */
function detectArchitecturePattern(sourceRoot, stack, projectConfig = null) {
  const defs = loadArchitectureDefinitions();
  if (!defs) {
    return { pattern: 'layered', confidence: 0.5, evidence: ['Default fallback'] };
  }

  const stackDef = defs.stackDefinitions[stack];
  if (!stackDef) {
    return { pattern: 'layered', confidence: 0.5, evidence: [`Stack '${stack}' not configured`] };
  }

  // 1. Check explicit project config (multiple locations)
  const configPattern = resolvePatternFromConfig(projectConfig, stack);
  if (configPattern && stackDef.supportedArchitectures.includes(configPattern)) {
    return {
      pattern: configPattern,
      confidence: 1.0,
      evidence: ['Explicitly configured in project-config.json'],
      source: 'config'
    };
  }

  // 2. Auto-detect from directory structure
  const autoDetectionConfigs = stackDef.autoDetection || {};
  const detectionResults = [];

  for (const [pattern, config] of Object.entries(autoDetectionConfigs)) {
    const result = checkPatternMatch(sourceRoot, pattern, config);
    if (result.matched) {
      detectionResults.push({
        pattern,
        confidence: config.confidence || 0.7,
        evidence: result.evidence
      });
    }
  }

  // Sort by confidence
  detectionResults.sort((a, b) => b.confidence - a.confidence);

  if (detectionResults.length > 0) {
    const best = detectionResults[0];
    return {
      pattern: best.pattern,
      confidence: best.confidence,
      evidence: best.evidence,
      alternatives: detectionResults.slice(1),
      source: 'auto-detection'
    };
  }

  // 3. Fallback
  const fallback = defs.detectionStrategy?.fallback || 'layered';
  return {
    pattern: fallback,
    confidence: 0.5,
    evidence: ['No specific pattern detected, using fallback'],
    source: 'fallback'
  };
}

/**
 * Check if source directory matches an architecture pattern
 */
function checkPatternMatch(sourceRoot, patternName, config) {
  const evidence = [];
  let matched = false;

  // Check required directories
  if (config.requiredDirs) {
    const foundDirs = config.requiredDirs.filter(dir => {
      const fullPath = path.join(sourceRoot, dir);
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    });

    if (foundDirs.length === config.requiredDirs.length) {
      matched = true;
      evidence.push(`Found all required dirs: ${foundDirs.join(', ')}`);
    } else if (foundDirs.length > 0) {
      evidence.push(`Found ${foundDirs.length}/${config.requiredDirs.length} dirs: ${foundDirs.join(', ')}`);
    }
  }

  // Check alternative directories
  if (!matched && config.alternativeDirs) {
    const foundAltDirs = config.alternativeDirs.filter(dir => {
      const fullPath = path.join(sourceRoot, dir);
      return fs.existsSync(fullPath);
    });

    if (foundAltDirs.length >= 2) {
      matched = true;
      evidence.push(`Found alternative dirs: ${foundAltDirs.join(', ')}`);
    }
  }

  // Check required projects (for .NET)
  if (config.requiredProjects) {
    try {
      const files = fs.readdirSync(sourceRoot);
      const matchedProjects = config.requiredProjects.filter(p =>
        files.some(f => minimatch(f, p))
      );

      if (matchedProjects.length === config.requiredProjects.length) {
        matched = true;
        evidence.push(`Found project structure matching ${patternName}`);
      }
    } catch (err) {
      // Ignore directory read errors
    }
  }

  // Check file patterns
  if (config.requiredPattern) {
    if (checkFilePattern(sourceRoot, config.requiredPattern)) {
      matched = true;
      evidence.push(`Found file pattern: ${config.requiredPattern}`);
    }
  }

  // Check required files
  if (config.requiredFiles) {
    const foundFiles = config.requiredFiles.filter(file => {
      return findFileRecursive(sourceRoot, file) !== null;
    });

    if (foundFiles.length === config.requiredFiles.length) {
      matched = true;
      evidence.push(`Found required files: ${foundFiles.join(', ')}`);
    }
  }

  return { matched, evidence };
}

/**
 * Find file recursively in directory (limited depth)
 */
function findFileRecursive(dir, filename, maxDepth = 3, currentDepth = 0) {
  if (currentDepth > maxDepth) return null;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === filename) {
        return path.join(dir, filename);
      }

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const result = findFileRecursive(
          path.join(dir, entry.name),
          filename,
          maxDepth,
          currentDepth + 1
        );
        if (result) return result;
      }
    }
  } catch (err) {
    // Ignore directory read errors
  }

  return null;
}

/**
 * Check if file pattern exists (glob-like)
 */
function checkFilePattern(sourceRoot, pattern) {
  function checkDir(dir, depth = 0) {
    if (depth > 5) return false;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(sourceRoot, fullPath).replace(/\\/g, '/');

        if (minimatch(relativePath, pattern)) {
          return true;
        }

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          if (checkDir(fullPath, depth + 1)) return true;
        }
      }
    } catch (err) {
      // Ignore errors
    }

    return false;
  }

  return checkDir(sourceRoot);
}

/**
 * Detect architecture layer for a parsed AST
 *
 * @param {UnifiedAST} ast - Parsed AST from parser
 * @param {string} stack - Stack identifier
 * @param {string} pattern - Detected architecture pattern
 * @returns {LayerDetectionResult}
 */
function detectLayer(ast, stack, pattern = null) {
  const defs = loadArchitectureDefinitions();
  if (!defs) {
    return { layer: null, confidence: 0, evidence: [] };
  }

  const stackDef = defs.stackDefinitions[stack];
  if (!stackDef) {
    return { layer: null, confidence: 0, evidence: ['Stack not configured'] };
  }

  // Use detected or fallback pattern
  const archPattern = pattern || 'layered';
  const layerMappings = stackDef.layerMappings?.[archPattern];

  if (!layerMappings) {
    return {
      layer: null,
      confidence: 0,
      evidence: [`No layer mappings for ${archPattern} in ${stack}`]
    };
  }

  const filePath = ast.filePath.replace(/\\/g, '/');
  const evidence = [];
  const scores = {};

  // Initialize scores for each layer
  for (const layerName of Object.keys(layerMappings)) {
    scores[layerName] = 0;
  }

  // Check each layer
  for (const [layerName, layerConfig] of Object.entries(layerMappings)) {
    // 1. Path pattern matching (highest priority)
    if (layerConfig.pathPatterns) {
      for (const pattern of layerConfig.pathPatterns) {
        if (matchPathPattern(filePath, pattern)) {
          scores[layerName] += 50;
          evidence.push(`Path matches ${layerName}: ${pattern}`);
        }
      }
    }

    // 2. Marker/Annotation matching
    if (layerConfig.markers && ast.classes) {
      for (const cls of ast.classes) {
        for (const marker of cls.markers || []) {
          if (layerConfig.markers.includes(marker.name) ||
              layerConfig.markers.includes(`@${marker.name}`)) {
            scores[layerName] += 40;
            evidence.push(`Marker @${marker.name} indicates ${layerName}`);
          }
        }
      }
    }

    // 3. Decorators matching (TypeScript)
    if (layerConfig.decorators && ast.classes) {
      for (const cls of ast.classes) {
        for (const marker of cls.markers || []) {
          if (layerConfig.decorators.includes(marker.name) ||
              layerConfig.decorators.includes(`@${marker.name}`)) {
            scores[layerName] += 40;
            evidence.push(`Decorator @${marker.name} indicates ${layerName}`);
          }
        }
      }
    }

    // 4. Base class matching
    if (layerConfig.baseClasses && ast.classes) {
      for (const cls of ast.classes) {
        if (cls.extends && layerConfig.baseClasses.includes(cls.extends)) {
          scores[layerName] += 35;
          evidence.push(`Extends ${cls.extends} indicates ${layerName}`);
        }
      }
    }

    // 5. Interface matching
    if (layerConfig.interfaces && ast.classes) {
      for (const cls of ast.classes) {
        for (const iface of cls.implements || []) {
          if (layerConfig.interfaces.includes(iface)) {
            scores[layerName] += 30;
            evidence.push(`Implements ${iface} indicates ${layerName}`);
          }
        }
      }
    }

    // 6. Name suffix matching
    if (layerConfig.nameSuffix && ast.classes) {
      for (const cls of ast.classes) {
        for (const suffix of layerConfig.nameSuffix) {
          if (cls.name.endsWith(suffix)) {
            scores[layerName] += 25;
            evidence.push(`Class ${cls.name} has suffix ${suffix} → ${layerName}`);
          }
        }
      }
    }

    // 7. Attributes matching (for C#)
    if (layerConfig.attributes && ast.classes) {
      for (const cls of ast.classes) {
        for (const marker of cls.markers || []) {
          if (layerConfig.attributes.includes(marker.name)) {
            scores[layerName] += 40;
            evidence.push(`Attribute [${marker.name}] indicates ${layerName}`);
          }
        }
      }
    }

    // 8. Export patterns matching (for TypeScript)
    if (layerConfig.exportPatterns && ast.exports) {
      for (const exp of ast.exports) {
        for (const pattern of layerConfig.exportPatterns) {
          if (matchExportPattern(exp, pattern)) {
            scores[layerName] += 20;
            evidence.push(`Export ${exp} matches ${layerName} pattern`);
          }
        }
      }
    }

    // 9. File extensions matching
    if (layerConfig.extensions && ast.filePath) {
      const ext = path.extname(ast.filePath);
      if (layerConfig.extensions.includes(ext)) {
        scores[layerName] += 15;
        evidence.push(`File extension ${ext} matches ${layerName}`);
      }
    }
  }

  // Find the layer with highest score
  let bestLayer = null;
  let bestScore = 0;
  for (const [layerName, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLayer = layerName;
    }
  }

  // Calculate confidence (0-100)
  const maxPossibleScore = 200;
  const confidence = Math.min(100, Math.round((bestScore / maxPossibleScore) * 100));

  return {
    layer: bestLayer,
    layerConfig: bestLayer ? layerMappings[bestLayer] : null,
    architecturePattern: archPattern,
    confidence,
    evidence,
    scores
  };
}

/**
 * Match export name against pattern
 */
function matchExportPattern(exportName, pattern) {
  return minimatch(exportName, pattern);
}

/**
 * Detect database access pattern from AST
 *
 * @param {UnifiedAST} ast - Parsed AST
 * @param {string} stack - Stack identifier
 * @returns {DatabasePatternResult}
 */
function detectDatabasePattern(ast, stack) {
  const defs = loadArchitectureDefinitions();
  if (!defs) {
    return { technology: null, pattern: null, reactive: false, evidence: [] };
  }

  const stackDef = defs.stackDefinitions[stack];
  if (!stackDef || !stackDef.databasePatterns) {
    return { technology: null, pattern: null, reactive: false, evidence: [] };
  }

  const evidence = [];
  let detected = {
    technology: null,
    pattern: null,
    reactive: false,
    evidence: []
  };

  // Check each database pattern
  for (const [dbName, dbConfig] of Object.entries(stackDef.databasePatterns)) {
    const detection = dbConfig.detection || {};
    let matchScore = 0;

    // Check interfaces
    if (detection.interfaces && ast.classes) {
      for (const cls of ast.classes) {
        for (const iface of cls.implements || []) {
          if (detection.interfaces.some(i => iface.includes(i))) {
            matchScore += 10;
            evidence.push(`Implements ${iface} → ${dbName}`);
          }
        }
      }
    }

    // Check base classes
    if (detection.baseClasses && ast.classes) {
      for (const cls of ast.classes) {
        if (cls.extends && detection.baseClasses.includes(cls.extends)) {
          matchScore += 10;
          evidence.push(`Extends ${cls.extends} → ${dbName}`);
        }
      }
    }

    // Check imports
    if (detection.imports && ast.imports) {
      for (const imp of ast.imports) {
        if (detection.imports.some(i => imp.source.includes(i))) {
          matchScore += 5;
          evidence.push(`Imports ${imp.source} → ${dbName}`);
        }
      }
    }

    // Check classes
    if (detection.classes && ast.classes) {
      for (const cls of ast.classes) {
        if (detection.classes.includes(cls.name)) {
          matchScore += 10;
          evidence.push(`Uses ${cls.name} → ${dbName}`);
        }
      }
    }

    // Check return types (for reactive detection)
    if (detection.returnTypes && ast.classes) {
      for (const cls of ast.classes) {
        for (const method of cls.methods || []) {
          if (method.returnType && detection.returnTypes.some(rt =>
            method.returnType.includes(rt))) {
            matchScore += 5;
            evidence.push(`${method.name} returns ${method.returnType} → Reactive`);
          }
        }
      }
    }

    // Check annotations
    if (detection.annotations && ast.classes) {
      for (const cls of ast.classes) {
        for (const marker of cls.markers || []) {
          if (detection.annotations.includes(marker.name) ||
              detection.annotations.includes(`@${marker.name}`)) {
            matchScore += 5;
            evidence.push(`Has ${marker.name} → ${dbName}`);
          }
        }
      }
    }

    // Check traits (for PHP)
    if (detection.traits && ast.classes) {
      for (const cls of ast.classes) {
        for (const trait of cls.traits || []) {
          if (detection.traits.includes(trait)) {
            matchScore += 5;
            evidence.push(`Uses trait ${trait} → ${dbName}`);
          }
        }
      }
    }

    if (matchScore > 0 && matchScore > (detected.matchScore || 0)) {
      detected = {
        technology: dbConfig.technology,
        pattern: dbConfig.pattern || 'Repository',
        reactive: dbConfig.reactive || false,
        customPatterns: dbConfig.customPatterns || null,
        matchScore,
        evidence: [...evidence]
      };
    }
  }

  return detected;
}

/**
 * Detect dependency rule violations based on architecture pattern
 *
 * @param {UnifiedAST} ast - Parsed AST with layer info
 * @param {Map<string, object>} fileLayerMap - Map of filePath → layer info
 * @param {string} pattern - Architecture pattern
 * @returns {DependencyViolation[]}
 */
function detectDependencyViolations(ast, fileLayerMap, pattern = 'clean-architecture') {
  const violations = [];
  const defs = loadArchitectureDefinitions();

  if (!ast.layer || !defs) {
    return violations;
  }

  // Get dependency rules for the pattern
  const archPattern = defs.architecturePatterns[pattern];
  if (!archPattern) {
    return violations;
  }

  const dependencyRule = archPattern.dependencyRule;
  const layers = archPattern.layers;
  const coreLayer = archPattern.coreLayer;

  const currentLayer = ast.layer;
  const currentLayerIndex = layers.indexOf(currentLayer);

  // Check imports for violations based on dependency rule
  for (const imp of ast.imports || []) {
    const importedFilePath = resolveImportPath(imp.source, ast.filePath);
    const importedLayerInfo = fileLayerMap.get(importedFilePath);
    const importedLayer = importedLayerInfo?.layer;

    if (!importedLayer || importedLayer === currentLayer) continue;

    const importedLayerIndex = layers.indexOf(importedLayer);
    let isViolation = false;
    let violationType = null;

    switch (dependencyRule) {
      case 'inward-only':
        // Outer layers can only depend on inner layers (toward core)
        // For Clean Architecture: presentation → application → domain (inward)
        // domain (index 0) is innermost, presentation (index 3) is outermost
        if (currentLayerIndex < importedLayerIndex) {
          // Inner layer depends on outer layer - VIOLATION
          isViolation = true;
          violationType = 'INWARD_DEPENDENCY_VIOLATION';
        }
        break;

      case 'downward-only':
        // Traditional layered: can only depend on lower layers
        if (currentLayerIndex < importedLayerIndex) {
          isViolation = true;
          violationType = 'DOWNWARD_DEPENDENCY_VIOLATION';
        }
        break;

      case 'ports-only':
        // Hexagonal: adapters can only depend on domain through ports
        if (currentLayer === 'adapters' && importedLayer === 'domain') {
          // Check if going through ports
          if (!imp.source.includes('ports')) {
            isViolation = true;
            violationType = 'DIRECT_DOMAIN_ACCESS';
          }
        }
        break;

      case 'layer-import-only-below':
        // Feature-Sliced Design: can only import from lower layers
        if (currentLayerIndex > importedLayerIndex) {
          isViolation = true;
          violationType = 'FSD_LAYER_VIOLATION';
        }
        break;

      case 'segregated':
        // CQRS: commands and queries should be segregated
        if ((currentLayer === 'commands' && importedLayer === 'queries') ||
            (currentLayer === 'queries' && importedLayer === 'commands')) {
          isViolation = true;
          violationType = 'CQRS_SEGREGATION_VIOLATION';
        }
        break;
    }

    if (isViolation) {
      violations.push({
        type: violationType,
        rule: dependencyRule,
        from: {
          file: ast.filePath,
          layer: currentLayer
        },
        to: {
          file: importedFilePath,
          layer: importedLayer
        },
        import: imp.source,
        message: `${currentLayer} should not depend on ${importedLayer} (${dependencyRule} rule)`,
        severity: currentLayer === coreLayer ? 'error' : 'warning'
      });
    }
  }

  return violations;
}

/**
 * Enrich AST with architecture metadata
 *
 * @param {UnifiedAST} ast - Parsed AST
 * @param {string} stack - Stack identifier
 * @param {string} pattern - Detected architecture pattern (optional)
 * @returns {EnrichedAST}
 */
function enrichASTWithArchitecture(ast, stack, pattern = null) {
  // Detect layer
  const layerResult = detectLayer(ast, stack, pattern);

  // Detect database pattern (if applicable)
  let dbPattern = null;
  if (layerResult.layer === 'infrastructure' ||
      layerResult.layer === 'data' ||
      layerResult.layer === 'adapters') {
    dbPattern = detectDatabasePattern(ast, stack);
  }

  // Build architecture metadata
  const architecture = {
    stack,
    pattern: layerResult.architecturePattern,
    layer: layerResult.layer,
    stereotype: layerResult.layerConfig?.stereotype || null,
    confidence: layerResult.confidence,
    evidence: layerResult.evidence,
    databaseAccess: dbPattern
  };

  // Add architecture info to each class
  for (const cls of ast.classes || []) {
    cls.architecture = {
      layer: layerResult.layer,
      pattern: layerResult.architecturePattern,
      nodeType: layerResult.layerConfig?.stereotype || detectClassNodeType(cls, stack),
      stereotype: detectStereotype(cls, stack)
    };
  }

  return {
    ...ast,
    architecture
  };
}

/**
 * Detect stereotype for a class (Controller, Service, Repository, Entity, etc.)
 */
function detectStereotype(cls, stack) {
  const markers = cls.markers?.map(m => m.name) || [];
  const name = cls.name;
  const baseClass = cls.extends;
  const interfaces = cls.implements || [];
  const traits = cls.traits || [];

  // Spring Boot stereotypes
  if (stack === 'java-spring-boot') {
    if (markers.includes('RestController') || markers.includes('Controller')) {
      return 'Controller';
    }
    if (markers.includes('Service')) {
      return 'Service';
    }
    if (markers.includes('Repository') ||
        interfaces.some(i => i.includes('Repository'))) {
      return 'Repository';
    }
    if (markers.includes('Entity') || markers.includes('Table')) {
      return 'Entity';
    }
    if (markers.includes('Configuration')) {
      return 'Configuration';
    }
    if (markers.includes('Component')) {
      return 'Component';
    }
  }

  // .NET Core stereotypes
  if (stack === 'csharp-dotnet-core') {
    if (markers.includes('ApiController') || name.endsWith('Controller')) {
      return 'Controller';
    }
    if (name.endsWith('Service') || name.endsWith('Handler')) {
      return 'Service';
    }
    if (name.endsWith('Repository')) {
      return 'Repository';
    }
    if (markers.includes('Table') || baseClass === 'EntityBase') {
      return 'Entity';
    }
    // Vertical slices
    if (name.endsWith('Command') || name.endsWith('Query')) {
      return 'CQRS';
    }
  }

  // Laravel stereotypes
  if (stack === 'php-laravel') {
    if (name.endsWith('Controller')) {
      return 'Controller';
    }
    if (name.endsWith('Service') || name.endsWith('Action')) {
      return 'Service';
    }
    if (name.endsWith('Repository')) {
      return 'Repository';
    }
    if (baseClass === 'Model' || baseClass === 'Authenticatable') {
      return 'Model';
    }
    if (name.endsWith('Job') || interfaces.includes('ShouldQueue')) {
      return 'Job';
    }
    if (baseClass === 'FormRequest') {
      return 'FormRequest';
    }
    if (traits.includes('HasFactory')) {
      return 'Model';
    }
  }

  // Next.js / React stereotypes
  if (stack === 'typescript-nextjs' || stack === 'typescript-react') {
    if (name.endsWith('RepositoryImpl')) {
      return 'Repository';
    }
    if (name.includes('Usecase') || name.includes('UseCase')) {
      return 'UseCase';
    }
    if (name.endsWith('Api') || name.endsWith('Client')) {
      return 'ApiClient';
    }
    if (name.endsWith('Slice')) {
      return 'ReduxSlice';
    }
  }

  // NestJS stereotypes
  if (stack === 'typescript-nestjs') {
    if (markers.includes('Controller')) {
      return 'Controller';
    }
    if (markers.includes('Injectable')) {
      if (name.endsWith('Service')) return 'Service';
      if (name.endsWith('Repository')) return 'Repository';
      if (name.endsWith('Guard')) return 'Guard';
      return 'Provider';
    }
    if (markers.includes('Module')) {
      return 'Module';
    }
  }

  // FastAPI / Django stereotypes
  if (stack === 'python-fastapi' || stack === 'python-django') {
    if (name.endsWith('Router') || name.endsWith('View')) {
      return 'Router';
    }
    if (name.endsWith('Service')) {
      return 'Service';
    }
    if (name.endsWith('Repository')) {
      return 'Repository';
    }
    if (baseClass === 'Model' || baseClass === 'Base') {
      return 'Model';
    }
  }

  // Fallback: infer from name
  if (name.endsWith('Controller') || name.endsWith('Resource')) return 'Controller';
  if (name.endsWith('Service') || name.endsWith('ServiceImpl')) return 'Service';
  if (name.endsWith('Repository') || name.endsWith('Repo')) return 'Repository';
  if (name.endsWith('Entity') || markers.includes('Entity')) return 'Entity';
  if (name.endsWith('DTO') || name.endsWith('Dto')) return 'DTO';
  if (name.endsWith('Mapper')) return 'Mapper';
  if (name.endsWith('Config') || name.endsWith('Configuration')) return 'Configuration';
  if (name.endsWith('Handler')) return 'Handler';
  if (name.endsWith('Command')) return 'Command';
  if (name.endsWith('Query')) return 'Query';

  return 'Class';
}

/**
 * Get node type for a class based on stereotype
 */
function detectClassNodeType(cls, stack) {
  const stereotype = detectStereotype(cls, stack);

  const nodeTypeMap = {
    'Controller': 'PresentationController',
    'Router': 'PresentationController',
    'Service': 'ApplicationService',
    'Handler': 'ApplicationService',
    'Repository': 'InfrastructureAdapter',
    'Entity': 'DomainEntity',
    'Model': 'DomainEntity',
    'DTO': 'DataTransferObject',
    'Mapper': 'Mapper',
    'Configuration': 'ConfigurationComponent',
    'Job': 'BackgroundJob',
    'FormRequest': 'RequestValidator',
    'UseCase': 'UseCase',
    'ApiClient': 'InfrastructureAdapter',
    'ReduxSlice': 'StateManagement',
    'Module': 'Module',
    'Guard': 'SecurityComponent',
    'Provider': 'Component',
    'Command': 'Command',
    'Query': 'Query',
    'CQRS': 'CQRSComponent'
  };

  return nodeTypeMap[stereotype] || 'Component';
}

/**
 * Match file path against glob-like pattern
 */
function matchPathPattern(filePath, pattern) {
  return minimatch(filePath.replace(/\\/g, '/'), pattern);
}

/**
 * Resolve import path to absolute path (simplified)
 */
function resolveImportPath(importSource, currentFile) {
  if (importSource.startsWith('.')) {
    const currentDir = path.dirname(currentFile);
    return path.resolve(currentDir, importSource);
  }
  return importSource;
}

/**
 * Get architecture summary for a list of files
 */
function getArchitectureSummary(enrichedASTs) {
  const summary = {
    totalFiles: enrichedASTs.length,
    patterns: {},
    byLayer: {},
    byStereotype: {},
    databasePatterns: new Set(),
    violations: []
  };

  for (const ast of enrichedASTs) {
    // Count by pattern
    const pattern = ast.architecture?.pattern || 'unknown';
    summary.patterns[pattern] = (summary.patterns[pattern] || 0) + 1;

    // Count by layer
    const layer = ast.architecture?.layer || 'unknown';
    summary.byLayer[layer] = (summary.byLayer[layer] || 0) + 1;

    // Count by stereotype
    for (const cls of ast.classes || []) {
      const stereotype = cls.architecture?.stereotype || 'unknown';
      summary.byStereotype[stereotype] = (summary.byStereotype[stereotype] || 0) + 1;
    }

    // Collect database patterns
    if (ast.architecture?.databaseAccess?.technology) {
      summary.databasePatterns.add(ast.architecture.databaseAccess.technology);
    }
  }

  summary.databasePatterns = Array.from(summary.databasePatterns);
  return summary;
}

/**
 * Get supported architecture patterns for a stack
 */
function getSupportedArchitectures(stack) {
  const defs = loadArchitectureDefinitions();
  if (!defs) return [];

  const stackDef = defs.stackDefinitions[stack];
  return stackDef?.supportedArchitectures || [];
}

/**
 * Get all available architecture patterns
 */
function getAllArchitecturePatterns() {
  const defs = loadArchitectureDefinitions();
  if (!defs) return {};
  return defs.architecturePatterns;
}

/**
 * Get constraints for a specific layer in an architecture pattern
 *
 * @param {string} layer - Layer name: 'domain' | 'application' | 'infrastructure' | 'presentation'
 * @param {string} pattern - Architecture pattern (default: 'clean-architecture')
 * @param {string} stack - Stack identifier (default: null)
 * @returns {LayerConstraints} Constraint object with confidence score
 *
 * @example
 * const constraints = getLayerConstraints('application', 'clean-architecture', 'java-spring-boot');
 * // Returns:
 * // {
 * //   layer: 'application',
 * //   pattern: 'clean-architecture',
 * //   stack: 'java-spring-boot',
 * //   allowedDependencies: ['Repository', 'Entity', 'DTO', 'Mapper', 'Port'],
 * //   forbiddenDependencies: ['Controller', 'Configuration', 'WebClient'],
 * //   requiredMarkers: ['@Service', '@Transactional', '@Slf4j'],
 * //   returnTypePatterns: ['Mono<*>', 'Flux<*>'],
 * //   responsibilities: ['Business logic', 'Use cases', 'Orchestration', ...],
 * //   confidence: 1.0
 * // }
 */
function getLayerConstraints(layer, pattern = 'clean-architecture', stack = null) {
  // 1. Load definitions
  const defs = loadArchitectureDefinitions();
  if (!defs) {
    console.warn('[architecture-detector] No definitions found, using defaults');
    return getDefaultConstraints(layer);
  }

  // 2. Get pattern-specific constraints
  const archPattern = defs.architecturePatterns?.[pattern];
  if (!archPattern?.layerConstraints?.[layer]) {
    console.warn(`[architecture-detector] No constraints for ${pattern}/${layer}, using defaults`);
    return getDefaultConstraints(layer);
  }

  const baseConstraints = archPattern.layerConstraints[layer];

  // 3. Apply stack-specific overrides
  let finalConstraints = { ...baseConstraints };

  if (stack) {
    const stackDef = defs.stackDefinitions?.[stack];
    const overrides = stackDef?.layerConstraintOverrides?.[pattern]?.[layer];

    if (overrides) {
      finalConstraints = mergeConstraints(baseConstraints, overrides);
    }
  }

  // 4. Return normalized result
  return {
    layer,
    pattern,
    stack,
    allowedDependencies: finalConstraints.allowedDependencies || [],
    forbiddenDependencies: finalConstraints.forbiddenDependencies || [],
    requiredMarkers: finalConstraints.requiredMarkers || [],
    returnTypePatterns: finalConstraints.returnTypePatterns || null,
    responsibilities: finalConstraints.responsibilities || [],
    confidence: 1.0
  };
}

/**
 * Default constraints when no definition found
 * @private
 */
function getDefaultConstraints(layer) {
  const defaults = {
    domain: {
      allowedDependencies: [],
      forbiddenDependencies: ['Controller', 'Repository', 'Service'],
      requiredMarkers: [],
      returnTypePatterns: null,
      responsibilities: ['Business entities']
    },
    application: {
      allowedDependencies: ['Repository', 'Entity', 'DTO'],
      forbiddenDependencies: ['Controller'],
      requiredMarkers: ['@Service'],
      returnTypePatterns: ['Mono<*>', 'Flux<*>'],
      responsibilities: ['Business logic']
    },
    infrastructure: {
      allowedDependencies: ['Entity'],
      forbiddenDependencies: ['Controller', 'Service'],
      requiredMarkers: ['@Repository'],
      returnTypePatterns: ['Mono<*>', 'Flux<*>'],
      responsibilities: ['Data access']
    },
    presentation: {
      allowedDependencies: ['Service', 'DTO'],
      forbiddenDependencies: ['Repository', 'Entity'],
      requiredMarkers: ['@RestController'],
      returnTypePatterns: ['Mono<ResponseEntity<*>>'],
      responsibilities: ['HTTP handling']
    }
  };

  return {
    layer,
    pattern: 'default',
    stack: null,
    ...(defaults[layer] || defaults.application),
    confidence: 0.5  // Lower confidence for defaults
  };
}

/**
 * Merge base constraints with stack-specific overrides
 * @private
 */
function mergeConstraints(base, overrides) {
  return {
    allowedDependencies: overrides.allowedDependencies || base.allowedDependencies,
    forbiddenDependencies: overrides.forbiddenDependencies || base.forbiddenDependencies,
    requiredMarkers: [
      ...(base.requiredMarkers || []),
      ...(overrides.additionalMarkers || [])
    ],
    returnTypePatterns: overrides.returnTypePatterns || base.returnTypePatterns,
    responsibilities: [
      ...(base.responsibilities || []),
      ...(overrides.additionalResponsibilities || [])
    ]
  };
}

module.exports = {
  // Detection
  detectArchitecturePattern,
  detectLayer,
  detectDatabasePattern,
  detectDependencyViolations,

  // Enrichment
  enrichASTWithArchitecture,
  detectStereotype,
  detectClassNodeType,

  // Summary
  getArchitectureSummary,
  getSupportedArchitectures,
  getAllArchitecturePatterns,

  // Layer constraints
  getLayerConstraints,
  getDefaultConstraints,

  // Utilities
  loadArchitectureDefinitions
};
