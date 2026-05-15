'use strict';

/**
 * ast-extractor.js — AST-based code extraction for test generation.
 *
 * Layer: L6 ENGINE
 * Pattern: Reuse existing AST parsers [E-BD-05, E-DD-02]
 *
 * REUSES:
 *   - core/ast/parsers/java-parser.js (Java class extraction)
 *   - core/ast/extractors/spring-extractor.js (Spring annotations)
 *   - core/ast/parsers/typescript-parser.js (TS/TSX extraction)
 *   - core/ast/extractors/nextjs-extractor.js (Next.js patterns)
 */

const fs = require('fs');
const path = require('path');

class ASTExtractor {
  /**
   * @param {string} pkgRoot - Package root (aurea-code root)
   */
  constructor(pkgRoot) {
    this.pkgRoot = pkgRoot;
    this._javaParser = null;
    this._springExtractor = null;
    this._tsParser = null;
    this._nextjsExtractor = null;
    this._ragService = null;
    this._serverASTCache = new Map();
  }

  /**
   * Get or create HippoRAGService for server AST.
   * Uses false sentinel to prevent re-trying on failure.
   * @returns {object|null}
   * @private
   */
  _getRAGService() {
    if (this._ragService === false) return null;
    if (this._ragService) return this._ragService;
    try {
      const HippoRAGService = require(path.join(__dirname, '..', 'rag', 'hipporag-service'));
      let branch = 'main';
      try { branch = require('child_process').execSync('git branch --show-current', { encoding: 'utf8' }).trim(); } catch {}
      this._ragService = HippoRAGService.getInstance('_global', branch);
      return this._ragService;
    } catch {
      this._ragService = false;
      return null;
    }
  }

  /**
   * Try server AST parsing with accumulative cache.
   * @param {string[]} filePaths - Paths to parse
   * @returns {Promise<Map|null>} Map<filePath, UnifiedAST> or null if unavailable
   * @private
   */
  async _tryServerAST(filePaths) {
    const ragService = this._getRAGService();
    if (!ragService) return null;

    // Filter to files not already in cache
    const newPaths = filePaths.filter(p => !this._serverASTCache.has(p));
    if (newPaths.length === 0) {
      return this._serverASTCache.size > 0 ? this._serverASTCache : null;
    }

    // Read file contents for new files
    const files = [];
    for (const fp of newPaths) {
      try {
        const content = fs.readFileSync(fp, 'utf8');
        files.push({ path: fp, content });
      } catch {
        // Skip unreadable files
      }
    }

    if (files.length === 0) {
      return this._serverASTCache.size > 0 ? this._serverASTCache : null;
    }

    // Call server
    const results = await ragService.parseAST(files);
    if (results === null) return null;

    // Merge results into accumulative cache
    for (const ast of results) {
      if (ast.file_path) {
        this._serverASTCache.set(ast.file_path, ast);
      }
    }

    return this._serverASTCache.size > 0 ? this._serverASTCache : null;
  }

  /**
   * Extract API contracts from controller files.
   * Uses spring-extractor for @GetMapping/@PostMapping etc.
   *
   * @param {string[]} controllerPaths - Paths to controller Java files
   * @returns {Promise<object[]>} apiContracts[]
   */
  async extractApiContracts(controllerPaths) {
    const paths = controllerPaths || [];

    // Try server AST first
    const cache = await this._tryServerAST(paths);
    if (cache) {
      const contracts = [];
      for (const filePath of paths) {
        const ast = cache.get(filePath);
        if (ast && ast.framework && ast.framework.routes) {
          for (const route of ast.framework.routes) {
            contracts.push({
              file: filePath,
              method: route.http_method,
              path: route.path,
              handler: route.handler,
              params: route.parameters || [],
              source: 'server-ast',
            });
          }
        }
      }
      if (contracts.length > 0) return contracts;
    }

    // Fallback: local regex extraction
    const contracts = [];
    for (const filePath of paths) {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      const methods = _extractEndpoints(content);
      for (const method of methods) {
        contracts.push({
          file: filePath,
          method: method.httpMethod,
          path: method.path,
          handler: method.name,
          params: method.params,
          returnType: method.returnType,
          annotations: method.annotations,
          source: 'local-regex',
        });
      }
    }
    return contracts;
  }

  /**
   * Extract data model from entity files.
   * Parses @Table, @Column, @Size, @NotNull annotations.
   *
   * @param {string[]} entityPaths - Paths to entity Java files
   * @returns {Promise<object[]>} entityFields[]
   */
  async extractDataModel(entityPaths) {
    const paths = entityPaths || [];

    // Try server AST first
    const cache = await this._tryServerAST(paths);
    if (cache) {
      const entities = [];
      for (const filePath of paths) {
        const ast = cache.get(filePath);
        if (ast && ast.classes && ast.classes.length > 0) {
          for (const cls of ast.classes) {
            const fields = (cls.fields || []).map(f => ({
              type: f.type,
              name: f.name,
              constraints: (f.markers || []).map(m => m.name.replace('@', '')),
              visibility: f.visibility,
              isStatic: f.is_static,
              isFinal: f.is_final,
            }));
            entities.push({
              file: filePath,
              name: cls.name,
              fields,
              source: 'server-ast',
            });
          }
        }
      }
      if (entities.length > 0) return entities;
    }

    // Fallback: local regex extraction
    const entities = [];
    for (const filePath of paths) {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      const fields = _extractEntityFields(content);
      const className = _extractClassName(content);
      entities.push({
        file: filePath,
        name: className,
        fields,
        source: 'local-regex',
      });
    }
    return entities;
  }

  /**
   * Extract business rules from service files.
   * AST structural extraction (90% confidence) + optional LLM inference.
   *
   * @param {string[]} servicePaths
   * @param {object} [options]
   * @param {boolean} [options.claudeEnabled]
   * @param {boolean} [options.geminiEnabled]
   * @returns {Promise<object[]>} businessRules[]
   */
  async extractBusinessRules(servicePaths, options) {
    options = options || {};
    const rules = [];

    for (const filePath of (servicePaths || [])) {
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      const className = _extractClassName(content);

      // AST-based structural extraction (high confidence)
      const methods = _extractMethods(content);
      for (const method of methods) {
        // Detect validation patterns
        const validations = _detectValidations(method.body);
        for (const v of validations) {
          rules.push({
            description: v,
            source: 'EXTRACTED',
            confidence: 90,
            file: filePath,
            className,
            method: method.name,
          });
        }

        // Detect conditional business logic
        const conditions = _detectConditions(method.body);
        for (const c of conditions) {
          rules.push({
            description: c,
            source: 'EXTRACTED',
            confidence: 85,
            file: filePath,
            className,
            method: method.name,
          });
        }
      }

      // LLM inference for complex logic (placeholder — actual integration in SP-3)
      if (options.claudeEnabled) {
        // Would invoke Claude for behavioral inference at 55-75% confidence
        // Placeholder: no-op for now
      }
    }

    return rules;
  }

  /**
   * Build dependency graph from component files.
   * Detect @Autowired, constructor injection → call chain.
   *
   * @param {string[]} componentPaths
   * @returns {Promise<object[]>} dependencies[]
   */
  async buildDependencyGraph(componentPaths) {
    const paths = componentPaths || [];

    // Try server AST first
    const cache = await this._tryServerAST(paths);
    if (cache) {
      const dependencies = [];
      for (const filePath of paths) {
        const ast = cache.get(filePath);
        if (ast && ast.framework && ast.framework.injections) {
          const className = (ast.classes && ast.classes[0]) ? ast.classes[0].name : 'Unknown';
          for (const inj of ast.framework.injections) {
            dependencies.push({
              from: className,
              to: inj.type,
              type: inj.method,
              file: filePath,
              crossModule: false,
              source: 'server-ast',
            });
          }
        }
      }
      if (dependencies.length > 0) return dependencies;
    }

    // Fallback: local regex extraction
    const dependencies = [];
    for (const filePath of paths) {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      const className = _extractClassName(content);
      const injections = _extractInjections(content);
      for (const dep of injections) {
        dependencies.push({
          from: className,
          to: dep.type,
          type: dep.injectionType,
          file: filePath,
          crossModule: false,
          source: 'local-regex',
        });
      }
    }
    return dependencies;
  }
}

// ── Extraction Helpers ────────────────────────────────────────────────────────

function _extractClassName(content) {
  const match = content.match(/(?:public\s+)?class\s+(\w+)/);
  return match ? match[1] : 'Unknown';
}

function _extractEndpoints(content) {
  const endpoints = [];
  const mappingPattern = /@(Get|Post|Put|Delete|Patch|Request)Mapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["'](?:\s*,\s*method\s*=\s*RequestMethod\.(\w+))?\s*\)/g;
  const methodPattern = /(?:public|protected)\s+(\w+(?:<[^>]+>)?)\s+(\w+)\s*\(([^)]*)\)/g;

  // Collect all method declarations with their positions
  const methods = [];
  let m;
  while ((m = methodPattern.exec(content)) !== null) {
    methods.push({
      returnType: m[1],
      name: m[2],
      params: _parseParams(m[3]),
      pos: m.index,
    });
  }

  // Match mappings to nearest following method
  let mp;
  while ((mp = mappingPattern.exec(content)) !== null) {
    const httpMethod = mp[3] || mp[1].toUpperCase();
    const apiPath = mp[2];
    const pos = mp.index;

    // Find nearest method after this annotation
    const method = methods.find(md => md.pos > pos);
    if (method) {
      endpoints.push({
        httpMethod: httpMethod === 'REQUEST' ? 'ANY' : httpMethod.toUpperCase(),
        path: apiPath,
        name: method.name,
        params: method.params,
        returnType: method.returnType,
        annotations: [mp[0]],
      });
    }
  }

  return endpoints;
}

function _parseParams(paramStr) {
  if (!paramStr || !paramStr.trim()) return [];
  return paramStr.split(',').map(p => {
    const parts = p.trim().split(/\s+/);
    return {
      type: parts.length > 1 ? parts[parts.length - 2] : 'unknown',
      name: parts[parts.length - 1],
    };
  });
}

function _extractEntityFields(content) {
  const fields = [];
  const fieldPattern = /(?:@\w+(?:\([^)]*\))?\s*)*(?:private|protected|public)\s+(\w+(?:<[^>]+>)?)\s+(\w+)\s*[;=]/g;

  let m;
  while ((m = fieldPattern.exec(content)) !== null) {
    const preceding = content.substring(Math.max(0, m.index - 300), m.index);
    const constraints = [];

    if (/@NotNull/.test(preceding)) constraints.push('NotNull');
    if (/@NotBlank/.test(preceding)) constraints.push('NotBlank');
    if (/@Size/.test(preceding)) constraints.push('Size');
    if (/@Column/.test(preceding)) constraints.push('Column');
    if (/@Id/.test(preceding)) constraints.push('Id');
    if (/@ManyToOne/.test(preceding)) constraints.push('ManyToOne');
    if (/@OneToMany/.test(preceding)) constraints.push('OneToMany');
    if (/@ManyToMany/.test(preceding)) constraints.push('ManyToMany');

    fields.push({
      type: m[1],
      name: m[2],
      constraints,
    });
  }

  return fields;
}

function _extractMethods(content) {
  const methods = [];
  const methodRegex = /(?:public|protected|private)\s+(?:static\s+)?(\w+(?:<[^>]+>)?)\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[^{]+)?\{/g;

  let m;
  while ((m = methodRegex.exec(content)) !== null) {
    const startBrace = m.index + m[0].length - 1;
    const body = _extractMethodBody(content, startBrace);
    methods.push({
      returnType: m[1],
      name: m[2],
      body,
    });
  }

  return methods;
}

function _extractMethodBody(content, startBrace) {
  let depth = 1;
  let i = startBrace + 1;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  return content.substring(startBrace + 1, i - 1);
}

function _detectValidations(body) {
  const validations = [];
  if (!body) return validations;

  // Detect null checks (handles simple vars and method calls like item.getName())
  const nullChecks = body.match(/if\s*\(\s*[\w.()]+\s*==\s*null/g) || [];
  for (const nc of nullChecks) {
    const varName = nc.match(/if\s*\(\s*([\w.()]+)/);
    if (varName) validations.push('Null check on ' + varName[1]);
  }

  // Detect validation framework calls
  const validatorCalls = body.match(/(?:validate|check|verify|assert)\w*\s*\(/gi) || [];
  for (const vc of validatorCalls) {
    const name = vc.match(/(\w+)\s*\(/);
    if (name) validations.push('Validation: ' + name[1]);
  }

  return validations;
}

function _detectConditions(body) {
  const conditions = [];
  if (!body) return conditions;

  // Detect business condition patterns
  const ifBlocks = body.match(/if\s*\([^)]+\)/g) || [];
  for (const ib of ifBlocks) {
    // Skip simple null checks (already captured)
    if (/==\s*null|!=\s*null/.test(ib)) continue;

    const cond = ib.replace(/if\s*\(\s*/, '').replace(/\s*\)$/, '');
    if (cond.length > 5 && cond.length < 100) {
      conditions.push('Conditional: ' + cond);
    }
  }

  return conditions;
}

function _extractInjections(content) {
  const injections = [];

  // @Autowired field injection
  const fieldInjections = content.match(/@Autowired\s+(?:private|protected|public)?\s*(\w+(?:<[^>]+>)?)\s+(\w+)/g) || [];
  for (const fi of fieldInjections) {
    const m = fi.match(/@Autowired\s+(?:private|protected|public)?\s*(\w+(?:<[^>]+>)?)\s+(\w+)/);
    if (m) injections.push({ type: m[1], field: m[2], injectionType: 'field' });
  }

  // Constructor injection (detect constructor params)
  const ctorMatch = content.match(/(?:public|protected)\s+\w+\s*\(((?:[^)]+,?\s*)+)\)\s*\{/);
  if (ctorMatch) {
    const params = ctorMatch[1].split(',');
    for (const param of params) {
      const parts = param.trim().split(/\s+/);
      if (parts.length >= 2) {
        const type = parts[parts.length - 2];
        // Heuristic: Spring beans are typically PascalCase types ending in Service/Repository/etc.
        if (/^[A-Z]/.test(type) && /(?:Service|Repository|Client|Handler|Adapter|Gateway|Provider)$/.test(type)) {
          injections.push({ type, field: parts[parts.length - 1], injectionType: 'constructor' });
        }
      }
    }
  }

  return injections;
}

module.exports = { ASTExtractor };
