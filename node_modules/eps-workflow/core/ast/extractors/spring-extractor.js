'use strict';

const { NODE_TYPES, EDGE_TYPES } = require('../unified-schema');

/**
 * Spring Boot Framework Extractor
 *
 * WHY: StarX4CRM backend uses Spring Boot with specific patterns
 * HOW: Extract framework-specific components and relationships
 *
 * Extracts:
 * - Controllers (@RestController, @Controller) with API endpoints
 * - Services (@Service) with business logic
 * - Repositories (@Repository) with data access
 * - Entities (@Entity) with JPA mappings
 * - Components (@Component) with generic beans
 * - Request mappings (@GetMapping, @PostMapping, etc.)
 * - Dependency injection (@Autowired, @Inject)
 *
 * @module spring-extractor
 */

// Spring annotation patterns
const SPRING_ANNOTATIONS = {
  // Stereotype annotations
  CONTROLLER: ['RestController', 'Controller'],
  SERVICE: ['Service'],
  REPOSITORY: ['Repository'],
  ENTITY: ['Entity', 'Table', 'Document'],
  COMPONENT: ['Component', 'Bean', 'Configuration'],

  // Request mapping annotations
  REQUEST_MAPPING: ['RequestMapping', 'GetMapping', 'PostMapping', 'PutMapping', 'DeleteMapping', 'PatchMapping'],

  // Injection annotations
  INJECTION: ['Autowired', 'Inject', 'Resource', 'Value'],

  // Transaction annotations
  TRANSACTION: ['Transactional'],

  // Validation annotations
  VALIDATION: ['Valid', 'Validated', 'NotNull', 'NotBlank', 'Size', 'Min', 'Max', 'Pattern'],
};

// HTTP method mapping
const HTTP_METHOD_MAP = {
  'GetMapping': 'GET',
  'PostMapping': 'POST',
  'PutMapping': 'PUT',
  'DeleteMapping': 'DELETE',
  'PatchMapping': 'PATCH',
  'RequestMapping': 'ANY',
};

/**
 * Extract Spring Boot framework-specific information
 *
 * @param {object} rawAst - Raw AST from java-parser
 * @param {UnifiedAST} ast - Unified AST with extracted classes
 * @param {object} sourceRootConfig - Source root configuration
 * @returns {object} Framework data
 */
function extract(rawAst, ast, sourceRootConfig = {}) {
  const framework = {
    name: 'spring-boot',
    components: [],
    routes: [],
    services: [],
    repositories: [],
    entities: [],
    injections: [],
  };

  // Process each class in the AST
  for (const cls of ast.classes) {
    const componentType = detectComponentType(cls);

    if (componentType) {
      const component = {
        name: cls.name,
        type: componentType,
        annotations: cls.markers.map(m => m.name),
        lineNumber: cls.lineNumber,
      };

      framework.components.push(component);

      // Extract specific information based on component type
      switch (componentType) {
        case NODE_TYPES.CONTROLLER:
          extractControllerInfo(cls, framework);
          break;
        case NODE_TYPES.SERVICE:
          extractServiceInfo(cls, framework);
          break;
        case NODE_TYPES.REPOSITORY:
          extractRepositoryInfo(cls, framework);
          break;
        case NODE_TYPES.ENTITY:
          extractEntityInfo(cls, framework);
          break;
      }
    }

    // Extract dependency injections from fields
    extractInjections(cls, framework);
  }

  return framework;
}

/**
 * Detect Spring component type from class annotations
 */
function detectComponentType(cls) {
  const annotationNames = cls.markers.map(m => m.name);

  for (const anno of annotationNames) {
    if (SPRING_ANNOTATIONS.CONTROLLER.includes(anno)) {
      return NODE_TYPES.CONTROLLER;
    }
    if (SPRING_ANNOTATIONS.SERVICE.includes(anno)) {
      return NODE_TYPES.SERVICE;
    }
    if (SPRING_ANNOTATIONS.REPOSITORY.includes(anno)) {
      return NODE_TYPES.REPOSITORY;
    }
    if (SPRING_ANNOTATIONS.ENTITY.includes(anno)) {
      return NODE_TYPES.ENTITY;
    }
    if (SPRING_ANNOTATIONS.COMPONENT.includes(anno)) {
      return NODE_TYPES.COMPONENT;
    }
  }

  return null;
}

/**
 * Extract controller-specific information (API routes)
 */
function extractControllerInfo(cls, framework) {
  // Get base path from @RequestMapping on class
  let basePath = '';
  for (const marker of cls.markers) {
    if (marker.name === 'RequestMapping') {
      // Try value attribute first, then direct value
      basePath = marker.attributes?.value || marker.value || '';
      basePath = cleanPath(basePath);
    }
  }

  // Extract routes from methods
  for (const method of cls.methods) {
    for (const marker of method.markers) {
      if (SPRING_ANNOTATIONS.REQUEST_MAPPING.includes(marker.name)) {
        const httpMethod = HTTP_METHOD_MAP[marker.name] || 'GET';
        const methodPath = extractPathFromAnnotation(marker);
        const fullPath = combinePaths(basePath, methodPath);

        framework.routes.push({
          controller: cls.name,
          method: method.name,
          httpMethod,
          path: fullPath || '/',
          returnType: method.returnType,
          parameters: method.parameters.map(p => ({
            name: p.name,
            type: p.type,
            annotations: p.markers ? p.markers.map(m => m.name) : [],
          })),
          lineNumber: method.lineNumber,
        });
      }
    }
  }
}

/**
 * Extract service-specific information
 */
function extractServiceInfo(cls, framework) {
  // Check for @Transactional
  const isTransactional = cls.markers.some(m =>
    SPRING_ANNOTATIONS.TRANSACTION.includes(m.name)
  );

  framework.services.push({
    name: cls.name,
    methods: cls.methods.map(m => ({
      name: m.name,
      returnType: m.returnType,
      isTransactional: isTransactional || m.markers.some(mk =>
        SPRING_ANNOTATIONS.TRANSACTION.includes(mk.name)
      ),
    })),
    lineNumber: cls.lineNumber,
  });
}

/**
 * Extract repository-specific information
 */
function extractRepositoryInfo(cls, framework) {
  // Detect if it extends JPA repository interfaces
  let entityType = null;
  let idType = null;

  // Try to extract from extends clause (e.g., JpaRepository<Customer, Long>)
  if (cls.extends) {
    const match = cls.extends.match(/<(\w+),\s*(\w+)>/);
    if (match) {
      entityType = match[1];
      idType = match[2];
    }
  }

  framework.repositories.push({
    name: cls.name,
    entityType,
    idType,
    extends: cls.extends,
    methods: cls.methods.map(m => m.name),
    lineNumber: cls.lineNumber,
  });
}

/**
 * Extract entity-specific information
 */
function extractEntityInfo(cls, framework) {
  // Get table name from @Table annotation
  let tableName = null;
  for (const marker of cls.markers) {
    if (marker.name === 'Table' && marker.attributes.name) {
      tableName = marker.attributes.name;
    }
  }

  // Extract columns from fields
  const columns = [];
  for (const field of cls.fields) {
    const column = {
      name: field.name,
      type: field.type,
      annotations: field.markers.map(m => m.name),
    };

    // Check for @Id
    if (field.markers.some(m => m.name === 'Id')) {
      column.isPrimaryKey = true;
    }

    // Check for @Column
    const columnMarker = field.markers.find(m => m.name === 'Column');
    if (columnMarker && columnMarker.attributes.name) {
      column.columnName = columnMarker.attributes.name;
    }

    // Check for relationship annotations
    const relationshipAnnotations = ['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany'];
    for (const relAnno of relationshipAnnotations) {
      if (field.markers.some(m => m.name === relAnno)) {
        column.relationship = relAnno;
        break;
      }
    }

    columns.push(column);
  }

  framework.entities.push({
    name: cls.name,
    tableName: tableName || toSnakeCase(cls.name),
    columns,
    lineNumber: cls.lineNumber,
  });
}

/**
 * Extract dependency injections from class fields
 */
function extractInjections(cls, framework) {
  for (const field of cls.fields) {
    for (const marker of field.markers) {
      if (SPRING_ANNOTATIONS.INJECTION.includes(marker.name)) {
        framework.injections.push({
          targetClass: cls.name,
          fieldName: field.name,
          fieldType: field.type,
          annotation: marker.name,
          lineNumber: field.lineNumber,
        });
        break;
      }
    }
  }
}

/**
 * Extract path from mapping annotation
 */
function extractPathFromAnnotation(marker) {
  // Check direct value
  if (marker.value) {
    return cleanPath(marker.value);
  }

  // Check 'value' or 'path' attribute
  if (marker.attributes) {
    if (marker.attributes.value) {
      return cleanPath(marker.attributes.value);
    }
    if (marker.attributes.path) {
      return cleanPath(marker.attributes.path);
    }
  }

  return '';
}

/**
 * Clean path string (remove quotes, array syntax)
 */
function cleanPath(path) {
  if (!path) return '';
  return path
    .replace(/^["']|["']$/g, '')  // Remove quotes
    .replace(/^\{|\}$/g, '')      // Remove array braces
    .trim();
}

/**
 * Combine base path and method path
 */
function combinePaths(basePath, methodPath) {
  const base = basePath.replace(/\/$/, '');
  const method = methodPath.replace(/^\//, '');

  if (!base && !method) return '/';
  if (!base) return '/' + method;
  if (!method) return base;

  return base + '/' + method;
}

/**
 * Convert camelCase to snake_case
 */
function toSnakeCase(str) {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Generate graph edges for Spring relationships
 */
function generateGraphEdges(framework, ast) {
  const edges = [];

  // Controller → Service (USES)
  for (const injection of framework.injections) {
    const sourceComponent = framework.components.find(c => c.name === injection.targetClass);
    if (sourceComponent && sourceComponent.type === NODE_TYPES.CONTROLLER) {
      edges.push({
        type: EDGE_TYPES.USES,
        source: `CLS-${injection.targetClass}`,
        target: `CLS-${injection.fieldType}`,
        attributes: { via: 'injection' },
      });
    }
  }

  // Service → Repository (USES)
  for (const injection of framework.injections) {
    const sourceComponent = framework.components.find(c => c.name === injection.targetClass);
    if (sourceComponent && sourceComponent.type === NODE_TYPES.SERVICE) {
      edges.push({
        type: EDGE_TYPES.USES,
        source: `CLS-${injection.targetClass}`,
        target: `CLS-${injection.fieldType}`,
        attributes: { via: 'injection' },
      });
    }
  }

  // Repository → Entity (PERSISTS)
  for (const repo of framework.repositories) {
    if (repo.entityType) {
      edges.push({
        type: EDGE_TYPES.PERSISTS,
        source: `CLS-${repo.name}`,
        target: `CLS-${repo.entityType}`,
        attributes: {},
      });
    }
  }

  // Controller → Route (SERVES)
  for (const route of framework.routes) {
    edges.push({
      type: EDGE_TYPES.SERVES,
      source: `CLS-${route.controller}`,
      target: `API-${route.httpMethod}-${route.path}`,
      attributes: { method: route.method },
    });
  }

  return edges;
}

module.exports = {
  extract,
  detectComponentType,
  generateGraphEdges,
  SPRING_ANNOTATIONS,
  HTTP_METHOD_MAP,
};
