'use strict';

/**
 * .NET Core Extractor - Extract ASP.NET Core patterns from C# AST
 *
 * WHY: Support .NET Core 8+ Web API projects
 * HOW: Detect attributes, conventions, and patterns specific to ASP.NET Core
 *
 * Detects:
 * - API Controllers ([ApiController], ControllerBase)
 * - MVC Controllers (Controller)
 * - Minimal APIs (MapGet, MapPost, etc.)
 * - Services (DI registration patterns)
 * - Repositories (Entity Framework patterns)
 * - Entities (DbSet<T>, entity configurations)
 * - DTOs (record types, data contracts)
 * - Middleware (IMiddleware)
 * - Background Services (BackgroundService, IHostedService)
 *
 * @module dotnet-extractor
 */

// Controller attributes
const CONTROLLER_ATTRIBUTES = ['ApiController', 'Controller', 'Route', 'Area'];

// HTTP method attributes
const HTTP_METHOD_ATTRIBUTES = {
  GET: ['HttpGet', 'HttpGet("{id}")'],
  POST: ['HttpPost'],
  PUT: ['HttpPut', 'HttpPut("{id}")'],
  DELETE: ['HttpDelete', 'HttpDelete("{id}")'],
  PATCH: ['HttpPatch', 'HttpPatch("{id}")'],
};

// Service attributes
const SERVICE_ATTRIBUTES = ['Service', 'Scoped', 'Singleton', 'Transient'];

// Repository patterns
const REPOSITORY_PATTERNS = {
  interfaces: ['IRepository', 'IGenericRepository', 'IAsyncRepository'],
  baseClasses: ['Repository', 'GenericRepository', 'EfRepository'],
  nameSuffix: ['Repository', 'Repo'],
};

// Entity patterns
const ENTITY_PATTERNS = {
  baseClasses: ['EntityBase', 'BaseEntity', 'Entity', 'AggregateRoot'],
  interfaces: ['IEntity', 'IAggregateRoot', 'IHasId'],
};

/**
 * Extract .NET Core specific information from UnifiedAST
 *
 * @param {object} rawAst - Raw C# AST
 * @param {object} config - Source root config
 * @returns {DotNetData}
 */
function extract(rawAst, config = {}) {
  const content = rawAst.content;
  const filePath = rawAst.filePath;

  return {
    name: 'dotnet-core',
    version: detectDotNetVersion(content),

    // Controller detection
    controllers: extractControllers(rawAst),

    // Service detection
    services: extractServices(rawAst),

    // Repository detection
    repositories: extractRepositories(rawAst),

    // Entity detection
    entities: extractEntities(rawAst),

    // API routes
    routes: extractRoutes(rawAst),

    // Middleware
    middleware: extractMiddleware(rawAst),

    // Background services
    backgroundServices: extractBackgroundServices(rawAst),

    // Minimal API endpoints
    minimalApis: extractMinimalApis(content, filePath),

    // Dependency injections
    injections: extractInjections(rawAst),
  };
}

/**
 * Enrich UnifiedAST with .NET-specific data
 *
 * @param {UnifiedAST} ast - Parsed AST
 * @returns {DotNetData}
 */
function enrichAST(ast) {
  const enriched = {
    name: 'dotnet-core',
    components: [],
    routes: [],
    injections: [],
  };

  for (const cls of ast.classes) {
    const stereotype = detectStereotype(cls);

    if (stereotype) {
      enriched.components.push({
        name: cls.name,
        type: stereotype,
        markers: cls.markers.map(m => m.name),
      });
    }

    // Extract routes from controller methods
    if (stereotype === 'Controller' || stereotype === 'ApiController') {
      const controllerRoutes = extractControllerRoutes(cls);
      enriched.routes.push(...controllerRoutes);
    }

    // Extract DI
    const injections = extractClassInjections(cls);
    enriched.injections.push(...injections);
  }

  return enriched;
}

/**
 * Detect .NET version from content
 */
function detectDotNetVersion(content) {
  // Check for .NET 8+ features
  if (content.includes('required ') || content.includes('file class')) {
    return '8.0+';
  }
  if (content.includes('record struct') || content.includes('global using')) {
    return '6.0+';
  }
  if (content.includes('init;') || content.includes('record ')) {
    return '5.0+';
  }
  return '3.1+';
}

/**
 * Detect stereotype from class
 */
function detectStereotype(cls) {
  const markerNames = cls.markers.map(m => m.name);
  const className = cls.name;
  const baseClass = cls.extends;
  const interfaces = cls.implements || [];

  // API Controller
  if (markerNames.includes('ApiController') ||
      (baseClass === 'ControllerBase' && markerNames.includes('Route'))) {
    return 'ApiController';
  }

  // MVC Controller
  if (markerNames.includes('Controller') || baseClass === 'Controller') {
    return 'Controller';
  }

  // Repository
  if (REPOSITORY_PATTERNS.nameSuffix.some(s => className.endsWith(s)) ||
      REPOSITORY_PATTERNS.baseClasses.some(b => baseClass === b) ||
      interfaces.some(i => REPOSITORY_PATTERNS.interfaces.includes(i))) {
    return 'Repository';
  }

  // Entity
  if (ENTITY_PATTERNS.baseClasses.some(b => baseClass === b) ||
      interfaces.some(i => ENTITY_PATTERNS.interfaces.includes(i)) ||
      markerNames.includes('Table') || markerNames.includes('Entity')) {
    return 'Entity';
  }

  // Service
  if (className.endsWith('Service') || className.endsWith('Handler') ||
      className.endsWith('Manager') || className.endsWith('Provider')) {
    return 'Service';
  }

  // Middleware
  if (interfaces.includes('IMiddleware') || className.endsWith('Middleware')) {
    return 'Middleware';
  }

  // Background Service
  if (baseClass === 'BackgroundService' || interfaces.includes('IHostedService')) {
    return 'BackgroundService';
  }

  return null;
}

/**
 * Extract controllers
 */
function extractControllers(rawAst) {
  const controllers = [];
  const controllerPattern = /\[(?:Api)?Controller\][\s\S]*?class\s+(\w+)\s*(?::\s*([\w\s,]+))?/g;

  let match;
  while ((match = controllerPattern.exec(rawAst.content)) !== null) {
    const name = match[1];
    const inheritance = match[2] || '';

    // Extract route attribute
    const routeMatch = rawAst.content.substring(Math.max(0, match.index - 200), match.index)
      .match(/\[Route\s*\(\s*"([^"]+)"\s*\)\]/);
    const basePath = routeMatch ? routeMatch[1] : '';

    controllers.push({
      name,
      basePath: basePath.replace('[controller]', name.replace(/Controller$/, '').toLowerCase()),
      isApi: rawAst.content.substring(match.index - 50, match.index).includes('ApiController'),
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return controllers;
}

/**
 * Extract routes from controller
 */
function extractControllerRoutes(cls) {
  const routes = [];

  // Get base path from Route attribute
  const routeAttr = cls.markers.find(m => m.name === 'Route');
  let basePath = routeAttr?.value || '';
  basePath = basePath.replace('[controller]', cls.name.replace(/Controller$/, '').toLowerCase());

  for (const method of cls.methods) {
    const httpAttr = method.markers.find(m =>
      Object.values(HTTP_METHOD_ATTRIBUTES).flat().some(h => m.name.startsWith(h.split('(')[0]))
    );

    if (httpAttr) {
      const httpMethod = Object.entries(HTTP_METHOD_ATTRIBUTES)
        .find(([_, attrs]) => attrs.some(a => httpAttr.name.startsWith(a.split('(')[0])))?.[0] || 'GET';

      const methodPath = httpAttr.value || '';

      routes.push({
        method: httpMethod,
        path: normalizePath(basePath, methodPath),
        handler: method.name,
        controller: cls.name,
        lineNumber: method.lineNumber,
      });
    }
  }

  return routes;
}

/**
 * Extract services
 */
function extractServices(rawAst) {
  const services = [];
  const servicePattern = /class\s+(\w+Service|\w+Handler|\w+Manager)\s*(?::\s*([\w\s,<>]+))?/g;

  let match;
  while ((match = servicePattern.exec(rawAst.content)) !== null) {
    const name = match[1];
    const interfaces = match[2] ? match[2].split(',').map(i => i.trim()) : [];

    services.push({
      name,
      interfaces: interfaces.filter(i => i.startsWith('I')),
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
  const repoPattern = /class\s+(\w+Repository|\w+Repo)\s*(?:<(\w+)>)?\s*(?::\s*([\w\s,<>]+))?/g;

  let match;
  while ((match = repoPattern.exec(rawAst.content)) !== null) {
    const name = match[1];
    const genericType = match[2] || null;
    const inheritance = match[3] || '';

    // Try to find entity type
    let entityType = genericType;
    if (!entityType) {
      const dbSetMatch = rawAst.content.match(new RegExp(`DbSet<(\\w+)>.*${name}`));
      if (dbSetMatch) entityType = dbSetMatch[1];
    }

    repositories.push({
      name,
      entityType,
      interfaces: inheritance.split(',').map(i => i.trim()).filter(i => i.startsWith('I')),
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return repositories;
}

/**
 * Extract entities
 */
function extractEntities(rawAst) {
  const entities = [];

  // Pattern for entities with [Table] attribute or inheriting from entity base
  const entityPattern = /(?:\[Table\s*\([^)]*\)\][\s\S]*?)?class\s+(\w+)\s*(?::\s*(EntityBase|BaseEntity|Entity|AggregateRoot))?/g;

  let match;
  while ((match = entityPattern.exec(rawAst.content)) !== null) {
    const name = match[1];
    const baseClass = match[2];

    // Check if it's really an entity (has [Table] or inherits from entity base)
    const beforeClass = rawAst.content.substring(Math.max(0, match.index - 100), match.index);
    const hasTableAttr = beforeClass.includes('[Table');
    const hasKeyAttr = rawAst.content.includes('[Key]');

    if (hasTableAttr || baseClass || hasKeyAttr) {
      // Extract table name from attribute
      const tableMatch = beforeClass.match(/\[Table\s*\(\s*"([^"]+)"\s*\)\]/);
      const tableName = tableMatch ? tableMatch[1] : name;

      entities.push({
        name,
        tableName,
        baseClass,
        lineNumber: getLineNumber(rawAst.content, match.index),
      });
    }
  }

  return entities;
}

/**
 * Extract API routes
 */
function extractRoutes(rawAst) {
  const routes = [];

  // Pattern for HTTP method attributes
  const httpPattern = /\[(Http(Get|Post|Put|Delete|Patch))(?:\s*\(\s*"([^"]*)"?\s*\))?\][\s\S]*?(?:public|async)[\s\S]*?(\w+)\s*\(/g;

  let match;
  while ((match = httpPattern.exec(rawAst.content)) !== null) {
    const httpAttr = match[1];
    const httpMethod = match[2].toUpperCase();
    const path = match[3] || '';
    const methodName = match[4];

    routes.push({
      method: httpMethod,
      path,
      handler: methodName,
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return routes;
}

/**
 * Extract middleware
 */
function extractMiddleware(rawAst) {
  const middleware = [];
  const middlewarePattern = /class\s+(\w+Middleware)\s*(?::\s*IMiddleware)?/g;

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
 * Extract background services
 */
function extractBackgroundServices(rawAst) {
  const services = [];
  const bgServicePattern = /class\s+(\w+)\s*:\s*(?:BackgroundService|IHostedService)/g;

  let match;
  while ((match = bgServicePattern.exec(rawAst.content)) !== null) {
    services.push({
      name: match[1],
      lineNumber: getLineNumber(rawAst.content, match.index),
    });
  }

  return services;
}

/**
 * Extract Minimal API endpoints (Program.cs pattern)
 */
function extractMinimalApis(content, filePath) {
  const endpoints = [];

  // Skip if not likely a minimal API file
  if (!content.includes('MapGet') && !content.includes('MapPost')) {
    return endpoints;
  }

  const minimalApiPattern = /app\.Map(Get|Post|Put|Delete|Patch)\s*\(\s*"([^"]+)"/g;

  let match;
  while ((match = minimalApiPattern.exec(content)) !== null) {
    endpoints.push({
      method: match[1].toUpperCase(),
      path: match[2],
      filePath,
      lineNumber: getLineNumber(content, match.index),
    });
  }

  return endpoints;
}

/**
 * Extract dependency injections
 */
function extractInjections(rawAst) {
  const injections = [];

  // Constructor injection pattern
  const constructorPattern = /public\s+(\w+)\s*\(([^)]+)\)/g;

  let match;
  while ((match = constructorPattern.exec(rawAst.content)) !== null) {
    const className = match[1];
    const params = match[2];

    // Parse constructor parameters
    const paramPattern = /(\w+(?:<[^>]+>)?)\s+_?(\w+)/g;
    let paramMatch;

    while ((paramMatch = paramPattern.exec(params)) !== null) {
      const type = paramMatch[1];
      const name = paramMatch[2];

      // Skip primitive types
      if (['string', 'int', 'bool', 'double', 'float', 'decimal', 'long'].includes(type.toLowerCase())) {
        continue;
      }

      injections.push({
        targetClass: className,
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

  // Check fields with readonly modifier (typically injected)
  for (const field of cls.fields || []) {
    if (field.isReadonly && field.type && !isPrimitive(field.type)) {
      injections.push({
        className: cls.name,
        fieldName: field.name,
        fieldType: field.type,
        injectionType: 'constructor',
      });
    }
  }

  return injections;
}

/**
 * Check if type is primitive
 */
function isPrimitive(type) {
  const primitives = ['string', 'int', 'bool', 'double', 'float', 'decimal', 'long', 'short', 'byte', 'char', 'object', 'dynamic'];
  return primitives.includes(type.toLowerCase().replace('?', ''));
}

/**
 * Normalize API path
 */
function normalizePath(basePath, methodPath) {
  let path = `/${basePath}/${methodPath}`
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');

  if (!path) path = '/';
  return path;
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
  extractServices,
  extractRepositories,
  extractEntities,
  extractRoutes,
  CONTROLLER_ATTRIBUTES,
  HTTP_METHOD_ATTRIBUTES,
  REPOSITORY_PATTERNS,
  ENTITY_PATTERNS,
};
