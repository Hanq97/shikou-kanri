'use strict';

const BaseParser = require('../base-parser');
const {
  createClassInfo,
  createMethodInfo,
  createFieldInfo,
  createParameterInfo,
  createMarkerInfo,
  createImportInfo,
  MARKER_TYPES,
  LANGUAGES,
} = require('../unified-schema');

/**
 * Java Parser - Parses Java source files using java-parser
 *
 * WHY: StarX4CRM has 10 Java backend modules that need indexing
 * HOW: Use java-parser npm package for proper AST parsing
 *
 * Extracts:
 * - Classes, interfaces, enums, records
 * - Methods with visibility, return type, parameters
 * - Fields with type and annotations
 * - Annotations (converted to MarkerInfo)
 * - Package and imports
 *
 * @extends BaseParser
 * @module java-parser
 */
class JavaParser extends BaseParser {

  constructor() {
    super();
    this._parser = null;
  }

  getLanguage() {
    return LANGUAGES.JAVA;
  }

  /**
   * Parse Java content to raw AST
   */
  parseToRawAST(content, filePath) {
    if (!this._parser) {
      const { parse } = require('java-parser');
      this._parser = parse;
    }

    return this._parser(content);
  }

  /**
   * Extract package name
   */
  extractPackage(rawAst) {
    try {
      const compUnit = rawAst.children?.ordinaryCompilationUnit?.[0];
      const pkgDecl = compUnit?.children?.packageDeclaration?.[0];

      if (pkgDecl) {
        // java-parser CST stores package name as Identifier[] + Dot[] tokens directly
        // e.g., "package jp.co.gigxit.starx4crm.rest;" → Identifier: [jp, co, gigxit, starx4crm, rest]
        const identifiers = pkgDecl.children?.Identifier || [];
        if (identifiers.length > 0) {
          return identifiers.map(id => id.image).filter(Boolean).join('.');
        }
      }
    } catch (e) {
      // Package extraction failed
    }
    return null;
  }

  /**
   * Extract classes, interfaces, enums, records
   */
  extractClasses(rawAst) {
    const classes = [];

    try {
      // Get type declarations from compilation unit
      const compUnit = rawAst.children?.ordinaryCompilationUnit?.[0];
      const typeDecls = compUnit?.children?.typeDeclaration || [];

      for (const typeDecl of typeDecls) {
        const classDecl = typeDecl.children?.classDeclaration?.[0];
        const interfaceDecl = typeDecl.children?.interfaceDeclaration?.[0];

        if (classDecl) {
          // Check for normal class, enum, or record
          const normalClass = classDecl.children?.normalClassDeclaration?.[0];
          const enumDecl = classDecl.children?.enumDeclaration?.[0];
          const recordDecl = classDecl.children?.recordDeclaration?.[0];

          if (normalClass) {
            classes.push(this._extractClassInfo(normalClass, typeDecl, 'class'));
          } else if (enumDecl) {
            classes.push(this._extractEnumInfo(enumDecl, typeDecl));
          } else if (recordDecl) {
            classes.push(this._extractRecordInfo(recordDecl, typeDecl));
          }
        } else if (interfaceDecl) {
          // Check for normal interface or annotation type
          const normalInterface = interfaceDecl.children?.normalInterfaceDeclaration?.[0];
          const annotationDecl = interfaceDecl.children?.annotationTypeDeclaration?.[0];

          if (normalInterface) {
            classes.push(this._extractInterfaceInfo(normalInterface, typeDecl));
          } else if (annotationDecl) {
            classes.push(this._extractAnnotationTypeInfo(annotationDecl, typeDecl));
          }
        }
      }
    } catch (e) {
      console.warn(`[JavaParser] Error extracting classes: ${e.message}`);
    }

    return classes;
  }

  /**
   * Extract top-level functions (Java doesn't have standalone functions)
   */
  extractFunctions(rawAst) {
    // Java has no top-level functions (all methods are in classes)
    return [];
  }

  /**
   * Extract imports
   */
  extractImports(rawAst) {
    const imports = [];

    try {
      const compUnit = rawAst.children?.ordinaryCompilationUnit?.[0];
      const importDecls = compUnit?.children?.importDeclaration || [];

      for (const imp of importDecls) {
        const isStatic = !!imp.children?.Static;
        const isWildcard = !!imp.children?.Star;

        // Get the package or type name
        const pkgOrTypeName = imp.children?.packageOrTypeName?.[0];
        if (pkgOrTypeName) {
          const source = this._extractQualifiedName(pkgOrTypeName);

          if (source) {
            imports.push(createImportInfo(source, {
              specifiers: isWildcard ? ['*'] : [source.split('.').pop()],
              isRelative: false,  // Java imports are never relative
              isStatic,
              isWildcard,
            }));
          }
        }
      }
    } catch (e) {
      console.warn(`[JavaParser] Error extracting imports: ${e.message}`);
    }

    return imports;
  }

  /**
   * Extract exports (Java: public classes are "exported")
   */
  extractExports(rawAst) {
    const exports = [];

    for (const cls of this.extractClasses(rawAst)) {
      if (cls.isPublic) {
        exports.push(cls.name);
      }
    }

    return exports;
  }

  // --- Private Helper Methods ---

  _extractClassInfo(normalClass, typeDecl, kind) {
    const name = this._getTypeIdentifier(normalClass);

    // Extract modifiers and annotations from classDeclaration level (parent of normalClassDeclaration)
    const classDecl = typeDecl.children?.classDeclaration?.[0];
    const modifiers = this._extractClassDeclModifiers(classDecl);
    const markers = this._extractClassDeclAnnotations(classDecl);

    // Get extends (superclass)
    const extendsClass = this._extractSuperclass(normalClass);

    // Get implements (interfaces)
    const implementsList = this._extractInterfaces(normalClass);

    // Get methods and fields from class body
    const classBody = normalClass.children?.classBody?.[0];
    const methods = this._extractMethods(classBody);
    const fields = this._extractFields(classBody);

    const lineNumber = this._getStartLine(normalClass);

    return createClassInfo(name, {
      kind: modifiers.includes('abstract') ? 'abstract' : kind,
      isPublic: modifiers.includes('public'),
      isAbstract: modifiers.includes('abstract'),
      isFinal: modifiers.includes('final'),
      extends: extendsClass,
      implements: implementsList,
      markers,
      methods,
      fields,
      lineNumber,
    });
  }

  _extractInterfaceInfo(normalInterface, typeDecl) {
    const name = this._getTypeIdentifier(normalInterface);
    const modifiers = this._extractModifiers(typeDecl);
    const markers = this._extractAnnotations(typeDecl);

    // Get extends (parent interfaces)
    const extendsList = this._extractInterfaceExtends(normalInterface);

    // Get methods from interface body
    const interfaceBody = normalInterface.children?.interfaceBody?.[0];
    const methods = this._extractInterfaceMethods(interfaceBody);

    const lineNumber = this._getStartLine(normalInterface);

    return createClassInfo(name, {
      kind: 'interface',
      isPublic: modifiers.includes('public'),
      isAbstract: true,  // Interfaces are implicitly abstract
      extends: extendsList.length > 0 ? extendsList[0] : null,
      implements: extendsList.slice(1),  // Additional parent interfaces
      markers,
      methods,
      fields: [],
      lineNumber,
    });
  }

  _extractEnumInfo(enumDecl, typeDecl) {
    const name = this._getTypeIdentifier(enumDecl);
    const modifiers = this._extractModifiers(typeDecl);
    const markers = this._extractAnnotations(typeDecl);

    // Get enum constants
    const enumBody = enumDecl.children?.enumBody?.[0];
    const constants = this._extractEnumConstants(enumBody);

    const lineNumber = this._getStartLine(enumDecl);

    return createClassInfo(name, {
      kind: 'enum',
      isPublic: modifiers.includes('public'),
      isFinal: true,  // Enums are implicitly final
      markers,
      methods: [],
      fields: constants,
      lineNumber,
    });
  }

  _extractRecordInfo(recordDecl, typeDecl) {
    const name = this._getTypeIdentifier(recordDecl);
    const modifiers = this._extractModifiers(typeDecl);
    const markers = this._extractAnnotations(typeDecl);

    // Get record components as fields
    const recordComponents = this._extractRecordComponents(recordDecl);

    const lineNumber = this._getStartLine(recordDecl);

    return createClassInfo(name, {
      kind: 'record',
      isPublic: modifiers.includes('public'),
      isFinal: true,  // Records are implicitly final
      markers,
      methods: [],
      fields: recordComponents,
      lineNumber,
    });
  }

  _extractAnnotationTypeInfo(annotationDecl, typeDecl) {
    const name = this._getTypeIdentifier(annotationDecl);
    const modifiers = this._extractModifiers(typeDecl);
    const markers = this._extractAnnotations(typeDecl);

    const lineNumber = this._getStartLine(annotationDecl);

    return createClassInfo(name, {
      kind: 'annotation',
      isPublic: modifiers.includes('public'),
      isAbstract: true,
      markers,
      methods: [],
      fields: [],
      lineNumber,
    });
  }

  _extractMethods(classBody) {
    const methods = [];
    if (!classBody) return methods;

    const memberDecls = classBody.children?.classBodyDeclaration || [];

    for (const member of memberDecls) {
      const classMemberDecl = member.children?.classMemberDeclaration?.[0];
      if (!classMemberDecl) continue;

      const methodDecl = classMemberDecl.children?.methodDeclaration?.[0];
      if (methodDecl) {
        const methodHeader = methodDecl.children?.methodHeader?.[0];
        if (methodHeader) {
          const name = this._getMethodName(methodHeader);
          // Get modifiers and annotations from methodDeclaration (inside methodDecl, not member)
          const modifiers = this._extractMethodDeclModifiers(methodDecl);
          const markers = this._extractMethodDeclAnnotations(methodDecl);
          const returnType = this._extractReturnType(methodHeader);
          const parameters = this._extractParameters(methodHeader);
          const throws = this._extractThrows(methodHeader);
          const lineNumber = this._getStartLine(methodDecl);

          methods.push(createMethodInfo(name, {
            visibility: this._getVisibilityFromModifiers(modifiers),
            isStatic: modifiers.includes('static'),
            isAbstract: modifiers.includes('abstract'),
            isFinal: modifiers.includes('final'),
            returnType,
            parameters,
            markers,
            throws,
            lineNumber,
          }));
        }
      }

      // Also check for constructor declarations
      const constructorDecl = classMemberDecl.children?.constructorDeclaration?.[0];
      if (constructorDecl) {
        const constructorHeader = constructorDecl.children?.constructorDeclarator?.[0];
        if (constructorHeader) {
          const name = this._getConstructorName(constructorHeader);
          const modifiers = this._extractConstructorDeclModifiers(constructorDecl);
          const markers = this._extractConstructorDeclAnnotations(constructorDecl);
          const parameters = this._extractConstructorParameters(constructorHeader);
          const lineNumber = this._getStartLine(constructorDecl);

          methods.push(createMethodInfo(name, {
            visibility: this._getVisibilityFromModifiers(modifiers),
            isStatic: false,
            returnType: null,  // Constructors don't have return type
            parameters,
            markers,
            lineNumber,
          }));
        }
      }
    }

    return methods;
  }

  _extractMethodDeclModifiers(methodDecl) {
    const modifiers = [];
    const methodMods = methodDecl.children?.methodModifier || [];

    for (const mod of methodMods) {
      if (mod.children?.Public) modifiers.push('public');
      if (mod.children?.Protected) modifiers.push('protected');
      if (mod.children?.Private) modifiers.push('private');
      if (mod.children?.Static) modifiers.push('static');
      if (mod.children?.Final) modifiers.push('final');
      if (mod.children?.Abstract) modifiers.push('abstract');
    }

    return modifiers;
  }

  _extractMethodDeclAnnotations(methodDecl) {
    const markers = [];
    const methodMods = methodDecl.children?.methodModifier || [];

    for (const mod of methodMods) {
      const annotation = mod.children?.annotation?.[0];
      if (annotation) {
        const marker = this._extractSingleAnnotation(annotation);
        if (marker) {
          markers.push(marker);
        }
      }
    }

    return markers;
  }

  _extractConstructorDeclModifiers(constructorDecl) {
    const modifiers = [];
    const constructorMods = constructorDecl.children?.constructorModifier || [];

    for (const mod of constructorMods) {
      if (mod.children?.Public) modifiers.push('public');
      if (mod.children?.Protected) modifiers.push('protected');
      if (mod.children?.Private) modifiers.push('private');
    }

    return modifiers;
  }

  _extractConstructorDeclAnnotations(constructorDecl) {
    const markers = [];
    const constructorMods = constructorDecl.children?.constructorModifier || [];

    for (const mod of constructorMods) {
      const annotation = mod.children?.annotation?.[0];
      if (annotation) {
        const marker = this._extractSingleAnnotation(annotation);
        if (marker) {
          markers.push(marker);
        }
      }
    }

    return markers;
  }

  _extractFields(classBody) {
    const fields = [];
    if (!classBody) return fields;

    const memberDecls = classBody.children?.classBodyDeclaration || [];

    for (const member of memberDecls) {
      const classMemberDecl = member.children?.classMemberDeclaration?.[0];
      if (!classMemberDecl) continue;

      const fieldDecl = classMemberDecl.children?.fieldDeclaration?.[0];
      if (fieldDecl) {
        const type = this._extractFieldType(fieldDecl);
        // Get modifiers and annotations from fieldDeclaration (inside fieldDecl)
        const modifiers = this._extractFieldDeclModifiers(fieldDecl);
        const markers = this._extractFieldDeclAnnotations(fieldDecl);
        const names = this._extractFieldNames(fieldDecl);
        const lineNumber = this._getStartLine(fieldDecl);

        for (const name of names) {
          fields.push(createFieldInfo(name, {
            type,
            visibility: this._getVisibilityFromModifiers(modifiers),
            isStatic: modifiers.includes('static'),
            isFinal: modifiers.includes('final'),
            markers,
            lineNumber,
          }));
        }
      }
    }

    return fields;
  }

  _extractFieldDeclModifiers(fieldDecl) {
    const modifiers = [];
    const fieldMods = fieldDecl.children?.fieldModifier || [];

    for (const mod of fieldMods) {
      if (mod.children?.Public) modifiers.push('public');
      if (mod.children?.Protected) modifiers.push('protected');
      if (mod.children?.Private) modifiers.push('private');
      if (mod.children?.Static) modifiers.push('static');
      if (mod.children?.Final) modifiers.push('final');
      if (mod.children?.Volatile) modifiers.push('volatile');
      if (mod.children?.Transient) modifiers.push('transient');
    }

    return modifiers;
  }

  _extractFieldDeclAnnotations(fieldDecl) {
    const markers = [];
    const fieldMods = fieldDecl.children?.fieldModifier || [];

    for (const mod of fieldMods) {
      const annotation = mod.children?.annotation?.[0];
      if (annotation) {
        const marker = this._extractSingleAnnotation(annotation);
        if (marker) {
          markers.push(marker);
        }
      }
    }

    return markers;
  }

  _extractInterfaceMethods(interfaceBody) {
    const methods = [];
    if (!interfaceBody) return methods;

    const memberDecls = interfaceBody.children?.interfaceMemberDeclaration || [];

    for (const member of memberDecls) {
      const methodDecl = member.children?.interfaceMethodDeclaration?.[0];
      if (methodDecl) {
        const methodHeader = methodDecl.children?.interfaceMethodModifier || [];
        const methodDef = methodDecl.children?.methodHeader?.[0];

        if (methodDef) {
          const name = this._getMethodName(methodDef);
          const returnType = this._extractReturnType(methodDef);
          const parameters = this._extractParameters(methodDef);
          const lineNumber = this._getStartLine(methodDecl);

          methods.push(createMethodInfo(name, {
            visibility: 'public',  // Interface methods are public by default
            isAbstract: true,
            returnType,
            parameters,
            lineNumber,
          }));
        }
      }
    }

    return methods;
  }

  _extractEnumConstants(enumBody) {
    const constants = [];
    if (!enumBody) return constants;

    const enumConstList = enumBody.children?.enumConstantList?.[0];
    const enumConsts = enumConstList?.children?.enumConstant || [];

    for (const enumConst of enumConsts) {
      const name = this._getIdentifierText(enumConst.children?.Identifier?.[0]);
      if (name) {
        constants.push(createFieldInfo(name, {
          type: 'enum',
          visibility: 'public',
          isStatic: true,
          isFinal: true,
        }));
      }
    }

    return constants;
  }

  _extractRecordComponents(recordDecl) {
    const components = [];
    const componentList = recordDecl.children?.recordHeader?.[0]?.children?.recordComponentList?.[0];

    if (!componentList) return components;

    const recordComps = componentList.children?.recordComponent || [];

    for (const comp of recordComps) {
      const type = this._extractUnannType(comp.children?.unannType?.[0]);
      const name = this._getIdentifierText(comp.children?.Identifier?.[0]);

      if (name) {
        components.push(createFieldInfo(name, {
          type,
          visibility: 'private',
          isFinal: true,
        }));
      }
    }

    return components;
  }

  _extractAnnotations(node) {
    const markers = [];
    if (!node || !node.children) return markers;

    // Look in various modifier locations
    const modifierContainers = [
      node.children.classModifier,
      node.children.interfaceModifier,
      node.children.methodModifier,
      node.children.fieldModifier,
      node.children.constructorModifier,
    ].filter(Boolean);

    for (const mods of modifierContainers) {
      for (const mod of mods) {
        const annotation = mod.children?.annotation?.[0];
        if (annotation) {
          const marker = this._extractSingleAnnotation(annotation);
          if (marker) {
            markers.push(marker);
          }
        }
      }
    }

    return markers;
  }

  _extractSingleAnnotation(annotation) {
    // Try different annotation types
    const normalAnnotation = annotation.children?.normalAnnotation?.[0];
    const markerAnnotation = annotation.children?.markerAnnotation?.[0];
    const singleMemberAnnotation = annotation.children?.singleElementAnnotation?.[0];

    let name = null;
    let value = null;
    let attributes = {};

    if (normalAnnotation) {
      name = this._extractTypeName(normalAnnotation.children?.typeName?.[0]);
      attributes = this._extractAnnotationAttributes(normalAnnotation);
    } else if (markerAnnotation) {
      name = this._extractTypeName(markerAnnotation.children?.typeName?.[0]);
    } else if (singleMemberAnnotation) {
      name = this._extractTypeName(singleMemberAnnotation.children?.typeName?.[0]);
      value = this._extractAnnotationValue(singleMemberAnnotation);
    } else {
      // Direct annotation format (java-parser specific):
      // - Marker annotation: { At, typeName }
      // - Single value annotation: { At, typeName, LBrace, elementValue, RBrace }
      // - Normal annotation: { At, typeName, LBrace, elementValuePairList, RBrace }
      const typeName = annotation.children?.typeName?.[0];
      if (typeName) {
        name = this._extractTypeName(typeName);

        // Check for single element value (e.g., @RequestMapping("/api"))
        const elementValue = annotation.children?.elementValue?.[0];
        if (elementValue) {
          value = this._extractElementValue(elementValue);
        }

        // Check for element value pairs (e.g., @RequestMapping(value="/api", method=GET))
        const elementValuePairList = annotation.children?.elementValuePairList?.[0];
        if (elementValuePairList) {
          const pairs = elementValuePairList.children?.elementValuePair || [];
          for (const pair of pairs) {
            const key = this._getIdentifierText(pair.children?.Identifier?.[0]);
            const pairValue = pair.children?.elementValue?.[0];
            if (key) {
              attributes[key] = this._extractElementValue(pairValue);
            }
          }
        }
      }
    }

    if (name) {
      return createMarkerInfo(MARKER_TYPES.ANNOTATION, name, { value, attributes });
    }

    return null;
  }

  _extractAnnotationAttributes(normalAnnotation) {
    const attributes = {};
    const pairs = normalAnnotation.children?.elementValuePairList?.[0]?.children?.elementValuePair || [];

    for (const pair of pairs) {
      const key = this._getIdentifierText(pair.children?.Identifier?.[0]);
      const valueNode = pair.children?.elementValue?.[0];
      const value = this._extractElementValue(valueNode);

      if (key) {
        attributes[key] = value;
      }
    }

    return attributes;
  }

  _extractAnnotationValue(singleMemberAnnotation) {
    const elementValue = singleMemberAnnotation.children?.elementValue?.[0];
    return this._extractElementValue(elementValue);
  }

  _extractElementValue(elementValue) {
    if (!elementValue) return null;

    // Try to extract string literal
    const expression = elementValue.children?.conditionalExpression?.[0];
    if (expression) {
      const primary = expression.children?.binaryExpression?.[0]
        ?.children?.unaryExpression?.[0]
        ?.children?.primary?.[0];

      const literal = primary?.children?.primaryPrefix?.[0]?.children?.literal?.[0];
      if (literal) {
        const strLiteral = literal.children?.StringLiteral?.[0];
        if (strLiteral) {
          const text = strLiteral.image;
          return text ? text.slice(1, -1) : text;  // Remove quotes
        }

        const intLiteral = literal.children?.integerLiteral?.[0];
        if (intLiteral) {
          return intLiteral.children?.DecimalLiteral?.[0]?.image;
        }

        const boolLiteral = literal.children?.booleanLiteral?.[0];
        if (boolLiteral) {
          return boolLiteral.children?.True ? true : false;
        }
      }
    }

    return null;
  }

  _extractModifiers(typeDecl) {
    const modifiers = [];
    const classModifiers = typeDecl.children?.classModifier || [];
    const interfaceModifiers = typeDecl.children?.interfaceModifier || [];

    for (const mod of [...classModifiers, ...interfaceModifiers]) {
      if (mod.children?.Public) modifiers.push('public');
      if (mod.children?.Protected) modifiers.push('protected');
      if (mod.children?.Private) modifiers.push('private');
      if (mod.children?.Static) modifiers.push('static');
      if (mod.children?.Final) modifiers.push('final');
      if (mod.children?.Abstract) modifiers.push('abstract');
    }

    return modifiers;
  }

  _extractClassDeclModifiers(classDecl) {
    const modifiers = [];
    if (!classDecl || !classDecl.children) return modifiers;

    // Look for modifiers in classDeclaration (parent of normalClassDeclaration)
    const classMods = classDecl.children?.classModifier || [];

    for (const mod of classMods) {
      if (mod.children?.Public) modifiers.push('public');
      if (mod.children?.Protected) modifiers.push('protected');
      if (mod.children?.Private) modifiers.push('private');
      if (mod.children?.Static) modifiers.push('static');
      if (mod.children?.Final) modifiers.push('final');
      if (mod.children?.Abstract) modifiers.push('abstract');
    }

    return modifiers;
  }

  _extractClassDeclAnnotations(classDecl) {
    const markers = [];
    if (!classDecl || !classDecl.children) return markers;

    // Look in classModifier for annotations (at classDeclaration level)
    const classMods = classDecl.children?.classModifier || [];

    for (const mod of classMods) {
      const annotation = mod.children?.annotation?.[0];
      if (annotation) {
        const marker = this._extractSingleAnnotation(annotation);
        if (marker) {
          markers.push(marker);
        }
      }
    }

    return markers;
  }

  _extractMethodModifiers(member) {
    const modifiers = [];
    const methodMods = member.children?.methodModifier || [];
    const constructorMods = member.children?.constructorModifier || [];

    for (const mod of [...methodMods, ...constructorMods]) {
      if (mod.children?.Public) modifiers.push('public');
      if (mod.children?.Protected) modifiers.push('protected');
      if (mod.children?.Private) modifiers.push('private');
      if (mod.children?.Static) modifiers.push('static');
      if (mod.children?.Final) modifiers.push('final');
      if (mod.children?.Abstract) modifiers.push('abstract');
    }

    return modifiers;
  }

  _extractFieldModifiers(member) {
    const modifiers = [];
    const fieldMods = member.children?.fieldModifier || [];

    for (const mod of fieldMods) {
      if (mod.children?.Public) modifiers.push('public');
      if (mod.children?.Protected) modifiers.push('protected');
      if (mod.children?.Private) modifiers.push('private');
      if (mod.children?.Static) modifiers.push('static');
      if (mod.children?.Final) modifiers.push('final');
    }

    return modifiers;
  }

  _getVisibilityFromModifiers(modifiers) {
    if (modifiers.includes('public')) return 'public';
    if (modifiers.includes('private')) return 'private';
    if (modifiers.includes('protected')) return 'protected';
    return 'package';
  }

  _extractSuperclass(normalClass) {
    const superclass = normalClass.children?.superclass?.[0];
    if (superclass) {
      const classType = superclass.children?.classType?.[0];
      return this._extractClassType(classType);
    }
    return null;
  }

  _extractInterfaces(normalClass) {
    const interfaces = [];
    const superinterfaces = normalClass.children?.superinterfaces?.[0];

    if (superinterfaces) {
      const interfaceTypes = superinterfaces.children?.interfaceTypeList?.[0]?.children?.interfaceType || [];

      for (const iface of interfaceTypes) {
        const classType = iface.children?.classType?.[0];
        const name = this._extractClassType(classType);
        if (name) {
          interfaces.push(name);
        }
      }
    }

    return interfaces;
  }

  _extractInterfaceExtends(normalInterface) {
    const interfaces = [];
    const extendsInterfaces = normalInterface.children?.extendsInterfaces?.[0];

    if (extendsInterfaces) {
      const interfaceTypes = extendsInterfaces.children?.interfaceTypeList?.[0]?.children?.interfaceType || [];

      for (const iface of interfaceTypes) {
        const classType = iface.children?.classType?.[0];
        const name = this._extractClassType(classType);
        if (name) {
          interfaces.push(name);
        }
      }
    }

    return interfaces;
  }

  _extractClassType(classType) {
    if (!classType) return null;

    // Simple type name
    const identifier = classType.children?.Identifier?.[0];
    if (identifier) {
      return this._getIdentifierText(identifier);
    }

    // Qualified type name
    const classOrInterfaceType = classType.children?.classOrInterfaceTypeToInstantiate?.[0];
    if (classOrInterfaceType) {
      return this._extractQualifiedName(classOrInterfaceType);
    }

    return null;
  }

  _extractReturnType(methodHeader) {
    const result = methodHeader.children?.result?.[0];
    if (!result) return null;

    // Check for void
    if (result.children?.Void) return 'void';

    // Extract unann type
    const unannType = result.children?.unannType?.[0];
    return this._extractUnannType(unannType);
  }

  _extractUnannType(unannType) {
    if (!unannType) return null;

    // Primitive type
    const primitive = unannType.children?.unannPrimitiveTypeWithOptionalDimsSuffix?.[0];
    if (primitive) {
      const primType = primitive.children?.unannPrimitiveType?.[0];
      if (primType) {
        const numericType = primType.children?.numericType?.[0];
        if (numericType) {
          const integralType = numericType.children?.integralType?.[0];
          const floatingPointType = numericType.children?.floatingPointType?.[0];

          if (integralType) {
            if (integralType.children?.Int) return 'int';
            if (integralType.children?.Long) return 'long';
            if (integralType.children?.Short) return 'short';
            if (integralType.children?.Byte) return 'byte';
            if (integralType.children?.Char) return 'char';
          }
          if (floatingPointType) {
            if (floatingPointType.children?.Float) return 'float';
            if (floatingPointType.children?.Double) return 'double';
          }
        }
        if (primType.children?.Boolean) return 'boolean';
      }
      // Check for array dimensions
      const dims = primitive.children?.dims?.[0];
      if (dims) {
        return this._extractUnannType({ children: { unannPrimitiveTypeWithOptionalDimsSuffix: [{ children: { unannPrimitiveType: [primType] } }] } }) + '[]';
      }
    }

    // Reference type
    const refType = unannType.children?.unannReferenceType?.[0];
    if (refType) {
      const classOrInterface = refType.children?.unannClassOrInterfaceType?.[0];
      if (classOrInterface) {
        return this._extractClassOrInterfaceType(classOrInterface);
      }
    }

    return null;
  }

  _extractClassOrInterfaceType(classOrInterface) {
    if (!classOrInterface) return null;

    const unannClassType = classOrInterface.children?.unannClassType?.[0];
    if (unannClassType) {
      // Get the identifier(s)
      const identifiers = [];

      // Simple class type
      const identifier = unannClassType.children?.Identifier?.[0];
      if (identifier) {
        identifiers.push(this._getIdentifierText(identifier));
      }

      // Handle type arguments (generics)
      const typeArgs = unannClassType.children?.typeArguments?.[0];
      if (typeArgs) {
        const generics = this._extractTypeArguments(typeArgs);
        if (generics && identifiers.length > 0) {
          return identifiers[0] + '<' + generics + '>';
        }
      }

      return identifiers.join('.');
    }

    return null;
  }

  _extractTypeArguments(typeArgs) {
    const args = [];
    const typeArgList = typeArgs.children?.typeArgumentList?.[0]?.children?.typeArgument || [];

    for (const arg of typeArgList) {
      const refType = arg.children?.referenceType?.[0]?.children?.classOrInterfaceType?.[0];
      if (refType) {
        const identifier = refType.children?.classType?.[0]?.children?.Identifier?.[0];
        if (identifier) {
          args.push(this._getIdentifierText(identifier));
        }
      }
    }

    return args.join(', ');
  }

  _extractParameters(methodHeader) {
    const parameters = [];
    const formalParams = methodHeader.children?.formalParameterList?.[0];
    if (!formalParams) return parameters;

    const paramList = formalParams.children?.formalParameter || [];

    for (const param of paramList) {
      // Variable arity parameter (varargs)
      const variableArityParam = param.children?.variableArityParameter?.[0];
      if (variableArityParam) {
        const type = this._extractUnannType(variableArityParam.children?.unannType?.[0]);
        const name = this._getIdentifierText(variableArityParam.children?.Identifier?.[0]);
        const markers = this._extractParameterAnnotations(variableArityParam);

        parameters.push(createParameterInfo(name, {
          type: type + '...',
          markers,
        }));
        continue;
      }

      // Normal parameter
      const type = this._extractUnannType(param.children?.unannType?.[0]);
      const variableDeclaratorId = param.children?.variableDeclaratorId?.[0];
      const name = this._getIdentifierText(variableDeclaratorId?.children?.Identifier?.[0]);
      const markers = this._extractParameterAnnotations(param);

      if (name) {
        parameters.push(createParameterInfo(name, {
          type,
          markers,
        }));
      }
    }

    return parameters;
  }

  _extractConstructorParameters(constructorHeader) {
    const parameters = [];
    const formalParams = constructorHeader.children?.formalParameterList?.[0];
    if (!formalParams) return parameters;

    // Reuse the same logic as method parameters
    return this._extractParameters({ children: { formalParameterList: [formalParams] } });
  }

  _extractParameterAnnotations(param) {
    const markers = [];
    const mods = param.children?.variableModifier || [];

    for (const mod of mods) {
      const annotation = mod.children?.annotation?.[0];
      if (annotation) {
        const marker = this._extractSingleAnnotation(annotation);
        if (marker) {
          markers.push(marker);
        }
      }
    }

    return markers;
  }

  _extractThrows(methodHeader) {
    const throws = [];
    const throwsClause = methodHeader.children?.throws?.[0];
    if (!throwsClause) return throws;

    const exceptionList = throwsClause.children?.exceptionTypeList?.[0]?.children?.exceptionType || [];

    for (const exc of exceptionList) {
      const classType = exc.children?.classType?.[0];
      const name = this._extractClassType(classType);
      if (name) {
        throws.push(name);
      }
    }

    return throws;
  }

  _extractFieldType(fieldDecl) {
    const unannType = fieldDecl.children?.unannType?.[0];
    return this._extractUnannType(unannType);
  }

  _extractFieldNames(fieldDecl) {
    const names = [];
    const varDeclList = fieldDecl.children?.variableDeclaratorList?.[0]?.children?.variableDeclarator || [];

    for (const varDecl of varDeclList) {
      const varDeclId = varDecl.children?.variableDeclaratorId?.[0];
      const name = this._getIdentifierText(varDeclId?.children?.Identifier?.[0]);
      if (name) {
        names.push(name);
      }
    }

    return names;
  }

  _getTypeIdentifier(typeDecl) {
    const identifier = typeDecl?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0];
    return this._getIdentifierText(identifier);
  }

  _getMethodName(methodHeader) {
    const methodDeclarator = methodHeader?.children?.methodDeclarator?.[0];
    const identifier = methodDeclarator?.children?.Identifier?.[0];
    return this._getIdentifierText(identifier);
  }

  _getConstructorName(constructorHeader) {
    const identifier = constructorHeader?.children?.simpleTypeName?.[0]?.children?.Identifier?.[0];
    return this._getIdentifierText(identifier);
  }

  _extractTypeName(typeName) {
    if (!typeName) return null;

    // Direct identifier (e.g., @RestController)
    const identifier = typeName.children?.Identifier?.[0];
    if (identifier) {
      return this._getIdentifierText(identifier);
    }

    // Qualified type name (e.g., @org.springframework.RestController)
    const packageOrTypeName = typeName.children?.packageOrTypeName?.[0];
    if (packageOrTypeName) {
      const qualifiedName = this._extractQualifiedName(packageOrTypeName);
      const suffix = typeName.children?.Identifier?.[0];
      if (suffix) {
        return qualifiedName + '.' + this._getIdentifierText(suffix);
      }
      return qualifiedName;
    }

    // Try to extract from qualified name directly
    const qualifiedName = this._extractQualifiedName(typeName);
    if (qualifiedName) {
      return qualifiedName;
    }

    return null;
  }

  _extractQualifiedName(node) {
    if (!node) return null;

    const identifiers = [];

    // Collect all identifiers
    const ids = node.children?.Identifier || [];
    for (const id of ids) {
      identifiers.push(this._getIdentifierText(id));
    }

    return identifiers.filter(Boolean).join('.');
  }

  _getIdentifierText(identifier) {
    if (!identifier) return null;
    return identifier.image || null;
  }

  _getStartLine(node) {
    if (!node) return 0;
    // Try to find the first token with location info
    if (node.location) {
      return node.location.startLine || 0;
    }
    // Search through children for tokens with location
    for (const key of Object.keys(node.children || {})) {
      const child = node.children[key]?.[0];
      if (child?.image && child?.startLine) {
        return child.startLine;
      }
    }
    return 0;
  }
}

module.exports = JavaParser;
