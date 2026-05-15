'use strict';

const path = require('path');

/**
 * Laravel Extractor - Extract Laravel patterns from PHP AST
 *
 * WHY: Support Laravel 10+ projects
 * HOW: Detect Laravel conventions, attributes, and patterns
 *
 * Detects:
 * - Controllers (App\Http\Controllers)
 * - Models (Eloquent models, relationships)
 * - Services (service classes)
 * - Repositories (repository pattern)
 * - Middleware (App\Http\Middleware)
 * - Requests (Form Requests)
 * - Resources (API Resources)
 * - Jobs (Queue Jobs)
 * - Events & Listeners
 * - Policies (Authorization)
 * - Providers (Service Providers)
 * - Routes (web.php, api.php patterns)
 *
 * @module laravel-extractor
 */

// Controller patterns
const CONTROLLER_PATTERNS = {
  baseClasses: ['Controller', 'ApiController', 'ResourceController'],
  namespaces: ['App\\Http\\Controllers'],
  traits: ['AuthorizesRequests', 'ValidatesRequests'],
};

// Model patterns
const MODEL_PATTERNS = {
  baseClasses: ['Model', 'Authenticatable', 'Pivot'],
  traits: ['HasFactory', 'SoftDeletes', 'Notifiable', 'HasApiTokens'],
  namespaces: ['App\\Models'],
};

// HTTP methods for route extraction
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'any'];

// Eloquent relationship methods
const RELATIONSHIP_METHODS = [
  'hasOne', 'hasMany', 'belongsTo', 'belongsToMany',
  'hasManyThrough', 'hasOneThrough', 'morphTo', 'morphOne',
  'morphMany', 'morphToMany', 'morphedByMany',
];

/**
 * Extract Laravel specific information from UnifiedAST
 *
 * @param {object} rawAst - Raw PHP AST
 * @param {object} config - Source root config
 * @returns {LaravelData}
 */
function extract(rawAst, config = {}) {
  const content = rawAst.content;
  const filePath = rawAst.filePath;

  return {
    name: 'laravel',
    version: detectLaravelVersion(content),

    // Controller detection
    controllers: extractControllers(rawAst),

    // Model detection
    models: extractModels(rawAst),

    // Service detection
    services: extractServices(rawAst),

    // Repository detection
    repositories: extractRepositories(rawAst),

    // Middleware detection
    middleware: extractMiddleware(rawAst),

    // Form Request detection
    requests: extractRequests(rawAst),

    // API Resource detection
    resources: extractResources(rawAst),

    // Job detection
    jobs: extractJobs(rawAst),

    // Event detection
    events: extractEvents(rawAst),

    // Listener detection
    listeners: extractListeners(rawAst),

    // Policy detection
    policies: extractPolicies(rawAst),

    // Routes (from route files)
    routes: extractRoutes(content, filePath),

    // Provider detection
    providers: extractProviders(rawAst),

    // Dependency injections
    injections: extractInjections(rawAst),
  };
}

/**
 * Enrich UnifiedAST with Laravel-specific data
 *
 * @param {UnifiedAST} ast - Parsed AST
 * @returns {LaravelData}
 */
function enrichAST(ast) {
  const enriched = {
    name: 'laravel',
    components: [],
    routes: [],
    injections: [],
    relationships: [],
  };

  for (const cls of ast.classes) {
    const stereotype = detectStereotype(cls, ast.filePath);

    if (stereotype) {
      enriched.components.push({
        name: cls.name,
        type: stereotype,
        markers: cls.markers.map(m => m.name),
      });
    }

    // Extract routes from controller
    if (stereotype === 'Controller') {
      const routes = extractControllerRoutes(cls);
      enriched.routes.push(...routes);
    }

    // Extract model relationships
    if (stereotype === 'Model') {
      const relationships = extractModelRelationships(cls);
      enriched.relationships.push(...relationships);
    }

    // Extract DI
    const injections = extractClassInjections(cls);
    enriched.injections.push(...injections);
  }

  return enriched;
}

/**
 * Detect Laravel version from content
 */
function detectLaravelVersion(content) {
  // Check for Laravel 10+ features (Invokable rules, new features)
  if (content.includes('#[') && content.includes('Rule')) {
    return '10.0+';
  }
  // Laravel 9+ features
  if (content.includes('enum ') || content.includes('readonly ')) {
    return '9.0+';
  }
  // Laravel 8+ features
  if (content.includes('Sanctum') || content.includes('HasFactory')) {
    return '8.0+';
  }
  return '7.0+';
}

/**
 * Detect stereotype from class
 */
function detectStereotype(cls, filePath = '') {
  const className = cls.name;
  const baseClass = cls.extends;
  const interfaces = cls.implements || [];
  const traits = []; // Would need to extract from class body

  // Normalize file path
  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

  // Controller
  if (normalizedPath.includes('/controllers/') ||
      CONTROLLER_PATTERNS.baseClasses.some(b => baseClass === b) ||
      className.endsWith('Controller')) {
    return 'Controller';
  }

  // Model
  if (normalizedPath.includes('/models/') ||
      MODEL_PATTERNS.baseClasses.some(b => baseClass === b) ||
      baseClass === 'Model') {
    return 'Model';
  }

  // Middleware
  if (normalizedPath.includes('/middleware/') ||
      interfaces.includes('Middleware') ||
      className.endsWith('Middleware')) {
    return 'Middleware';
  }

  // Form Request
  if (normalizedPath.includes('/requests/') ||
      baseClass === 'FormRequest' ||
      className.endsWith('Request')) {
    return 'Request';
  }

  // API Resource
  if (normalizedPath.includes('/resources/') ||
      baseClass === 'JsonResource' ||
      baseClass === 'ResourceCollection' ||
      className.endsWith('Resource') ||
      className.endsWith('Collection')) {
    return 'Resource';
  }

  // Job
  if (normalizedPath.includes('/jobs/') ||
      interfaces.includes('ShouldQueue') ||
      className.endsWith('Job')) {
    return 'Job';
  }

  // Event
  if (normalizedPath.includes('/events/') ||
      className.endsWith('Event')) {
    return 'Event';
  }

  // Listener
  if (normalizedPath.includes('/listeners/') ||
      interfaces.includes('ShouldQueue') && className.endsWith('Listener')) {
    return 'Listener';
  }

  // Policy
  if (normalizedPath.includes('/policies/') ||
      className.endsWith('Policy')) {
    return 'Policy';
  }

  // Service Provider
  if (normalizedPath.includes('/providers/') ||
      baseClass === 'ServiceProvider' ||
      className.endsWith('ServiceProvider')) {
    return 'Provider';
  }

  // Service
  if (className.endsWith('Service') || className.endsWith('Handler')) {
    return 'Service';
  }

  // Repository
  if (className.endsWith('Repository') || className.endsWith('Repo')) {
    return 'Repository';
  }

  return null;
}

/**
 * Extract controllers
 */
function extractControllers(rawAst) {
  const controllers = [];
  const controllerPattern = /class\s+(\w+Controller)\s+extends\s+(\w+)/g;

  let match;
  while ((match = controllerPattern.exec(rawAst.content)) !== null) {
    controllers.push({
      name: match[1],
      baseClass: match[2],
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return controllers;
}

/**
 * Extract controller routes (from method signatures)
 */
function extractControllerRoutes(cls) {
  const routes = [];

  for (const method of cls.methods) {
    // Skip magic methods and private methods
    if (method.name.startsWith('__') || method.visibility === 'private') {
      continue;
    }

    // Common resource controller methods
    const resourceMethods = {
      'index': 'GET',
      'create': 'GET',
      'store': 'POST',
      'show': 'GET',
      'edit': 'GET',
      'update': 'PUT',
      'destroy': 'DELETE',
    };

    const httpMethod = resourceMethods[method.name] || 'GET';

    routes.push({
      method: httpMethod,
      handler: method.name,
      controller: cls.name,
      lineNumber: method.lineNumber,
    });
  }

  return routes;
}

/**
 * Extract models
 */
function extractModels(rawAst) {
  const models = [];
  const modelPattern = /class\s+(\w+)\s+extends\s+(?:Model|Authenticatable|Pivot)/g;

  let match;
  while ((match = modelPattern.exec(rawAst.content)) !== null) {
    const name = match[1];

    // Extract table name
    const tableMatch = rawAst.content.match(/protected\s+\$table\s*=\s*['"](\w+)['"]/);
    const tableName = tableMatch ? tableMatch[1] : name.toLowerCase() + 's';

    // Extract fillable
    const fillableMatch = rawAst.content.match(/protected\s+\$fillable\s*=\s*\[([\s\S]*?)\]/);
    const fillable = fillableMatch
      ? fillableMatch[1].match(/'(\w+)'/g)?.map(f => f.replace(/'/g, '')) || []
      : [];

    // Extract relationships
    const relationships = extractRelationships(rawAst.content, name);

    models.push({
      name,
      tableName,
      fillable,
      relationships,
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return models;
}

/**
 * Extract model relationships from class content
 */
function extractRelationships(content, modelName) {
  const relationships = [];

  for (const relType of RELATIONSHIP_METHODS) {
    const relPattern = new RegExp(`function\\s+(\\w+)\\s*\\([^)]*\\)[^{]*\\{[^}]*\\$this->${relType}\\s*\\(\\s*([\\w\\\\:]+)`, 'g');

    let match;
    while ((match = relPattern.exec(content)) !== null) {
      const methodName = match[1];
      const relatedModel = match[2].split('::')[0].split('\\').pop();

      relationships.push({
        type: relType,
        method: methodName,
        relatedModel,
      });
    }
  }

  return relationships;
}

/**
 * Extract model relationships from class
 */
function extractModelRelationships(cls) {
  const relationships = [];

  for (const method of cls.methods) {
    // Check if return type hints at relationship
    const returnType = method.returnType || '';

    if (RELATIONSHIP_METHODS.some(r => returnType.includes(r))) {
      relationships.push({
        model: cls.name,
        method: method.name,
        type: returnType.split('\\').pop(),
      });
    }
  }

  return relationships;
}

/**
 * Extract services
 */
function extractServices(rawAst) {
  const services = [];
  const servicePattern = /class\s+(\w+Service)\s*(?:implements\s+([\w\\,\s]+))?/g;

  let match;
  while ((match = servicePattern.exec(rawAst.content)) !== null) {
    const name = match[1];
    const interfaces = match[2]
      ? match[2].split(',').map(i => i.trim().split('\\').pop())
      : [];

    services.push({
      name,
      interfaces,
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return services;
}

/**
 * Extract repositories
 */
function extractRepositories(rawAst) {
  const repositories = [];
  const repoPattern = /class\s+(\w+Repository)\s*(?:implements\s+([\w\\,\s]+))?/g;

  let match;
  while ((match = repoPattern.exec(rawAst.content)) !== null) {
    repositories.push({
      name: match[1],
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return repositories;
}

/**
 * Extract middleware
 */
function extractMiddleware(rawAst) {
  const middleware = [];
  const middlewarePattern = /class\s+(\w+(?:Middleware)?)\s*(?:implements\s+Middleware)?[\s\S]*?function\s+handle/g;

  let match;
  while ((match = middlewarePattern.exec(rawAst.content)) !== null) {
    middleware.push({
      name: match[1],
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return middleware;
}

/**
 * Extract Form Requests
 */
function extractRequests(rawAst) {
  const requests = [];
  const requestPattern = /class\s+(\w+Request)\s+extends\s+FormRequest/g;

  let match;
  while ((match = requestPattern.exec(rawAst.content)) !== null) {
    // Extract validation rules
    const rulesMatch = rawAst.content.match(/function\s+rules\s*\([^)]*\)[^{]*\{([^}]+)\}/);
    const rules = rulesMatch ? rulesMatch[1] : '';

    requests.push({
      name: match[1],
      hasRules: rules.includes("'"),
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return requests;
}

/**
 * Extract API Resources
 */
function extractResources(rawAst) {
  const resources = [];
  const resourcePattern = /class\s+(\w+(?:Resource|Collection))\s+extends\s+(JsonResource|ResourceCollection)/g;

  let match;
  while ((match = resourcePattern.exec(rawAst.content)) !== null) {
    resources.push({
      name: match[1],
      type: match[2],
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return resources;
}

/**
 * Extract Jobs
 */
function extractJobs(rawAst) {
  const jobs = [];
  const jobPattern = /class\s+(\w+Job?)\s*(?:implements\s+ShouldQueue)?/g;

  let match;
  while ((match = jobPattern.exec(rawAst.content)) !== null) {
    const isQueued = rawAst.content.includes('ShouldQueue');

    jobs.push({
      name: match[1],
      isQueued,
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return jobs;
}

/**
 * Extract Events
 */
function extractEvents(rawAst) {
  const events = [];
  const eventPattern = /class\s+(\w+Event?)\s*(?:implements\s+ShouldBroadcast)?/g;

  let match;
  while ((match = eventPattern.exec(rawAst.content)) !== null) {
    events.push({
      name: match[1],
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return events;
}

/**
 * Extract Listeners
 */
function extractListeners(rawAst) {
  const listeners = [];
  const listenerPattern = /class\s+(\w+Listener?)\s*(?:implements\s+ShouldQueue)?/g;

  let match;
  while ((match = listenerPattern.exec(rawAst.content)) !== null) {
    listeners.push({
      name: match[1],
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return listeners;
}

/**
 * Extract Policies
 */
function extractPolicies(rawAst) {
  const policies = [];
  const policyPattern = /class\s+(\w+Policy)/g;

  let match;
  while ((match = policyPattern.exec(rawAst.content)) !== null) {
    policies.push({
      name: match[1],
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return policies;
}

/**
 * Extract Service Providers
 */
function extractProviders(rawAst) {
  const providers = [];
  const providerPattern = /class\s+(\w+ServiceProvider)\s+extends\s+ServiceProvider/g;

  let match;
  while ((match = providerPattern.exec(rawAst.content)) !== null) {
    providers.push({
      name: match[1],
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return providers;
}

/**
 * Extract routes from route files (web.php, api.php)
 */
function extractRoutes(content, filePath) {
  const routes = [];
  const fileName = path.basename(filePath || '');

  // Only parse route files
  if (!['web.php', 'api.php', 'routes.php'].includes(fileName)) {
    return routes;
  }

  // Pattern for route definitions
  // Route::get('/users', [UserController::class, 'index']);
  // Route::post('/users', 'UserController@store');
  const routePattern = /Route::(get|post|put|patch|delete|any)\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:\[([^\]]+)\]|['"]([^'"]+)['"])/g;

  let match;
  while ((match = routePattern.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const uri = match[2];
    const arrayStyle = match[3]; // [Controller::class, 'method']
    const stringStyle = match[4]; // 'Controller@method'

    let controller = '';
    let action = '';

    if (arrayStyle) {
      const parts = arrayStyle.split(',');
      controller = parts[0]?.trim().replace('::class', '').split('\\').pop() || '';
      action = parts[1]?.trim().replace(/['"]/g, '') || '';
    } else if (stringStyle) {
      const parts = stringStyle.split('@');
      controller = parts[0] || '';
      action = parts[1] || '';
    }

    routes.push({
      method,
      path: uri,
      controller,
      action,
      lineNumber: getLineNumber(content, match.index),
    });
  }

  // Also handle resource routes
  // Route::resource('users', UserController::class);
  const resourcePattern = /Route::resource\s*\(\s*['"]([^'"]+)['"]\s*,\s*([^)]+)\)/g;

  while ((match = resourcePattern.exec(content)) !== null) {
    const resourceName = match[1];
    const controller = match[2].trim().replace('::class', '').split('\\').pop();

    // Generate standard resource routes
    const resourceMethods = [
      { method: 'GET', path: `/${resourceName}`, action: 'index' },
      { method: 'GET', path: `/${resourceName}/create`, action: 'create' },
      { method: 'POST', path: `/${resourceName}`, action: 'store' },
      { method: 'GET', path: `/${resourceName}/{id}`, action: 'show' },
      { method: 'GET', path: `/${resourceName}/{id}/edit`, action: 'edit' },
      { method: 'PUT', path: `/${resourceName}/{id}`, action: 'update' },
      { method: 'DELETE', path: `/${resourceName}/{id}`, action: 'destroy' },
    ];

    for (const rm of resourceMethods) {
      routes.push({
        method: rm.method,
        path: rm.path,
        controller,
        action: rm.action,
        isResource: true,
        lineNumber: getLineNumber(content, match.index),
      });
    }
  }

  return routes;
}

/**
 * Extract dependency injections
 */
function extractInjections(rawAst) {
  const injections = [];

  // Constructor injection pattern
  const constructorPattern = /function\s+__construct\s*\(([^)]+)\)/g;

  let match;
  while ((match = constructorPattern.exec(rawAst.content)) !== null) {
    const params = match[1];

    // Parse constructor parameters
    const paramPattern = /([\w\\]+)\s+\$(\w+)/g;
    let paramMatch;

    while ((paramMatch = paramPattern.exec(params)) !== null) {
      const type = paramMatch[1].split('\\').pop();
      const name = paramMatch[2];

      // Skip primitive types
      if (['string', 'int', 'bool', 'float', 'array', 'mixed', 'object'].includes(type.toLowerCase())) {
        continue;
      }

      injections.push({
        fieldName: name,
        fieldType: type,
        injectionType: 'constructor',
      });
    }
  }

  return injections;
}

/**
 * Extract class injections
 */
function extractClassInjections(cls) {
  const injections = [];

  // Constructor parameters are typically injected in Laravel
  for (const method of cls.methods) {
    if (method.name === '__construct') {
      for (const param of method.parameters || []) {
        if (param.type && !isPrimitive(param.type)) {
          injections.push({
            className: cls.name,
            fieldName: param.name,
            fieldType: param.type,
            injectionType: 'constructor',
          });
        }
      }
    }
  }

  return injections;
}

/**
 * Check if type is primitive
 */
function isPrimitive(type) {
  const primitives = ['string', 'int', 'bool', 'float', 'array', 'mixed', 'object', 'null', 'void', 'callable'];
  return primitives.includes(type.toLowerCase().replace('?', ''));
}

/**
 * Get line number from character index
 */
function getLineNumber(content, charIndex) {
  return content.substring(0, charIndex).split('\n').length;
}

module.exports = {
  extract,
  enrichAST,
  detectStereotype,
  extractControllers,
  extractModels,
  extractServices,
  extractRepositories,
  extractRoutes,
  CONTROLLER_PATTERNS,
  MODEL_PATTERNS,
  RELATIONSHIP_METHODS,
  HTTP_METHODS,
};
