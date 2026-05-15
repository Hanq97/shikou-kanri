'use strict';

const BaseParser = require('../base-parser');
const {
  createClassInfo,
  createMethodInfo,
  createFieldInfo,
  createMarkerInfo,
  createParameterInfo,
  createFunctionInfo,
  MARKER_TYPES,
} = require('../unified-schema');

/**
 * PHP Parser - Parses PHP source files using regex-based extraction
 *
 * WHY: Support PHP 8+ and Laravel projects
 * HOW: Regex-based parsing for PHP syntax
 *
 * Extracts:
 * - Classes, interfaces, traits, enums (PHP 8.1+)
 * - Methods with visibility, return type, parameters
 * - Properties with typed properties (PHP 7.4+)
 * - Attributes (PHP 8.0+, converted to MarkerInfo)
 * - Namespace and use statements
 * - Constructor property promotion (PHP 8.0+)
 *
 * @extends BaseParser
 * @module php-parser
 */
class PhpParser extends BaseParser {

  constructor() {
    super();
  }

  getLanguage() {
    return 'php';
  }

  /**
   * Parse PHP content to raw AST (regex-based structure)
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
    const namespaceMatch = rawAst.content.match(/^\s*namespace\s+([\w\\]+)\s*;/m);
    return namespaceMatch ? namespaceMatch[1] : null;
  }

  /**
   * Extract classes, interfaces, traits, enums
   */
  extractClasses(rawAst) {
    const classes = [];
    const content = rawAst.content;

    // Pattern for class/interface/trait/enum declarations
    // Captures: attributes, modifiers, kind, name, extends, implements
    const typePattern = /(?:(#\[[\s\S]*?\])\s*)?((?:final|abstract|readonly)\s+)?\b(class|interface|trait|enum)\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w\s,\\]+))?/g;

    let match;
    while ((match = typePattern.exec(content)) !== null) {
      const attributeBlock = match[1] || '';
      const modifiers = match[2] || '';
      const kind = match[3];
      const name = match[4];
      const extendsClass = match[5] || null;
      const implementsStr = match[6] || '';

      // Parse attributes (PHP 8+)
      const markers = this._parseAttributes(attributeBlock);

      // Parse modifiers
      const isAbstract = modifiers.includes('abstract');
      const isFinal = modifiers.includes('final');
      const isReadonly = modifiers.includes('readonly');

      // Parse implements
      const implementsList = implementsStr
        ? implementsStr.split(',').map(i => i.trim().split('\\').pop())
        : [];

      // Find class body
      const classStart = match.index;
      const bodyStart = content.indexOf('{', classStart);
      const bodyEnd = this._findMatchingBrace(content, bodyStart);
      const classBody = bodyStart > 0 && bodyEnd > bodyStart
        ? content.substring(bodyStart + 1, bodyEnd)
        : '';

      // Extract methods and properties
      const methods = this._extractMethods(classBody);
      const fields = this._extractFields(classBody);

      // Also extract constructor property promotion as fields
      const promotedFields = this._extractConstructorPropertyPromotion(classBody);
      fields.push(...promotedFields);

      // Get line number
      const lineNumber = this._getLineNumber(content, classStart);

      classes.push(createClassInfo(name, {
        kind: kind === 'trait' ? 'class' : kind,
        isPublic: true, // PHP classes are always accessible within namespace
        isAbstract,
        isFinal,
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
   * Extract top-level functions
   */
  extractFunctions(rawAst) {
    const functions = [];
    const content = rawAst.content;

    // Pattern for standalone functions (not inside a class)
    const funcPattern = /^\s*function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([\w|?\\]+))?\s*\{/gm;

    // First, find all class bodies to exclude
    const classRanges = this._findClassRanges(content);

    let match;
    while ((match = funcPattern.exec(content)) !== null) {
      // Skip if inside a class
      if (this._isInsideRange(match.index, classRanges)) {
        continue;
      }

      const name = match[1];
      const paramsStr = match[2];
      const returnType = match[3] || null;

      const parameters = this._parseParameters(paramsStr);

      functions.push(createFunctionInfo(name, {
        isExported: true, // PHP functions are globally accessible
        isAsync: false,
        returnType: returnType ? returnType.replace(/\\/g, '') : null,
        parameters,
        lineNumber: this._getLineNumber(content, match.index),
      }));
    }

    return functions;
  }

  /**
   * Extract use statements (imports)
   */
  extractImports(rawAst) {
    const imports = [];
    const usePattern = /^\s*use\s+([\w\\]+)(?:\s+as\s+(\w+))?;/gm;

    let match;
    while ((match = usePattern.exec(rawAst.content)) !== null) {
      const source = match[1];
      const alias = match[2] || null;
      const shortName = source.split('\\').pop();

      imports.push({
        source,
        specifiers: [alias || shortName],
        isRelative: false,
        alias,
      });
    }

    return imports;
  }

  /**
   * Extract exports (PHP doesn't have explicit exports)
   */
  extractExports(rawAst) {
    const exports = [];
    const classes = this.extractClasses(rawAst);

    for (const cls of classes) {
      exports.push(cls.name);
    }

    const functions = this.extractFunctions(rawAst);
    for (const fn of functions) {
      exports.push(fn.name);
    }

    return exports;
  }

  // --- Private Helper Methods ---

  _parseAttributes(attributeBlock) {
    const markers = [];
    if (!attributeBlock) return markers;

    // PHP 8+ attribute pattern: #[AttributeName] or #[AttributeName(params)]
    const attrPattern = /#\[(\w+)(?:\s*\(([^)]*)\))?\]/g;

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
    // Simple parsing: key: value or just value
    const parts = paramString.split(',').map(p => p.trim());

    for (const part of parts) {
      const colonIndex = part.indexOf(':');
      if (colonIndex > 0) {
        const key = part.substring(0, colonIndex).trim();
        const value = part.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');
        params[key] = value;
      }
    }

    return params;
  }

  _extractMethods(classBody) {
    const methods = [];

    // Pattern for method declarations
    // Captures: attributes, visibility, modifiers, function, name, parameters, return type
    const methodPattern = /(?:(#\[[\s\S]*?\])\s*)?(public|protected|private)?\s*(static|final|abstract)?\s*function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([\w|?\\]+))?/g;

    let match;
    while ((match = methodPattern.exec(classBody)) !== null) {
      const attributeBlock = match[1] || '';
      const visibility = match[2] || 'public';
      const modifiers = match[3] || '';
      const name = match[4];
      const paramsStr = match[5] || '';
      const returnType = match[6] || null;

      const markers = this._parseAttributes(attributeBlock);
      const isStatic = modifiers.includes('static');
      const isFinal = modifiers.includes('final');
      const isAbstract = modifiers.includes('abstract');

      const parameters = this._parseParameters(paramsStr);

      methods.push(createMethodInfo(name, {
        visibility,
        isStatic,
        isAbstract,
        isFinal,
        returnType: returnType ? returnType.replace(/\\/g, '') : null,
        parameters,
        markers,
        lineNumber: 0,
      }));
    }

    return methods;
  }

  _extractFields(classBody) {
    const fields = [];

    // Pattern for property declarations (PHP 7.4+ typed properties)
    // Captures: attributes, visibility, modifiers, type, name, default value
    const fieldPattern = /(?:(#\[[\s\S]*?\])\s*)?(public|protected|private)\s*(static|readonly)?\s*(?:([\w|?\\]+)\s+)?\$(\w+)(?:\s*=\s*([^;]+))?;/g;

    let match;
    while ((match = fieldPattern.exec(classBody)) !== null) {
      const attributeBlock = match[1] || '';
      const visibility = match[2] || 'public';
      const modifiers = match[3] || '';
      const type = match[4] || null;
      const name = match[5];
      const defaultValue = match[6] || null;

      const markers = this._parseAttributes(attributeBlock);
      const isStatic = modifiers.includes('static');
      const isReadonly = modifiers.includes('readonly');

      fields.push(createFieldInfo(name, {
        type: type ? type.replace(/\\/g, '') : null,
        visibility,
        isStatic,
        isReadonly,
        initialValue: defaultValue?.trim(),
        markers,
      }));
    }

    return fields;
  }

  _extractConstructorPropertyPromotion(classBody) {
    const fields = [];

    // PHP 8.0+ constructor property promotion
    // public function __construct(private string $name, public int $age = 0)
    const constructorMatch = classBody.match(/function\s+__construct\s*\(([^)]+)\)/);

    if (constructorMatch) {
      const paramsStr = constructorMatch[1];
      const promotionPattern = /(public|protected|private)\s+(?:readonly\s+)?([\w|?\\]+)\s+\$(\w+)/g;

      let match;
      while ((match = promotionPattern.exec(paramsStr)) !== null) {
        const visibility = match[1];
        const type = match[2];
        const name = match[3];

        fields.push(createFieldInfo(name, {
          type: type.replace(/\\/g, ''),
          visibility,
          isStatic: false,
          isReadonly: paramsStr.includes('readonly'),
          markers: [],
        }));
      }
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

      // Skip constructor property promotion (handled separately)
      if (trimmed.match(/^(public|protected|private)\s+/)) continue;

      // Pattern: ?Type $name = defaultValue
      const paramMatch = trimmed.match(/(?:([\w|?\\]+)\s+)?\$(\w+)(?:\s*=\s*(.+))?/);

      if (paramMatch) {
        const type = paramMatch[1] || null;
        const name = paramMatch[2];
        const defaultValue = paramMatch[3] || null;

        parameters.push(createParameterInfo(name, {
          type: type ? type.replace(/\\/g, '') : null,
          isOptional: !!defaultValue,
          defaultValue,
        }));
      }
    }

    return parameters;
  }

  _splitParameters(paramsStr) {
    // Split by comma but respect nested parentheses and arrays
    const params = [];
    let current = '';
    let depth = 0;

    for (const char of paramsStr) {
      if (char === '(' || char === '[') depth++;
      else if (char === ')' || char === ']') depth--;
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

  _findClassRanges(content) {
    const ranges = [];
    const classPattern = /\b(class|interface|trait|enum)\s+\w+[\s\S]*?\{/g;

    let match;
    while ((match = classPattern.exec(content)) !== null) {
      const start = match.index;
      const braceStart = content.indexOf('{', start);
      const braceEnd = this._findMatchingBrace(content, braceStart);

      if (braceEnd > braceStart) {
        ranges.push({ start, end: braceEnd });
      }
    }

    return ranges;
  }

  _isInsideRange(index, ranges) {
    return ranges.some(r => index > r.start && index < r.end);
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

module.exports = PhpParser;
