'use strict';

const BaseParser = require('../base-parser');
const {
  createClassInfo,
  createMethodInfo,
  createFieldInfo,
  createMarkerInfo,
  createParameterInfo,
  MARKER_TYPES,
} = require('../unified-schema');

/**
 * C# Parser - Parses C# source files using regex-based extraction
 *
 * WHY: Support .NET Core 8+ projects
 * HOW: Regex-based parsing for C# syntax (no external AST library required)
 *
 * Extracts:
 * - Classes, interfaces, records, structs
 * - Methods with visibility, return type, parameters
 * - Properties and fields
 * - Attributes (converted to MarkerInfo)
 * - Namespace and using statements
 * - Async/await patterns
 *
 * @extends BaseParser
 * @module csharp-parser
 */
class CSharpParser extends BaseParser {

  constructor() {
    super();
  }

  getLanguage() {
    return 'csharp';
  }

  /**
   * Parse C# content to raw AST (regex-based structure)
   */
  parseToRawAST(content, filePath) {
    return {
      content,
      filePath,
      lines: content.split('\n'),
    };
  }

  /**
   * Extract namespace
   */
  extractPackage(rawAst) {
    // File-scoped namespace: namespace MyApp.Controllers;
    const fileScopedMatch = rawAst.content.match(/^\s*namespace\s+([\w.]+)\s*;/m);
    if (fileScopedMatch) {
      return fileScopedMatch[1];
    }

    // Block-scoped namespace: namespace MyApp.Controllers { ... }
    const blockScopedMatch = rawAst.content.match(/^\s*namespace\s+([\w.]+)\s*\{/m);
    if (blockScopedMatch) {
      return blockScopedMatch[1];
    }

    return null;
  }

  /**
   * Extract classes, interfaces, records, structs
   */
  extractClasses(rawAst) {
    const classes = [];
    const content = rawAst.content;

    // Pattern for class/interface/record/struct declarations
    // Captures: attributes, modifiers, kind, name, inheritance
    const typePattern = /(?:(\[[\s\S]*?\])\s*)?((?:public|private|protected|internal|abstract|sealed|static|partial)\s+)*\b(class|interface|record|struct)\s+(\w+)(?:<[^>]+>)?(?:\s*:\s*([\w\s,<>]+))?/g;

    let match;
    while ((match = typePattern.exec(content)) !== null) {
      const attributeBlock = match[1] || '';
      const modifiers = match[2] || '';
      const kind = match[3];
      const name = match[4];
      const inheritance = match[5] || '';

      // Parse attributes
      const markers = this._parseAttributes(attributeBlock);

      // Parse modifiers
      const isPublic = modifiers.includes('public') || modifiers.includes('internal');
      const isAbstract = modifiers.includes('abstract');
      const isSealed = modifiers.includes('sealed');
      const isStatic = modifiers.includes('static');
      const isPartial = modifiers.includes('partial');

      // Parse inheritance
      const { extends: extendsClass, implements: implementsList } = this._parseInheritance(inheritance, kind);

      // Find class body
      const classStart = match.index;
      const bodyStart = content.indexOf('{', classStart);
      const bodyEnd = this._findMatchingBrace(content, bodyStart);
      const classBody = bodyStart > 0 && bodyEnd > bodyStart
        ? content.substring(bodyStart + 1, bodyEnd)
        : '';

      // Extract methods and properties
      const methods = this._extractMethods(classBody, rawAst.lines, classStart);
      const fields = this._extractFields(classBody);

      // Get line number
      const lineNumber = this._getLineNumber(content, classStart);

      classes.push(createClassInfo(name, {
        kind: kind === 'struct' ? 'class' : kind,
        isPublic,
        isAbstract,
        isFinal: isSealed,
        extends: extendsClass,
        implements: implementsList,
        markers,
        methods,
        fields,
        lineNumber,
      }));
    }

    return classes;
  }

  /**
   * Extract top-level functions (C# has them in newer versions)
   */
  extractFunctions(rawAst) {
    // C# traditionally doesn't have top-level functions
    // .NET 6+ supports top-level statements but we skip those for now
    return [];
  }

  /**
   * Extract using statements (imports)
   */
  extractImports(rawAst) {
    const imports = [];
    const usingPattern = /^\s*using\s+(?:static\s+)?([\w.]+)(?:\s*=\s*([\w.]+))?;/gm;

    let match;
    while ((match = usingPattern.exec(rawAst.content)) !== null) {
      const source = match[2] || match[1];
      const alias = match[2] ? match[1] : null;
      const isStatic = rawAst.content.substring(match.index, match.index + 20).includes('static');

      imports.push({
        source,
        specifiers: alias ? [alias] : [source.split('.').pop()],
        isRelative: false,
        isStatic,
        isWildcard: false,
        alias,
      });
    }

    return imports;
  }

  /**
   * Extract exports (C#: public types)
   */
  extractExports(rawAst) {
    const exports = [];
    const classes = this.extractClasses(rawAst);

    for (const cls of classes) {
      if (cls.isPublic) {
        exports.push(cls.name);
      }
    }

    return exports;
  }

  // --- Private Helper Methods ---

  _parseAttributes(attributeBlock) {
    const markers = [];
    if (!attributeBlock) return markers;

    // Pattern for individual attributes: [AttributeName] or [AttributeName(params)]
    const attrPattern = /\[(\w+)(?:\s*\(([^)]*)\))?\]/g;

    let match;
    while ((match = attrPattern.exec(attributeBlock)) !== null) {
      const name = match[1];
      const value = match[2] || null;

      markers.push(createMarkerInfo(MARKER_TYPES.ATTRIBUTE, name, {
        value,
        attributes: this._parseAttributeParams(value),
      }));
    }

    return markers;
  }

  _parseAttributeParams(paramString) {
    if (!paramString) return {};

    const params = {};
    // Simple parsing: key = value or just value
    const parts = paramString.split(',').map(p => p.trim());

    for (const part of parts) {
      const eqIndex = part.indexOf('=');
      if (eqIndex > 0) {
        const key = part.substring(0, eqIndex).trim();
        const value = part.substring(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
        params[key] = value;
      }
    }

    return params;
  }

  _parseInheritance(inheritance, kind) {
    if (!inheritance) return { extends: null, implements: [] };

    const parts = inheritance.split(',').map(p => p.trim());
    let extendsClass = null;
    const implementsList = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].replace(/<.*>/, ''); // Remove generics

      if (i === 0 && kind === 'class') {
        // First item could be base class or interface
        // Interfaces typically start with 'I'
        if (part.startsWith('I') && part.length > 1 && part[1] === part[1].toUpperCase()) {
          implementsList.push(part);
        } else {
          extendsClass = part;
        }
      } else {
        implementsList.push(part);
      }
    }

    return { extends: extendsClass, implements: implementsList };
  }

  _extractMethods(classBody, allLines, classStartOffset) {
    const methods = [];

    // Pattern for method declarations
    // Captures: attributes, modifiers, return type, name, parameters
    const methodPattern = /(?:(\[[\s\S]*?\])\s*)?((?:public|private|protected|internal|virtual|override|abstract|static|async|sealed)\s+)*(?:(?:async\s+)?(\w+(?:<[^>]+>)?(?:\[\])?(?:\?)?)\s+)?(\w+)\s*\(([^)]*)\)\s*(?:where\s+[^{]+)?(?:\{|;|=>)/g;

    let match;
    while ((match = methodPattern.exec(classBody)) !== null) {
      const attributeBlock = match[1] || '';
      const modifiers = match[2] || '';
      const returnType = match[3] || 'void';
      const name = match[4];
      const paramsStr = match[5] || '';

      // Skip constructors (name matches common class name patterns or no return type before it)
      if (name === returnType || returnType === 'void' && !modifiers.includes('void')) {
        // Could be a constructor - check if preceded by class name
      }

      // Skip property accessors
      if (name === 'get' || name === 'set' || name === 'init') continue;

      const markers = this._parseAttributes(attributeBlock);
      const visibility = this._extractVisibility(modifiers);
      const isStatic = modifiers.includes('static');
      const isAsync = modifiers.includes('async');
      const isAbstract = modifiers.includes('abstract');
      const isVirtual = modifiers.includes('virtual');
      const isOverride = modifiers.includes('override');

      const parameters = this._parseParameters(paramsStr);

      methods.push(createMethodInfo(name, {
        visibility,
        isStatic,
        isAsync,
        isAbstract,
        returnType,
        parameters,
        markers,
        lineNumber: 0, // Would need line number calculation
      }));
    }

    return methods;
  }

  _extractFields(classBody) {
    const fields = [];

    // Pattern for field/property declarations
    // Captures: attributes, modifiers, type, name
    const fieldPattern = /(?:(\[[\s\S]*?\])\s*)?((?:public|private|protected|internal|static|readonly|const|required)\s+)+(\w+(?:<[^>]+>)?(?:\[\])?(?:\?)?)\s+(\w+)\s*(?:[{=;])/g;

    let match;
    while ((match = fieldPattern.exec(classBody)) !== null) {
      const attributeBlock = match[1] || '';
      const modifiers = match[2] || '';
      const type = match[3];
      const name = match[4];

      // Check if it's a property (has { get; set; })
      const afterName = classBody.substring(match.index + match[0].length - 1, match.index + match[0].length + 50);
      const isProperty = afterName.includes('get') || afterName.includes('=>');

      const markers = this._parseAttributes(attributeBlock);
      const visibility = this._extractVisibility(modifiers);
      const isStatic = modifiers.includes('static');
      const isReadonly = modifiers.includes('readonly') || modifiers.includes('const');

      fields.push(createFieldInfo(name, {
        type,
        visibility,
        isStatic,
        isReadonly,
        isFinal: modifiers.includes('const'),
        markers,
      }));
    }

    return fields;
  }

  _parseParameters(paramsStr) {
    if (!paramsStr.trim()) return [];

    const parameters = [];
    const params = this._splitParameters(paramsStr);

    for (const param of params) {
      const trimmed = param.trim();
      if (!trimmed) continue;

      // Pattern: [attributes] modifiers type name = defaultValue
      const paramMatch = trimmed.match(/(?:\[[\w\s,]+\]\s*)?(?:(?:this|params|in|out|ref)\s+)?(\w+(?:<[^>]+>)?(?:\[\])?(?:\?)?)\s+(\w+)(?:\s*=\s*(.+))?/);

      if (paramMatch) {
        const type = paramMatch[1];
        const name = paramMatch[2];
        const defaultValue = paramMatch[3] || null;

        parameters.push(createParameterInfo(name, {
          type,
          isOptional: !!defaultValue,
          defaultValue,
        }));
      }
    }

    return parameters;
  }

  _splitParameters(paramsStr) {
    // Split by comma but respect generics
    const params = [];
    let current = '';
    let depth = 0;

    for (const char of paramsStr) {
      if (char === '<') depth++;
      else if (char === '>') depth--;
      else if (char === ',' && depth === 0) {
        params.push(current);
        current = '';
        continue;
      }
      current += char;
    }

    if (current.trim()) params.push(current);
    return params;
  }

  _extractVisibility(modifiers) {
    if (modifiers.includes('public')) return 'public';
    if (modifiers.includes('protected')) return 'protected';
    if (modifiers.includes('internal')) return 'internal';
    if (modifiers.includes('private')) return 'private';
    return 'private'; // Default in C#
  }

  _findMatchingBrace(content, openIndex) {
    if (openIndex < 0 || content[openIndex] !== '{') return -1;

    let depth = 0;
    let inString = false;
    let stringChar = null;

    for (let i = openIndex; i < content.length; i++) {
      const char = content[i];
      const prevChar = i > 0 ? content[i - 1] : '';

      // Handle strings
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = null;
        }
        continue;
      }

      if (inString) continue;

      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }

    return -1;
  }

  _getLineNumber(content, charIndex) {
    return content.substring(0, charIndex).split('\n').length;
  }
}

module.exports = CSharpParser;
