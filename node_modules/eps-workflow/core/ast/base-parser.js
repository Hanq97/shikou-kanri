'use strict';

const path = require('path');
const { createEmptyAST, createMarkerInfo, MARKER_TYPES, validateAST } = require('./unified-schema');

/**
 * Base Parser - Abstract class for language-specific parsers
 *
 * WHY: Define contract ensuring all parsers produce UnifiedAST
 * HOW: Template Method pattern - subclasses implement extraction logic
 *
 * Subclasses MUST implement:
 * - getLanguage()
 * - parseToRawAST(content, filePath)
 * - extractClasses(rawAst)
 * - extractFunctions(rawAst)
 * - extractImports(rawAst)
 *
 * Subclasses CAN override:
 * - extractPackage(rawAst)
 * - extractExports(rawAst)
 * - extractFileMarkers(rawAst)
 *
 * @abstract
 * @module base-parser
 */
class BaseParser {

  constructor() {
    if (new.target === BaseParser) {
      throw new Error('BaseParser is abstract and cannot be instantiated');
    }
    this.frameworkExtractor = null;
  }

  /**
   * Parse source file and extract AST information
   * Template Method: calls abstract methods that subclasses implement
   *
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @param {object} sourceRootConfig - Config from project-config.json
   * @returns {UnifiedAST}
   */
  parse(content, filePath, sourceRootConfig = {}) {
    const startTime = Date.now();
    const language = this.getLanguage();

    // Create base AST structure
    const ast = createEmptyAST(language, filePath);

    try {
      // Template method calls - subclasses implement these
      const rawAst = this.parseToRawAST(content, filePath);

      if (!rawAst) {
        throw new Error('parseToRawAST returned null/undefined');
      }

      ast.packageName = this.extractPackage(rawAst);
      ast.classes = this.extractClasses(rawAst) || [];
      ast.functions = this.extractFunctions(rawAst) || [];
      ast.imports = this.extractImports(rawAst) || [];
      ast.exports = this.extractExports(rawAst) || [];
      ast.markers = this.extractFileMarkers(rawAst) || [];

      // Framework-specific extraction (optional)
      if (this.frameworkExtractor) {
        try {
          ast.framework = this.frameworkExtractor.extract(rawAst, ast, sourceRootConfig);
        } catch (fwErr) {
          console.warn(`[${this.constructor.name}] Framework extraction warning: ${fwErr.message}`);
        }
      }

      // Meta information
      ast.meta.linesOfCode = content.split('\n').length;
      ast.meta.complexity = this.estimateComplexity(ast);
      ast.meta.parseTime = Date.now() - startTime;

    } catch (err) {
      console.warn(`[${this.constructor.name}] Parse warning for ${filePath}: ${err.message}`);
      ast.meta.parseError = err.message;
    }

    // Validate output
    const validation = validateAST(ast);
    if (!validation.valid) {
      console.warn(`[${this.constructor.name}] AST validation warnings: ${validation.errors.join(', ')}`);
    }

    return ast;
  }

  // --- Abstract Methods (MUST override in subclass) ---

  /**
   * Get language identifier
   * @abstract
   * @returns {string} 'java' | 'typescript' | 'csharp' | etc.
   */
  getLanguage() {
    throw new Error('getLanguage() must be implemented by subclass');
  }

  /**
   * Parse content to raw AST (language-specific)
   * @abstract
   * @param {string} content
   * @param {string} filePath
   * @returns {object} Raw AST from parser library
   */
  parseToRawAST(content, filePath) {
    throw new Error('parseToRawAST() must be implemented by subclass');
  }

  /**
   * Extract classes/interfaces/enums from raw AST
   * @abstract
   * @param {object} rawAst
   * @returns {ClassInfo[]}
   */
  extractClasses(rawAst) {
    throw new Error('extractClasses() must be implemented by subclass');
  }

  /**
   * Extract top-level functions from raw AST
   * @abstract
   * @param {object} rawAst
   * @returns {FunctionInfo[]}
   */
  extractFunctions(rawAst) {
    throw new Error('extractFunctions() must be implemented by subclass');
  }

  /**
   * Extract import statements from raw AST
   * @abstract
   * @param {object} rawAst
   * @returns {ImportInfo[]}
   */
  extractImports(rawAst) {
    throw new Error('extractImports() must be implemented by subclass');
  }

  // --- Optional Methods (CAN override in subclass) ---

  /**
   * Extract package/namespace name
   * @param {object} rawAst
   * @returns {string|null}
   */
  extractPackage(rawAst) {
    return null;
  }

  /**
   * Extract exported names
   * @param {object} rawAst
   * @returns {string[]}
   */
  extractExports(rawAst) {
    return [];
  }

  /**
   * Extract file-level markers (annotations/decorators)
   * @param {object} rawAst
   * @returns {MarkerInfo[]}
   */
  extractFileMarkers(rawAst) {
    return [];
  }

  // --- Concrete Helper Methods ---

  /**
   * Set framework-specific extractor
   * @param {object} extractor - Spring/NestJS/NextJS extractor
   */
  setFrameworkExtractor(extractor) {
    this.frameworkExtractor = extractor;
  }

  /**
   * Get framework extractor
   * @returns {object|null}
   */
  getFrameworkExtractor() {
    return this.frameworkExtractor;
  }

  /**
   * Estimate cyclomatic complexity
   * @param {UnifiedAST} ast
   * @returns {number}
   */
  estimateComplexity(ast) {
    let complexity = 1; // Base complexity

    for (const cls of ast.classes || []) {
      complexity += (cls.methods || []).length;
      // Add 1 for each decision point proxy
      for (const method of cls.methods || []) {
        // Rough estimate: more parameters = more complexity
        complexity += Math.floor((method.parameters || []).length / 2);
      }
    }

    complexity += (ast.functions || []).length;

    return complexity;
  }

  /**
   * Convert language-specific marker to unified MarkerInfo
   * @param {string} type - MARKER_TYPES value
   * @param {object} rawMarker - Language-specific marker data
   * @returns {MarkerInfo}
   */
  toUnifiedMarker(type, rawMarker) {
    return createMarkerInfo(type, rawMarker.name, {
      value: rawMarker.value,
      attributes: rawMarker.attributes || rawMarker.arguments || {},
    });
  }

  /**
   * Get visibility string from modifier flags
   * @param {string[]} modifiers
   * @returns {'public'|'private'|'protected'|'package'}
   */
  getVisibility(modifiers) {
    if (modifiers.includes('public')) return 'public';
    if (modifiers.includes('private')) return 'private';
    if (modifiers.includes('protected')) return 'protected';
    return 'package'; // Default for Java, 'public' for TypeScript
  }

  /**
   * Check if file should be skipped (test files, generated files, etc.)
   * @param {string} filePath
   * @returns {boolean}
   */
  shouldSkipFile(filePath) {
    const skipPatterns = [
      /\.test\.[jt]sx?$/,
      /\.spec\.[jt]sx?$/,
      /__tests__\//,
      /\.d\.ts$/,
      /\.generated\./,
      /node_modules\//,
      /\.min\.[jt]s$/,
    ];

    return skipPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Extract file name without extension
   * @param {string} filePath
   * @returns {string}
   */
  getFileName(filePath) {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * Get file extension
   * @param {string} filePath
   * @returns {string}
   */
  getFileExtension(filePath) {
    return path.extname(filePath).toLowerCase();
  }
}

module.exports = BaseParser;
