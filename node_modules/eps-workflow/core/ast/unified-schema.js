'use strict';

/**
 * Unified AST Schema - Language-agnostic output format
 *
 * WHY: Enable downstream processing without language-specific logic
 * HOW: Define common structures that all parsers output
 *
 * @module unified-schema
 */

// Node type constants (for graph building)
const NODE_TYPES = {
  SOURCE_FILE: 'SourceFile',
  CLASS: 'Class',
  INTERFACE: 'Interface',
  METHOD: 'Method',
  FUNCTION: 'Function',
  FIELD: 'Field',
  // Framework-specific
  CONTROLLER: 'Controller',
  SERVICE: 'Service',
  REPOSITORY: 'Repository',
  ENTITY: 'Entity',
  COMPONENT: 'Component',
  // Next.js specific
  PAGE: 'Page',
  LAYOUT: 'Layout',
  API_ROUTE: 'ApiRoute',
  SERVER_COMPONENT: 'ServerComponent',
  CLIENT_COMPONENT: 'ClientComponent',
  // React specific
  HOOK: 'Hook',
  CONTEXT: 'Context',
  PROVIDER: 'Provider',

  // === Architecture Node Types (Phase 2: RAG-SCAN-IMPROVE) ===
  // Global architecture pattern nodes (singleton per pattern)
  ARCH_PATTERN: 'ArchPattern',           // ARCH-clean-architecture, ARCH-hexagonal
  ARCH_LAYER: 'ArchLayer',               // LAYER-domain, LAYER-application
  ARCH_STEREOTYPE: 'ArchStereotype',     // STEREO-Controller, STEREO-Service
  ARCH_DATABASE: 'ArchDatabase',         // DB-r2dbc, DB-jpa, DB-eloquent
  // Module architecture nodes
  MODULE_ARCH: 'ModuleArchitecture',     // Module-level architecture info
};

// Marker types (unified annotations/decorators/attributes)
const MARKER_TYPES = {
  ANNOTATION: 'annotation',    // Java: @RestController
  DECORATOR: 'decorator',      // TypeScript: @Injectable
  ATTRIBUTE: 'attribute',      // C#: [ApiController]
  DIRECTIVE: 'directive',      // Next.js: 'use client'
};

// Edge types for knowledge graph
const EDGE_TYPES = {
  // Code structure edges
  DEFINED_IN: 'DEFINED_IN',         // Class/Method → SourceFile
  IMPORTS: 'IMPORTS',               // SourceFile → SourceFile
  EXTENDS: 'EXTENDS',               // Class → Class
  IMPLEMENTS: 'IMPLEMENTS',         // Class → Interface
  CALLS: 'CALLS',                   // Method → Method
  USES: 'USES',                     // Class → Class (dependency)
  // Framework edges
  REALIZES: 'REALIZES',             // Class → Component (pattern)
  SERVES: 'SERVES',                 // Controller → API endpoint
  PERSISTS: 'PERSISTS',             // Repository → Entity
  INJECTS: 'INJECTS',               // Class → Service (DI)
  // Semantic edges (LLM-enriched)
  IMPLEMENTS_FR: 'IMPLEMENTS_FR',   // Code → Functional Requirement
  VALIDATES_BR: 'VALIDATES_BR',     // Code → Business Rule
  BELONGS_TO_DOMAIN: 'BELONGS_TO_DOMAIN', // Code → Domain concept
  USES_PATTERN: 'USES_PATTERN',     // Code → Design pattern

  // === Architecture Edges (Phase 2: RAG-SCAN-IMPROVE) ===
  // Layer membership edges
  BELONGS_TO_LAYER: 'BELONGS_TO_LAYER',   // Class → LAYER-* (layer membership)
  CONFORMS_TO: 'CONFORMS_TO',             // Module → ARCH-* (architecture pattern)
  HAS_STEREOTYPE: 'HAS_STEREOTYPE',       // Class → STEREO-* (stereotype assignment)
  USES_DATABASE: 'USES_DATABASE',         // Repository → DB-* (database technology)
  // Dependency rule edges
  DEPENDS_ON_LAYER: 'DEPENDS_ON_LAYER',   // LAYER-* → LAYER-* (allowed dependency)
  VIOLATES_RULE: 'VIOLATES_RULE',         // Class → Class (architecture violation)
  // Cross-module edges
  CROSS_MODULE_CALL: 'CROSS_MODULE_CALL', // Class → Class (inter-module dependency)
};

// Supported languages
const LANGUAGES = {
  JAVA: 'java',
  TYPESCRIPT: 'typescript',
  JAVASCRIPT: 'javascript',
  CSHARP: 'csharp',
  PYTHON: 'python',
  GO: 'go',
  KOTLIN: 'kotlin',
  RUST: 'rust',
};

// Supported frameworks
const FRAMEWORKS = {
  SPRING_BOOT: 'spring-boot',
  NESTJS: 'nestjs',
  NEXTJS: 'nextjs',
  REACT: 'react',
  EXPRESS: 'express',
  FASTIFY: 'fastify',
};

/**
 * Create empty UnifiedAST structure
 * @param {string} language - Language identifier
 * @param {string} filePath - File path
 * @returns {UnifiedAST}
 */
function createEmptyAST(language, filePath) {
  return {
    language,
    filePath,
    packageName: null,
    namespace: null,
    classes: [],
    functions: [],
    imports: [],
    exports: [],
    markers: [],
    framework: {
      name: null,
      components: [],
      routes: [],
      services: [],
    },
    meta: {
      linesOfCode: 0,
      complexity: null,
      parseTime: null,
      parseError: null,
    }
  };
}

/**
 * Create ClassInfo structure
 * @param {string} name - Class name
 * @param {object} options - Class options
 * @returns {ClassInfo}
 */
function createClassInfo(name, options = {}) {
  return {
    name,
    kind: options.kind || 'class',  // class | interface | enum | record | abstract
    isPublic: options.isPublic ?? true,
    isAbstract: options.isAbstract ?? false,
    isFinal: options.isFinal ?? false,
    extends: options.extends || null,
    implements: options.implements || [],
    markers: options.markers || [],
    methods: options.methods || [],
    fields: options.fields || [],
    properties: options.properties || [],
    innerClasses: options.innerClasses || [],
    lineNumber: options.lineNumber || 0,
    endLineNumber: options.endLineNumber || 0,
  };
}

/**
 * Create MethodInfo structure
 * @param {string} name - Method name
 * @param {object} options - Method options
 * @returns {MethodInfo}
 */
function createMethodInfo(name, options = {}) {
  return {
    name,
    visibility: options.visibility || 'public',  // public | private | protected | package
    isStatic: options.isStatic ?? false,
    isAsync: options.isAsync ?? false,
    isAbstract: options.isAbstract ?? false,
    isFinal: options.isFinal ?? false,
    returnType: options.returnType || null,
    parameters: options.parameters || [],
    markers: options.markers || [],
    throws: options.throws || [],
    lineNumber: options.lineNumber || 0,
    endLineNumber: options.endLineNumber || 0,
  };
}

/**
 * Create FunctionInfo structure (top-level functions)
 * @param {string} name - Function name
 * @param {object} options - Function options
 * @returns {FunctionInfo}
 */
function createFunctionInfo(name, options = {}) {
  return {
    name,
    isExported: options.isExported ?? false,
    isDefault: options.isDefault ?? false,
    isAsync: options.isAsync ?? false,
    isGenerator: options.isGenerator ?? false,
    returnType: options.returnType || null,
    parameters: options.parameters || [],
    markers: options.markers || [],
    lineNumber: options.lineNumber || 0,
    endLineNumber: options.endLineNumber || 0,
  };
}

/**
 * Create FieldInfo structure
 * @param {string} name - Field name
 * @param {object} options - Field options
 * @returns {FieldInfo}
 */
function createFieldInfo(name, options = {}) {
  return {
    name,
    type: options.type || null,
    visibility: options.visibility || 'private',
    isStatic: options.isStatic ?? false,
    isFinal: options.isFinal ?? false,
    isReadonly: options.isReadonly ?? false,
    initialValue: options.initialValue || null,
    markers: options.markers || [],
    lineNumber: options.lineNumber || 0,
  };
}

/**
 * Create ParameterInfo structure
 * @param {string} name - Parameter name
 * @param {object} options - Parameter options
 * @returns {ParameterInfo}
 */
function createParameterInfo(name, options = {}) {
  return {
    name,
    type: options.type || null,
    isOptional: options.isOptional ?? false,
    defaultValue: options.defaultValue || null,
    markers: options.markers || [],
  };
}

/**
 * Create MarkerInfo (unified annotation/decorator/attribute)
 * @param {string} type - Marker type (annotation/decorator/attribute/directive)
 * @param {string} name - Marker name
 * @param {object} options - Marker options
 * @returns {MarkerInfo}
 */
function createMarkerInfo(type, name, options = {}) {
  return {
    type,  // 'annotation' | 'decorator' | 'attribute' | 'directive'
    name,
    value: options.value || null,
    attributes: options.attributes || {},
  };
}

/**
 * Create ImportInfo structure
 * @param {string} source - Import source/module
 * @param {object} options - Import options
 * @returns {ImportInfo}
 */
function createImportInfo(source, options = {}) {
  return {
    source,
    specifiers: options.specifiers || [],  // Named imports
    defaultImport: options.defaultImport || null,
    namespaceImport: options.namespaceImport || null,  // import * as X
    isRelative: options.isRelative ?? source.startsWith('.'),
    isTypeOnly: options.isTypeOnly ?? false,
    isStatic: options.isStatic ?? false,  // Java static import
    isWildcard: options.isWildcard ?? false,
  };
}

/**
 * Create graph node from AST element
 * @param {string} type - Node type from NODE_TYPES
 * @param {string} id - Unique identifier
 * @param {object} attributes - Node attributes
 * @returns {GraphNode}
 */
function createGraphNode(type, id, attributes = {}) {
  return {
    id,
    type,
    attributes: {
      ...attributes,
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Create graph edge between nodes
 * @param {string} type - Edge type from EDGE_TYPES
 * @param {string} sourceId - Source node ID
 * @param {string} targetId - Target node ID
 * @param {object} attributes - Edge attributes
 * @returns {GraphEdge}
 */
function createGraphEdge(type, sourceId, targetId, attributes = {}) {
  return {
    type,
    source: sourceId,
    target: targetId,
    attributes: {
      confidence: attributes.confidence ?? 1.0,
      ...attributes,
    },
  };
}

/**
 * Validate UnifiedAST structure
 * @param {object} ast - AST to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateAST(ast) {
  const errors = [];

  if (!ast.language) errors.push('Missing language');
  if (!ast.filePath) errors.push('Missing filePath');
  if (!Array.isArray(ast.classes)) errors.push('classes must be array');
  if (!Array.isArray(ast.functions)) errors.push('functions must be array');
  if (!Array.isArray(ast.imports)) errors.push('imports must be array');
  if (!Array.isArray(ast.exports)) errors.push('exports must be array');
  if (!Array.isArray(ast.markers)) errors.push('markers must be array');

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  // Constants
  NODE_TYPES,
  MARKER_TYPES,
  EDGE_TYPES,
  LANGUAGES,
  FRAMEWORKS,
  // Factory functions
  createEmptyAST,
  createClassInfo,
  createMethodInfo,
  createFunctionInfo,
  createFieldInfo,
  createParameterInfo,
  createMarkerInfo,
  createImportInfo,
  createGraphNode,
  createGraphEdge,
  // Utilities
  validateAST,
};
