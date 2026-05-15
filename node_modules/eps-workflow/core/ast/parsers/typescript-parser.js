'use strict';

const BaseParser = require('../base-parser');
const {
  createClassInfo,
  createMethodInfo,
  createFunctionInfo,
  createFieldInfo,
  createParameterInfo,
  createMarkerInfo,
  createImportInfo,
  MARKER_TYPES,
  LANGUAGES,
} = require('../unified-schema');

/**
 * TypeScript Parser - Parses TypeScript/JavaScript files using TypeScript compiler API
 *
 * WHY: StarX4CRM frontend uses Next.js/React with TypeScript
 * HOW: Use TypeScript compiler API for proper AST parsing
 *
 * Extracts:
 * - Classes, interfaces, enums, type aliases
 * - Methods with visibility, return type, parameters
 * - Properties/fields with type and decorators
 * - Decorators (converted to MarkerInfo)
 * - Imports and exports
 * - Top-level functions
 * - React components (functional and class-based)
 *
 * @extends BaseParser
 * @module typescript-parser
 */
class TypeScriptParser extends BaseParser {

  constructor() {
    super();
    this._ts = null;
  }

  getLanguage() {
    return LANGUAGES.TYPESCRIPT;
  }

  /**
   * Parse TypeScript content to raw AST
   */
  parseToRawAST(content, filePath) {
    if (!this._ts) {
      this._ts = require('typescript');
    }

    const sourceFile = this._ts.createSourceFile(
      filePath,
      content,
      this._ts.ScriptTarget.Latest,
      true,  // setParentNodes
      this._getScriptKind(filePath)
    );

    return sourceFile;
  }

  /**
   * Get script kind based on file extension
   */
  _getScriptKind(filePath) {
    const ext = filePath.toLowerCase();
    if (ext.endsWith('.tsx')) return this._ts.ScriptKind.TSX;
    if (ext.endsWith('.ts')) return this._ts.ScriptKind.TS;
    if (ext.endsWith('.jsx')) return this._ts.ScriptKind.JSX;
    return this._ts.ScriptKind.JS;
  }

  /**
   * Extract classes, interfaces, enums, type aliases
   */
  extractClasses(sourceFile) {
    const classes = [];
    const ts = this._ts;

    const visit = (node) => {
      // Class declaration
      if (ts.isClassDeclaration(node)) {
        classes.push(this._extractClassInfo(node, sourceFile));
      }
      // Interface declaration
      else if (ts.isInterfaceDeclaration(node)) {
        classes.push(this._extractInterfaceInfo(node, sourceFile));
      }
      // Enum declaration
      else if (ts.isEnumDeclaration(node)) {
        classes.push(this._extractEnumInfo(node, sourceFile));
      }
      // Type alias (can represent complex types)
      else if (ts.isTypeAliasDeclaration(node)) {
        classes.push(this._extractTypeAliasInfo(node, sourceFile));
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return classes;
  }

  /**
   * Extract top-level functions
   */
  extractFunctions(sourceFile) {
    const functions = [];
    const ts = this._ts;

    const visit = (node) => {
      // Function declaration
      if (ts.isFunctionDeclaration(node) && node.name) {
        functions.push(this._extractFunctionInfo(node, sourceFile));
      }
      // Arrow function assigned to variable (const foo = () => {})
      else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (decl.initializer && (
            ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer)
          )) {
            functions.push(this._extractArrowFunctionInfo(decl, node, sourceFile));
          }
        }
      }

      // Only visit top-level children
      if (node === sourceFile) {
        ts.forEachChild(node, visit);
      }
    };

    visit(sourceFile);
    return functions;
  }

  /**
   * Extract imports
   */
  extractImports(sourceFile) {
    const imports = [];
    const ts = this._ts;

    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement)) {
        const importInfo = this._extractImportInfo(statement);
        if (importInfo) {
          imports.push(importInfo);
        }
      }
    }

    return imports;
  }

  /**
   * Extract exports
   */
  extractExports(sourceFile) {
    const exports = [];
    const ts = this._ts;

    for (const statement of sourceFile.statements) {
      // export { foo, bar }
      if (ts.isExportDeclaration(statement)) {
        if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
          for (const element of statement.exportClause.elements) {
            exports.push(element.name.text);
          }
        }
      }
      // export default ...
      else if (ts.isExportAssignment(statement)) {
        exports.push('default');
      }
      // export class/function/const
      else if (this._hasExportModifier(statement)) {
        const name = this._getStatementName(statement);
        if (name) {
          exports.push(name);
        }
      }
    }

    return exports;
  }

  /**
   * Extract file-level markers (directives like 'use client')
   */
  extractFileMarkers(sourceFile) {
    const markers = [];
    const ts = this._ts;

    // Check for 'use client' or 'use server' directives
    for (const statement of sourceFile.statements) {
      if (ts.isExpressionStatement(statement) &&
          ts.isStringLiteral(statement.expression)) {
        const text = statement.expression.text;
        if (text === 'use client' || text === 'use server') {
          markers.push(createMarkerInfo(MARKER_TYPES.DIRECTIVE, text, {}));
        }
      }
    }

    return markers;
  }

  // --- Private Helper Methods ---

  _extractClassInfo(node, sourceFile) {
    const ts = this._ts;
    const name = node.name ? node.name.text : 'AnonymousClass';

    // Get modifiers
    const isAbstract = this._hasModifier(node, ts.SyntaxKind.AbstractKeyword);
    const isExported = this._hasExportModifier(node);

    // Get extends
    let extendsClass = null;
    const implementsList = [];

    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          extendsClass = clause.types[0]?.expression?.getText(sourceFile);
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          for (const type of clause.types) {
            implementsList.push(type.expression.getText(sourceFile));
          }
        }
      }
    }

    // Get decorators
    const markers = this._extractDecorators(node);

    // Get methods and fields
    const methods = [];
    const fields = [];

    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
        methods.push(this._extractMethodInfo(member, sourceFile));
      } else if (ts.isPropertyDeclaration(member)) {
        fields.push(this._extractFieldInfo(member, sourceFile));
      } else if (ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) {
        methods.push(this._extractAccessorInfo(member, sourceFile));
      }
    }

    const lineNumber = this._getLineNumber(node, sourceFile);

    return createClassInfo(name, {
      kind: isAbstract ? 'abstract' : 'class',
      isPublic: isExported,
      isAbstract,
      extends: extendsClass,
      implements: implementsList,
      markers,
      methods,
      fields,
      lineNumber,
    });
  }

  _extractInterfaceInfo(node, sourceFile) {
    const ts = this._ts;
    const name = node.name.text;
    const isExported = this._hasExportModifier(node);

    // Get extends
    const extendsList = [];
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        for (const type of clause.types) {
          extendsList.push(type.expression.getText(sourceFile));
        }
      }
    }

    // Get methods (interface method signatures)
    const methods = [];
    const fields = [];

    for (const member of node.members) {
      if (ts.isMethodSignature(member)) {
        methods.push(this._extractMethodSignatureInfo(member, sourceFile));
      } else if (ts.isPropertySignature(member)) {
        fields.push(this._extractPropertySignatureInfo(member, sourceFile));
      }
    }

    const lineNumber = this._getLineNumber(node, sourceFile);

    return createClassInfo(name, {
      kind: 'interface',
      isPublic: isExported,
      isAbstract: true,
      extends: extendsList.length > 0 ? extendsList[0] : null,
      implements: extendsList.slice(1),
      methods,
      fields,
      lineNumber,
    });
  }

  _extractEnumInfo(node, sourceFile) {
    const name = node.name.text;
    const isExported = this._hasExportModifier(node);

    // Get enum members as fields
    const fields = [];
    for (const member of node.members) {
      const memberName = member.name.getText(sourceFile);
      fields.push(createFieldInfo(memberName, {
        type: 'enum',
        visibility: 'public',
        isStatic: true,
        isFinal: true,
      }));
    }

    const lineNumber = this._getLineNumber(node, sourceFile);

    return createClassInfo(name, {
      kind: 'enum',
      isPublic: isExported,
      isFinal: true,
      fields,
      lineNumber,
    });
  }

  _extractTypeAliasInfo(node, sourceFile) {
    const name = node.name.text;
    const isExported = this._hasExportModifier(node);
    const lineNumber = this._getLineNumber(node, sourceFile);

    return createClassInfo(name, {
      kind: 'type',
      isPublic: isExported,
      lineNumber,
    });
  }

  _extractMethodInfo(node, sourceFile) {
    const ts = this._ts;
    const isConstructor = ts.isConstructorDeclaration(node);
    const name = isConstructor ? 'constructor' : (node.name ? node.name.getText(sourceFile) : 'anonymous');

    const visibility = this._getVisibility(node);
    const isStatic = this._hasModifier(node, ts.SyntaxKind.StaticKeyword);
    const isAsync = this._hasModifier(node, ts.SyntaxKind.AsyncKeyword);
    const isAbstract = this._hasModifier(node, ts.SyntaxKind.AbstractKeyword);

    // Get return type
    let returnType = null;
    if (!isConstructor && node.type) {
      returnType = node.type.getText(sourceFile);
    }

    // Get parameters
    const parameters = this._extractParameters(node, sourceFile);

    // Get decorators
    const markers = this._extractDecorators(node);

    const lineNumber = this._getLineNumber(node, sourceFile);

    return createMethodInfo(name, {
      visibility,
      isStatic,
      isAsync,
      isAbstract,
      returnType,
      parameters,
      markers,
      lineNumber,
    });
  }

  _extractAccessorInfo(node, sourceFile) {
    const ts = this._ts;
    const name = node.name.getText(sourceFile);
    const isGetter = ts.isGetAccessorDeclaration(node);

    const visibility = this._getVisibility(node);
    const isStatic = this._hasModifier(node, ts.SyntaxKind.StaticKeyword);

    let returnType = null;
    if (node.type) {
      returnType = node.type.getText(sourceFile);
    }

    const markers = this._extractDecorators(node);
    const lineNumber = this._getLineNumber(node, sourceFile);

    return createMethodInfo(isGetter ? `get ${name}` : `set ${name}`, {
      visibility,
      isStatic,
      returnType,
      markers,
      lineNumber,
    });
  }

  _extractMethodSignatureInfo(node, sourceFile) {
    const name = node.name.getText(sourceFile);

    let returnType = null;
    if (node.type) {
      returnType = node.type.getText(sourceFile);
    }

    const parameters = this._extractParameters(node, sourceFile);
    const lineNumber = this._getLineNumber(node, sourceFile);

    return createMethodInfo(name, {
      visibility: 'public',
      isAbstract: true,
      returnType,
      parameters,
      lineNumber,
    });
  }

  _extractFieldInfo(node, sourceFile) {
    const ts = this._ts;
    const name = node.name.getText(sourceFile);

    const visibility = this._getVisibility(node);
    const isStatic = this._hasModifier(node, ts.SyntaxKind.StaticKeyword);
    const isReadonly = this._hasModifier(node, ts.SyntaxKind.ReadonlyKeyword);

    let type = null;
    if (node.type) {
      type = node.type.getText(sourceFile);
    }

    const markers = this._extractDecorators(node);
    const lineNumber = this._getLineNumber(node, sourceFile);

    return createFieldInfo(name, {
      type,
      visibility,
      isStatic,
      isReadonly,
      markers,
      lineNumber,
    });
  }

  _extractPropertySignatureInfo(node, sourceFile) {
    const name = node.name.getText(sourceFile);
    const isOptional = !!node.questionToken;

    let type = null;
    if (node.type) {
      type = node.type.getText(sourceFile);
    }

    const lineNumber = this._getLineNumber(node, sourceFile);

    return createFieldInfo(name, {
      type,
      visibility: 'public',
      isOptional,
      lineNumber,
    });
  }

  _extractFunctionInfo(node, sourceFile) {
    const ts = this._ts;
    const name = node.name.text;
    const isExported = this._hasExportModifier(node);
    const isDefault = this._hasModifier(node, ts.SyntaxKind.DefaultKeyword);
    const isAsync = this._hasModifier(node, ts.SyntaxKind.AsyncKeyword);

    let returnType = null;
    if (node.type) {
      returnType = node.type.getText(sourceFile);
    }

    const parameters = this._extractParameters(node, sourceFile);
    const markers = this._extractDecorators(node);
    const lineNumber = this._getLineNumber(node, sourceFile);

    return createFunctionInfo(name, {
      isExported,
      isDefault,
      isAsync,
      returnType,
      parameters,
      markers,
      lineNumber,
    });
  }

  _extractArrowFunctionInfo(decl, statement, sourceFile) {
    const ts = this._ts;
    const name = decl.name.getText(sourceFile);
    const isExported = this._hasExportModifier(statement);
    const func = decl.initializer;
    const isAsync = this._hasModifier(func, ts.SyntaxKind.AsyncKeyword) ||
                    (func.modifiers && func.modifiers.some(m => m.kind === ts.SyntaxKind.AsyncKeyword));

    let returnType = null;
    if (func.type) {
      returnType = func.type.getText(sourceFile);
    }

    const parameters = this._extractParameters(func, sourceFile);
    const markers = this._extractDecorators(statement);
    const lineNumber = this._getLineNumber(decl, sourceFile);

    return createFunctionInfo(name, {
      isExported,
      isAsync,
      returnType,
      parameters,
      markers,
      lineNumber,
    });
  }

  _extractImportInfo(node) {
    const ts = this._ts;
    const moduleSpecifier = node.moduleSpecifier;

    if (!moduleSpecifier || !ts.isStringLiteral(moduleSpecifier)) {
      return null;
    }

    const source = moduleSpecifier.text;
    const specifiers = [];
    let defaultImport = null;
    let namespaceImport = null;
    let isTypeOnly = false;

    if (node.importClause) {
      const clause = node.importClause;
      isTypeOnly = !!clause.isTypeOnly;

      // Default import
      if (clause.name) {
        defaultImport = clause.name.text;
      }

      // Named imports or namespace import
      if (clause.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) {
          namespaceImport = clause.namedBindings.name.text;
        } else if (ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) {
            specifiers.push(element.name.text);
          }
        }
      }
    }

    return createImportInfo(source, {
      specifiers,
      defaultImport,
      namespaceImport,
      isRelative: source.startsWith('.'),
      isTypeOnly,
    });
  }

  _extractParameters(node, sourceFile) {
    const parameters = [];

    if (!node.parameters) return parameters;

    for (const param of node.parameters) {
      const name = param.name.getText(sourceFile);
      const isOptional = !!param.questionToken;

      let type = null;
      if (param.type) {
        type = param.type.getText(sourceFile);
      }

      let defaultValue = null;
      if (param.initializer) {
        defaultValue = param.initializer.getText(sourceFile);
      }

      const markers = this._extractDecorators(param);

      parameters.push(createParameterInfo(name, {
        type,
        isOptional,
        defaultValue,
        markers,
      }));
    }

    return parameters;
  }

  _extractDecorators(node) {
    const markers = [];
    const ts = this._ts;

    // TypeScript 5.0+ uses node.modifiers for decorators
    const decorators = ts.getDecorators ? ts.getDecorators(node) :
                       (node.decorators || []);

    if (!decorators) return markers;

    for (const decorator of decorators) {
      let name = '';
      let value = null;
      const attributes = {};

      const expr = decorator.expression;

      if (ts.isCallExpression(expr)) {
        // @Decorator(args)
        name = expr.expression.getText();
        if (expr.arguments.length > 0) {
          value = expr.arguments[0].getText();
        }
      } else if (ts.isIdentifier(expr)) {
        // @Decorator
        name = expr.text;
      } else {
        name = expr.getText();
      }

      markers.push(createMarkerInfo(MARKER_TYPES.DECORATOR, name, { value, attributes }));
    }

    return markers;
  }

  _hasModifier(node, kind) {
    const ts = this._ts;
    const modifiers = ts.getModifiers ? ts.getModifiers(node) : node.modifiers;
    return modifiers ? modifiers.some(m => m.kind === kind) : false;
  }

  _hasExportModifier(node) {
    return this._hasModifier(node, this._ts.SyntaxKind.ExportKeyword);
  }

  _getVisibility(node) {
    const ts = this._ts;
    if (this._hasModifier(node, ts.SyntaxKind.PrivateKeyword)) return 'private';
    if (this._hasModifier(node, ts.SyntaxKind.ProtectedKeyword)) return 'protected';
    return 'public';
  }

  _getStatementName(statement) {
    const ts = this._ts;

    if (ts.isClassDeclaration(statement) && statement.name) {
      return statement.name.text;
    }
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      return statement.name.text;
    }
    if (ts.isVariableStatement(statement)) {
      const decl = statement.declarationList.declarations[0];
      if (decl && ts.isIdentifier(decl.name)) {
        return decl.name.text;
      }
    }
    if (ts.isInterfaceDeclaration(statement)) {
      return statement.name.text;
    }
    if (ts.isTypeAliasDeclaration(statement)) {
      return statement.name.text;
    }
    if (ts.isEnumDeclaration(statement)) {
      return statement.name.text;
    }

    return null;
  }

  _getLineNumber(node, sourceFile) {
    const pos = node.getStart(sourceFile);
    const lineAndChar = sourceFile.getLineAndCharacterOfPosition(pos);
    return lineAndChar.line + 1;  // 1-indexed
  }
}

module.exports = TypeScriptParser;
