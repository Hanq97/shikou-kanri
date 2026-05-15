'use strict';

/**
 * Source Code Extractor - AST-light extraction for Knowledge Graph.
 * Uses regex patterns to extract classes, functions, imports from TypeScript/TSX.
 * Generates graph nodes (CLS-*, FN-*, SRC-*) and edges (REALIZES, SERVES, DEFINED_IN, IMPORTS).
 *
 * @module source-extractor
 */

// --- Regex Patterns ---

const CLASS_PATTERN = /(?:(?:@\w+\([^)]*\)\s*\n\s*)*)?(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+([\w.]+))?(?:\s+implements\s+([\w,\s.]+))?\s*\{/g;

const METHOD_PATTERN = /(?:(?:@\w+\([^)]*\)\s*\n\s*)*)?(?:(public|protected|private)\s+)?(?:(static)\s+)?(?:(async)\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{/g;

const FUNCTION_PATTERN = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{/g;

const ARROW_FUNCTION_PATTERN = /export\s+(?:const|let)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?\(?([^)]*)\)?\s*(?::\s*[^=]+)?\s*=>/g;

const IMPORT_PATTERN = /import\s+(?:(?:\{([^}]+)\})|(?:(\w+)))\s+from\s+['"]([^'"]+)['"]/g;

const DECORATOR_PATTERN = /@(\w+)\(\s*['"]([^'"]*)['"]\s*\)/g;

const NESTJS_METHOD_DECORATORS = ['Get', 'Post', 'Put', 'Delete', 'Patch'];

/**
 * Extract source code entities for the Knowledge Graph.
 *
 * @param {string} content - File content
 * @param {string} filePath - Relative file path
 * @param {string} feature - Feature code (e.g., 'LND')
 * @returns {SourceExtractionResult}
 */
function extract(content, filePath, feature) {
  const classes = extractClasses(content);
  const functions = extractFunctions(content);
  const imports = extractImports(content);
  const exports = extractExports(content);

  return {
    classes,
    functions,
    imports,
    exports,
    meta: { filePath, feature, linesOfCode: content.split('\n').length },
  };
}

/**
 * Extract class declarations with decorators, methods, and properties.
 * @param {string} content
 * @returns {ClassInfo[]}
 */
function extractClasses(content) {
  const classes = [];
  const lines = content.split('\n');

  let match;
  const classRegex = new RegExp(CLASS_PATTERN.source, 'g');

  while ((match = classRegex.exec(content)) !== null) {
    const className = match[1];
    const extendsClass = match[2] || null;
    const implementsList = match[3] ? match[3].split(',').map(s => s.trim()) : [];
    const classStartIndex = match.index;

    // Find decorators above the class
    const decorators = extractDecoratorsAbove(content, classStartIndex);

    // Find class body (matching braces)
    const bodyStart = content.indexOf('{', classStartIndex);
    const bodyEnd = findMatchingBrace(content, bodyStart);
    const classBody = bodyEnd > bodyStart ? content.substring(bodyStart + 1, bodyEnd) : '';

    // Extract methods from class body
    const methods = extractMethods(classBody);

    // Get line number
    const lineNumber = content.substring(0, classStartIndex).split('\n').length;

    classes.push({
      name: className,
      extends: extendsClass,
      implements: implementsList,
      decorators,
      methods,
      lineNumber,
      bodyLength: classBody.length,
    });
  }

  return classes;
}

/**
 * Extract top-level exported functions.
 * @param {string} content
 * @returns {FunctionInfo[]}
 */
function extractFunctions(content) {
  const functions = [];

  // Regular functions
  let match;
  const fnRegex = new RegExp(FUNCTION_PATTERN.source, 'g');
  while ((match = fnRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const name = match[1];
    const params = match[2] || '';
    const returnType = match[3] ? match[3].trim() : null;
    const isExported = fullMatch.startsWith('export');
    const lineNumber = content.substring(0, match.index).split('\n').length;

    functions.push({ name, params, returnType, isExported, lineNumber, kind: 'function' });
  }

  // Arrow functions (exported const/let)
  const arrowRegex = new RegExp(ARROW_FUNCTION_PATTERN.source, 'g');
  while ((match = arrowRegex.exec(content)) !== null) {
    const name = match[1];
    const params = match[2] || '';
    const lineNumber = content.substring(0, match.index).split('\n').length;

    functions.push({ name, params, returnType: null, isExported: true, lineNumber, kind: 'arrow' });
  }

  return functions;
}

/**
 * Extract import statements.
 * @param {string} content
 * @returns {ImportInfo[]}
 */
function extractImports(content) {
  const imports = [];
  let match;
  const importRegex = new RegExp(IMPORT_PATTERN.source, 'g');

  while ((match = importRegex.exec(content)) !== null) {
    const namedImports = match[1] ? match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]) : [];
    const defaultImport = match[2] || null;
    const source = match[3];

    const specifiers = defaultImport ? [defaultImport, ...namedImports] : namedImports;

    imports.push({ source, specifiers, isRelative: source.startsWith('.') });
  }

  return imports;
}

/**
 * Extract exported names.
 * @param {string} content
 * @returns {string[]}
 */
function extractExports(content) {
  const exports = [];

  // Named exports: export { a, b }
  const namedExportRegex = /export\s*\{([^}]+)\}/g;
  let match;
  while ((match = namedExportRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop());
    exports.push(...names);
  }

  // export class/function/const
  const declExportRegex = /export\s+(?:default\s+)?(?:abstract\s+)?(?:class|function|const|let|var|enum|interface|type)\s+(\w+)/g;
  while ((match = declExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  return [...new Set(exports)];
}

/**
 * Convert extraction result to graph entities (nodes + edges).
 * @param {SourceExtractionResult} result - From extract()
 * @param {string} filePath - Relative file path
 * @param {string} feature - Feature code
 * @returns {{ nodes: object[], edges: object[] }}
 */
function toGraphEntities(result, filePath, feature) {
  const nodes = [];
  const edges = [];

  // SRC node for the file
  const srcNodeId = `SRC-${filePath}`;
  nodes.push({
    id: srcNodeId,
    attributes: {
      type: 'SourceFile',
      feature,
      filePath,
      linesOfCode: result.meta.linesOfCode,
      classCount: result.classes.length,
      functionCount: result.functions.length,
    },
  });

  // Class nodes + DEFINED_IN edges
  for (const cls of result.classes) {
    const clsNodeId = `CLS-${cls.name}`;
    nodes.push({
      id: clsNodeId,
      attributes: {
        type: 'Class',
        feature,
        className: cls.name,
        filePath,
        decorators: cls.decorators.map(d => d.name),
        extends: cls.extends,
        implements: cls.implements,
        methodCount: cls.methods.length,
      },
    });

    // DEFINED_IN edge: Class → SourceFile
    edges.push({
      source: clsNodeId,
      target: srcNodeId,
      attributes: { type: 'DEFINED_IN', confidence: 1.0, source: 'source-extraction' },
    });
  }

  // Function nodes + DEFINED_IN edges (only exported)
  for (const fn of result.functions.filter(f => f.isExported)) {
    const fnNodeId = `FN-${fn.name}`;
    nodes.push({
      id: fnNodeId,
      attributes: {
        type: 'Function',
        feature,
        functionName: fn.name,
        filePath,
        isExported: true,
      },
    });

    // DEFINED_IN edge: Function → SourceFile
    edges.push({
      source: fnNodeId,
      target: srcNodeId,
      attributes: { type: 'DEFINED_IN', confidence: 1.0, source: 'source-extraction' },
    });
  }

  // IMPORTS edges: SourceFile → SourceFile (only relative imports)
  for (const imp of result.imports.filter(i => i.isRelative)) {
    const resolvedPath = resolveImportPath(filePath, imp.source);
    if (resolvedPath) {
      const targetSrcId = `SRC-${resolvedPath}`;
      edges.push({
        source: srcNodeId,
        target: targetSrcId,
        attributes: { type: 'IMPORTS', confidence: 1.0, source: 'source-extraction', specifiers: imp.specifiers },
      });
    }
  }

  // Infer REALIZES and SERVES edges
  const realizesEdges = inferRealizesEdges(result.classes, feature);
  const servesEdges = inferServesEdges(result.classes, feature);
  edges.push(...realizesEdges, ...servesEdges);

  return { nodes, edges };
}

/**
 * Infer REALIZES edges: Class → Component by name matching.
 * Example: CLS-LoanService → COMP-LoanService
 * @param {ClassInfo[]} classes
 * @param {string} feature
 * @returns {object[]}
 */
function inferRealizesEdges(classes, feature) {
  const edges = [];

  for (const cls of classes) {
    // If class name matches a component pattern (Service, Controller, Repository, Guard, etc.)
    const compId = `COMP-${cls.name}`;
    if (/(?:Service|Controller|Repository|Guard|Interceptor|Middleware|Gateway|Module)$/.test(cls.name)) {
      edges.push({
        source: `CLS-${cls.name}`,
        target: compId,
        attributes: { type: 'REALIZES', confidence: 0.95, source: 'naming-inference', feature },
      });
    }
  }

  return edges;
}

/**
 * Infer SERVES edges: Controller class → API nodes.
 * Uses NestJS decorators (@Get, @Post, etc.) to map to API paths.
 * @param {ClassInfo[]} classes
 * @param {string} feature
 * @returns {object[]}
 */
function inferServesEdges(classes, feature) {
  const edges = [];

  for (const cls of classes) {
    // Find @Controller('path') decorator
    const controllerDecorator = cls.decorators.find(d => d.name === 'Controller');
    if (!controllerDecorator) continue;

    const basePath = controllerDecorator.value || '';

    // For each method with HTTP decorator
    for (const method of cls.methods) {
      for (const dec of (method.decorators || [])) {
        if (NESTJS_METHOD_DECORATORS.includes(dec.name)) {
          const httpMethod = dec.name.toUpperCase();
          const methodPath = dec.value || '';
          const fullPath = `/${basePath}/${methodPath}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
          const apiNodeId = `API-${httpMethod}-${fullPath}`;

          edges.push({
            source: `CLS-${cls.name}`,
            target: apiNodeId,
            attributes: { type: 'SERVES', confidence: 0.90, source: 'decorator-inference', feature },
          });
        }
      }
    }
  }

  return edges;
}

// --- Helper Functions ---

/**
 * Extract decorators above a position in content.
 * @private
 */
function extractDecoratorsAbove(content, position) {
  const before = content.substring(Math.max(0, position - 500), position);
  const lines = before.split('\n').reverse();
  const decorators = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('@')) {
      const decMatch = trimmed.match(/@(\w+)\(?\s*(?:['"]([^'"]*)['"]\s*)?\)?/);
      if (decMatch) {
        decorators.push({ name: decMatch[1], value: decMatch[2] || '' });
      }
    } else if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
      break; // Stop at first non-decorator, non-comment line
    }
  }

  return decorators.reverse();
}

/**
 * Extract methods from class body.
 * @private
 */
function extractMethods(classBody) {
  const methods = [];
  let match;
  const methodRegex = new RegExp(METHOD_PATTERN.source, 'g');

  while ((match = methodRegex.exec(classBody)) !== null) {
    const visibility = match[1] || 'public';
    const isStatic = !!match[2];
    const isAsync = !!match[3];
    const name = match[4];
    const params = match[5] || '';
    const returnType = match[6] ? match[6].trim() : null;

    // Extract decorators for this method
    const decorators = extractDecoratorsAbove(classBody, match.index);

    methods.push({ name, visibility, isStatic, isAsync, params, returnType, decorators });
  }

  return methods;
}

/**
 * Find matching closing brace.
 * @private
 */
function findMatchingBrace(content, openIndex) {
  if (openIndex < 0 || content[openIndex] !== '{') return -1;

  let depth = 0;
  for (let i = openIndex; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Resolve relative import path to a normalized file path.
 * @private
 */
function resolveImportPath(fromPath, importSource) {
  const path = require('path');
  const dir = path.dirname(fromPath);
  let resolved = path.join(dir, importSource).replace(/\\/g, '/');

  // Add .ts extension if missing
  if (!resolved.endsWith('.ts') && !resolved.endsWith('.tsx')) {
    resolved += '.ts';
  }

  return resolved;
}

module.exports = {
  extract,
  extractClasses,
  extractFunctions,
  extractImports,
  extractExports,
  toGraphEntities,
  inferRealizesEdges,
  inferServesEdges,
};
