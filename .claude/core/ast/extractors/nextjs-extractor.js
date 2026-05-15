'use strict';

const path = require('path');
const { NODE_TYPES, EDGE_TYPES } = require('../unified-schema');

/**
 * Next.js Framework Extractor
 *
 * WHY: StarX4CRM frontend uses Next.js 16 with App Router
 * HOW: Extract framework-specific components and routes
 *
 * Extracts:
 * - Pages (page.tsx files in /app directory)
 * - Layouts (layout.tsx files)
 * - API Routes (route.ts files)
 * - Server/Client components ('use client', 'use server' directives)
 * - React hooks (useState, useEffect, custom hooks)
 * - Server actions
 *
 * @module nextjs-extractor
 */

// File patterns for Next.js App Router
const FILE_PATTERNS = {
  PAGE: /\/page\.(tsx?|jsx?)$/,
  LAYOUT: /\/layout\.(tsx?|jsx?)$/,
  LOADING: /\/loading\.(tsx?|jsx?)$/,
  ERROR: /\/error\.(tsx?|jsx?)$/,
  NOT_FOUND: /\/not-found\.(tsx?|jsx?)$/,
  ROUTE: /\/route\.(ts|js)$/,
  TEMPLATE: /\/template\.(tsx?|jsx?)$/,
};

// React hook patterns
const REACT_HOOKS = [
  'useState',
  'useEffect',
  'useContext',
  'useReducer',
  'useCallback',
  'useMemo',
  'useRef',
  'useLayoutEffect',
  'useImperativeHandle',
  'useDebugValue',
  'useDeferredValue',
  'useTransition',
  'useId',
  'useSyncExternalStore',
  'useInsertionEffect',
];

// HTTP methods for API routes
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/**
 * Extract Next.js framework-specific information
 *
 * @param {object} rawAst - Raw AST from TypeScript parser
 * @param {UnifiedAST} ast - Unified AST with extracted classes/functions
 * @param {object} sourceRootConfig - Source root configuration
 * @returns {object} Framework data
 */
function extract(rawAst, ast, sourceRootConfig = {}) {
  const framework = {
    name: 'nextjs',
    components: [],
    routes: [],
    pages: [],
    layouts: [],
    hooks: [],
    serverActions: [],
  };

  const filePath = ast.filePath;
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Detect component type from file path
  const fileType = detectFileType(normalizedPath);

  // Check for 'use client' or 'use server' directives
  const isClientComponent = ast.markers.some(m => m.name === 'use client');
  const isServerComponent = !isClientComponent; // Default is server in App Router
  const hasServerDirective = ast.markers.some(m => m.name === 'use server');

  // Extract based on file type
  if (fileType) {
    switch (fileType) {
      case 'page':
        extractPageInfo(ast, normalizedPath, isClientComponent, framework);
        break;
      case 'layout':
        extractLayoutInfo(ast, normalizedPath, isClientComponent, framework);
        break;
      case 'route':
        extractApiRouteInfo(ast, normalizedPath, framework);
        break;
      default:
        // Regular component file
        extractComponentInfo(ast, normalizedPath, isClientComponent, framework);
    }
  } else {
    // Regular component file
    extractComponentInfo(ast, normalizedPath, isClientComponent, framework);
  }

  // Extract hooks usage from all functions
  extractHooksUsage(ast, framework);

  // Extract server actions
  if (hasServerDirective) {
    extractServerActions(ast, framework);
  }

  return framework;
}

/**
 * Detect Next.js file type from path
 */
function detectFileType(filePath) {
  if (FILE_PATTERNS.PAGE.test(filePath)) return 'page';
  if (FILE_PATTERNS.LAYOUT.test(filePath)) return 'layout';
  if (FILE_PATTERNS.ROUTE.test(filePath)) return 'route';
  if (FILE_PATTERNS.LOADING.test(filePath)) return 'loading';
  if (FILE_PATTERNS.ERROR.test(filePath)) return 'error';
  if (FILE_PATTERNS.NOT_FOUND.test(filePath)) return 'not-found';
  if (FILE_PATTERNS.TEMPLATE.test(filePath)) return 'template';
  return null;
}

/**
 * Extract route path from file path
 * e.g., /app/users/[id]/page.tsx -> /users/[id]
 */
function extractRoutePath(filePath) {
  // Remove app directory prefix
  let routePath = filePath
    .replace(/.*\/app\//, '/')
    .replace(/\/(page|layout|route|loading|error|not-found|template)\.[^/]+$/, '');

  // Handle root route
  if (routePath === '' || routePath === '/') {
    return '/';
  }

  return routePath;
}

/**
 * Extract page information
 */
function extractPageInfo(ast, filePath, isClientComponent, framework) {
  const routePath = extractRoutePath(filePath);
  const defaultExport = findDefaultExport(ast);

  const pageInfo = {
    filePath,
    routePath,
    componentName: defaultExport?.name || 'Page',
    isClientComponent,
    type: NODE_TYPES.PAGE,
    props: extractComponentProps(ast, defaultExport?.name),
    metadata: extractMetadata(ast),
  };

  framework.pages.push(pageInfo);

  framework.components.push({
    name: pageInfo.componentName,
    type: NODE_TYPES.PAGE,
    filePath,
    isClientComponent,
  });

  // Add as route
  framework.routes.push({
    path: routePath,
    method: 'GET',
    type: 'page',
    component: pageInfo.componentName,
    filePath,
  });
}

/**
 * Extract layout information
 */
function extractLayoutInfo(ast, filePath, isClientComponent, framework) {
  const routePath = extractRoutePath(filePath);
  const defaultExport = findDefaultExport(ast);

  const layoutInfo = {
    filePath,
    routePath,
    componentName: defaultExport?.name || 'Layout',
    isClientComponent,
    type: NODE_TYPES.LAYOUT,
    metadata: extractMetadata(ast),
  };

  framework.layouts.push(layoutInfo);

  framework.components.push({
    name: layoutInfo.componentName,
    type: NODE_TYPES.LAYOUT,
    filePath,
    isClientComponent,
  });
}

/**
 * Extract API route information
 */
function extractApiRouteInfo(ast, filePath, framework) {
  const routePath = extractRoutePath(filePath);

  // Find exported HTTP method handlers
  for (const fn of ast.functions) {
    const methodName = fn.name.toUpperCase();
    if (HTTP_METHODS.includes(methodName) && fn.isExported) {
      framework.routes.push({
        path: routePath,
        method: methodName,
        type: 'api',
        handler: fn.name,
        filePath,
        isAsync: fn.isAsync,
        parameters: fn.parameters,
      });
    }
  }

  framework.components.push({
    name: path.basename(filePath, path.extname(filePath)),
    type: NODE_TYPES.API_ROUTE,
    filePath,
    methods: ast.functions
      .filter(fn => HTTP_METHODS.includes(fn.name.toUpperCase()) && fn.isExported)
      .map(fn => fn.name.toUpperCase()),
  });
}

/**
 * Extract regular component information
 */
function extractComponentInfo(ast, filePath, isClientComponent, framework) {
  // Find React components (functions that return JSX)
  for (const fn of ast.functions) {
    if (isReactComponent(fn)) {
      const componentType = isClientComponent ?
        NODE_TYPES.CLIENT_COMPONENT :
        NODE_TYPES.SERVER_COMPONENT;

      framework.components.push({
        name: fn.name,
        type: componentType,
        filePath,
        isClientComponent,
        isExported: fn.isExported,
        props: fn.parameters.length > 0 ? fn.parameters[0] : null,
      });
    }
  }

  // Also check classes (class components)
  for (const cls of ast.classes) {
    if (isReactClassComponent(cls)) {
      framework.components.push({
        name: cls.name,
        type: isClientComponent ? NODE_TYPES.CLIENT_COMPONENT : NODE_TYPES.SERVER_COMPONENT,
        filePath,
        isClientComponent,
        isClassComponent: true,
      });
    }
  }
}

/**
 * Extract hooks usage from functions
 */
function extractHooksUsage(ast, framework) {
  // Check for custom hooks (functions starting with 'use')
  for (const fn of ast.functions) {
    if (fn.name.startsWith('use') && fn.name.length > 3) {
      // Check if it's a custom hook (not a React built-in)
      if (!REACT_HOOKS.includes(fn.name)) {
        framework.hooks.push({
          name: fn.name,
          isCustom: true,
          isExported: fn.isExported,
          parameters: fn.parameters,
          returnType: fn.returnType,
        });
      }
    }
  }

  // Note: Detecting React hook *calls* within functions would require
  // deeper AST analysis (function body traversal), which is beyond
  // the current scope. This extracts hook *definitions*.
}

/**
 * Extract server actions (functions with 'use server')
 */
function extractServerActions(ast, framework) {
  for (const fn of ast.functions) {
    if (fn.isExported && fn.isAsync) {
      framework.serverActions.push({
        name: fn.name,
        parameters: fn.parameters,
        returnType: fn.returnType,
      });
    }
  }
}

/**
 * Find default export in AST
 */
function findDefaultExport(ast) {
  // Check functions
  for (const fn of ast.functions) {
    if (fn.isDefault || ast.exports.includes('default')) {
      return fn;
    }
  }

  // Check if there's a default export that matches a function name
  if (ast.exports.includes('default')) {
    // Return the first exported function as likely default
    return ast.functions.find(fn => fn.isExported) || null;
  }

  return null;
}

/**
 * Extract component props from function parameters or interface
 */
function extractComponentProps(ast, componentName) {
  // Look for Props interface
  const propsInterface = ast.classes.find(cls =>
    cls.kind === 'interface' &&
    (cls.name === 'Props' || cls.name === `${componentName}Props`)
  );

  if (propsInterface) {
    return propsInterface.fields.map(f => ({
      name: f.name,
      type: f.type,
      optional: f.isOptional,
    }));
  }

  return [];
}

/**
 * Extract page/layout metadata
 */
function extractMetadata(ast) {
  // Look for exported metadata object or generateMetadata function
  const hasMetadata = ast.exports.includes('metadata');
  const hasGenerateMetadata = ast.functions.some(fn =>
    fn.name === 'generateMetadata' && fn.isExported
  );

  return {
    hasStaticMetadata: hasMetadata,
    hasDynamicMetadata: hasGenerateMetadata,
  };
}

/**
 * Check if function is a React component (simple heuristic)
 */
function isReactComponent(fn) {
  // Name starts with uppercase (React convention)
  if (!fn.name || !/^[A-Z]/.test(fn.name)) {
    return false;
  }

  // Has JSX return type or typical React component patterns
  if (fn.returnType) {
    const rt = fn.returnType.toLowerCase();
    if (rt.includes('jsx') || rt.includes('react') || rt.includes('element')) {
      return true;
    }
  }

  // If exported and starts with uppercase, likely a component
  if (fn.isExported) {
    return true;
  }

  return false;
}

/**
 * Check if class is a React class component
 */
function isReactClassComponent(cls) {
  if (!cls.extends) return false;

  const extendsName = cls.extends.toLowerCase();
  return extendsName.includes('component') ||
         extendsName.includes('purecomponent') ||
         extendsName.includes('react.component');
}

/**
 * Generate graph edges for Next.js relationships
 */
function generateGraphEdges(framework) {
  const edges = [];

  // Layout → Pages it wraps
  for (const layout of framework.layouts) {
    const layoutPath = layout.routePath;

    for (const page of framework.pages) {
      // Page is wrapped by layout if page's route starts with layout's route
      if (page.routePath.startsWith(layoutPath)) {
        edges.push({
          type: EDGE_TYPES.USES,
          source: `COMP-${layout.componentName}`,
          target: `COMP-${page.componentName}`,
          attributes: { relationship: 'wraps' },
        });
      }
    }
  }

  // Component → Hook (USES)
  // This would require deeper analysis of function bodies

  return edges;
}

module.exports = {
  extract,
  detectFileType,
  extractRoutePath,
  generateGraphEdges,
  FILE_PATTERNS,
  HTTP_METHODS,
  REACT_HOOKS,
};
