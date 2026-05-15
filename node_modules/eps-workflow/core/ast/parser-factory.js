'use strict';

const path = require('path');
const { LANGUAGES, FRAMEWORKS } = require('./unified-schema');

/**
 * Parser Factory - Creates appropriate parser based on language/framework
 *
 * WHY: Centralize parser selection, support multiple languages
 * HOW: Factory pattern with lazy loading to avoid unused dependencies
 *
 * Usage:
 * - getParser('java', 'spring-boot') → JavaParser with SpringExtractor
 * - getParserForFile('/path/to/File.java', config) → auto-detect and return parser
 * - detectLanguage('/path/to/File.ts') → 'typescript'
 *
 * @module parser-factory
 */

// Lazy-loaded parser instances (singleton per language:framework)
const parserCache = new Map();

// Framework extractor factories (lazy-loaded)
const extractorFactories = {
  [FRAMEWORKS.SPRING_BOOT]: () => require('./extractors/spring-extractor'),
  [FRAMEWORKS.NEXTJS]: () => require('./extractors/nextjs-extractor'),
  [FRAMEWORKS.NESTJS]: () => {
    try {
      return require('./extractors/nestjs-extractor');
    } catch (e) {
      console.warn('[ParserFactory] NestJS extractor not available');
      return null;
    }
  },
  [FRAMEWORKS.REACT]: () => {
    try {
      return require('./extractors/react-extractor');
    } catch (e) {
      console.warn('[ParserFactory] React extractor not available');
      return null;
    }
  },
  // .NET Core / ASP.NET Core
  'dotnet-core': () => require('./extractors/dotnet-extractor'),
  'aspnet-core': () => require('./extractors/dotnet-extractor'),
  // Laravel
  'laravel': () => require('./extractors/laravel-extractor'),
};

// Extension to language mapping
const EXTENSION_MAP = {
  '.java': LANGUAGES.JAVA,
  '.ts': LANGUAGES.TYPESCRIPT,
  '.tsx': LANGUAGES.TYPESCRIPT,
  '.js': LANGUAGES.JAVASCRIPT,
  '.jsx': LANGUAGES.JAVASCRIPT,
  '.mjs': LANGUAGES.JAVASCRIPT,
  '.cjs': LANGUAGES.JAVASCRIPT,
  '.cs': LANGUAGES.CSHARP,
  '.php': 'php',
  '.py': LANGUAGES.PYTHON,
  '.go': LANGUAGES.GO,
  '.kt': LANGUAGES.KOTLIN,
  '.kts': LANGUAGES.KOTLIN,
  '.rs': LANGUAGES.RUST,
};

// Languages currently supported with parsers
const SUPPORTED_LANGUAGES = [
  LANGUAGES.JAVA,
  LANGUAGES.TYPESCRIPT,
  LANGUAGES.JAVASCRIPT,
  LANGUAGES.CSHARP,
  'php',  // PHP 8+
];

/**
 * Get appropriate parser for language
 *
 * @param {string} language - java | typescript | csharp | python | go
 * @param {string} [framework] - spring-boot | nextjs | nestjs | react
 * @returns {BaseParser}
 * @throws {Error} If language is not supported
 */
function getParser(language, framework = null) {
  const cacheKey = `${language}:${framework || 'default'}`;

  if (parserCache.has(cacheKey)) {
    return parserCache.get(cacheKey);
  }

  // Create parser based on language
  let parser;
  switch (language) {
    case LANGUAGES.JAVA:
      const JavaParser = require('./parsers/java-parser');
      parser = new JavaParser();
      break;

    case LANGUAGES.TYPESCRIPT:
    case LANGUAGES.JAVASCRIPT:
      const TypeScriptParser = require('./parsers/typescript-parser');
      parser = new TypeScriptParser();
      break;

    case LANGUAGES.CSHARP:
      const CSharpParser = require('./parsers/csharp-parser');
      parser = new CSharpParser();
      break;

    case 'php':
      const PhpParser = require('./parsers/php-parser');
      parser = new PhpParser();
      break;

    case LANGUAGES.PYTHON:
      throw new Error('Python parser not yet implemented. Planned for future release.');

    case LANGUAGES.GO:
      throw new Error('Go parser not yet implemented. Planned for future release.');

    case LANGUAGES.KOTLIN:
      throw new Error('Kotlin parser not yet implemented. Planned for future release.');

    case LANGUAGES.RUST:
      throw new Error('Rust parser not yet implemented. Planned for future release.');

    default:
      throw new Error(`Unsupported language: ${language}`);
  }

  // Attach framework extractor if specified
  if (framework && extractorFactories[framework]) {
    try {
      const extractor = extractorFactories[framework]();
      if (extractor) {
        parser.setFrameworkExtractor(extractor);
      }
    } catch (err) {
      console.warn(`[ParserFactory] Framework extractor '${framework}' not available: ${err.message}`);
    }
  }

  parserCache.set(cacheKey, parser);
  return parser;
}

/**
 * Auto-detect language from file extension
 *
 * @param {string} filePath
 * @returns {string|null} Language identifier or null if unsupported
 */
function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_MAP[ext] || null;
}

/**
 * Detect framework from file path and project config
 *
 * @param {string} filePath
 * @param {object} sourceRootConfig - From project-config.json
 * @returns {string|null} Framework identifier
 */
function detectFramework(filePath, sourceRootConfig = {}) {
  // Use explicit framework from config
  if (sourceRootConfig.framework) {
    return sourceRootConfig.framework;
  }

  const normalizedPath = filePath.replace(/\\/g, '/');

  // Java/Spring Boot detection
  if (normalizedPath.endsWith('.java')) {
    // Check for Spring Boot patterns in path
    if (normalizedPath.includes('/controller/') ||
        normalizedPath.includes('/web/rest/') ||
        normalizedPath.includes('/rest/') ||
        normalizedPath.includes('/api/') ||
        normalizedPath.includes('/service/') ||
        normalizedPath.includes('/repository/') ||
        normalizedPath.includes('/domain/') ||
        normalizedPath.includes('/application/') ||
        normalizedPath.includes('/infrastructure/') ||
        normalizedPath.includes('/config/') ||
        normalizedPath.includes('/dto/') ||
        normalizedPath.includes('/src/main/java/')) {
      return FRAMEWORKS.SPRING_BOOT;
    }
  }

  // C# / .NET Core detection
  if (normalizedPath.endsWith('.cs')) {
    // Check for ASP.NET Core patterns in path
    if (normalizedPath.includes('/Controllers/') ||
        normalizedPath.includes('/Services/') ||
        normalizedPath.includes('/Repositories/') ||
        normalizedPath.includes('/Models/') ||
        normalizedPath.includes('/Entities/') ||
        normalizedPath.endsWith('Controller.cs') ||
        normalizedPath.endsWith('Service.cs')) {
      return 'dotnet-core';
    }
  }

  // PHP / Laravel detection
  if (normalizedPath.endsWith('.php')) {
    // Check for Laravel patterns
    if (normalizedPath.includes('/app/Http/Controllers/') ||
        normalizedPath.includes('/app/Models/') ||
        normalizedPath.includes('/app/Services/') ||
        normalizedPath.includes('/app/Repositories/') ||
        normalizedPath.includes('/routes/') ||
        normalizedPath.includes('/app/Http/Middleware/') ||
        normalizedPath.includes('/app/Jobs/') ||
        normalizedPath.includes('/app/Events/') ||
        normalizedPath.includes('/app/Providers/')) {
      return 'laravel';
    }
  }

  // TypeScript/JavaScript detection
  if (/\.[jt]sx?$/.test(normalizedPath)) {
    // Next.js App Router detection
    if (normalizedPath.includes('/app/') &&
        (normalizedPath.endsWith('page.tsx') ||
         normalizedPath.endsWith('page.ts') ||
         normalizedPath.endsWith('layout.tsx') ||
         normalizedPath.endsWith('route.ts') ||
         normalizedPath.endsWith('loading.tsx') ||
         normalizedPath.endsWith('error.tsx'))) {
      return FRAMEWORKS.NEXTJS;
    }

    // Next.js Pages Router detection
    if (normalizedPath.includes('/pages/') &&
        (normalizedPath.endsWith('.tsx') || normalizedPath.endsWith('.ts'))) {
      return FRAMEWORKS.NEXTJS;
    }

    // NestJS detection
    if (normalizedPath.includes('.controller.ts') ||
        normalizedPath.includes('.service.ts') ||
        normalizedPath.includes('.module.ts') ||
        normalizedPath.includes('.guard.ts')) {
      return FRAMEWORKS.NESTJS;
    }

    // React component detection (fallback for .tsx files)
    if (normalizedPath.endsWith('.tsx') ||
        (normalizedPath.endsWith('.jsx') && !normalizedPath.includes('/pages/'))) {
      return FRAMEWORKS.REACT;
    }
  }

  return null;
}

/**
 * Get parser for a file (auto-detect language and framework)
 *
 * @param {string} filePath
 * @param {object} sourceRootConfig - From project-config.json
 * @returns {BaseParser|null}
 */
function getParserForFile(filePath, sourceRootConfig = {}) {
  const language = sourceRootConfig.language || detectLanguage(filePath);

  if (!language) {
    return null;
  }

  if (!SUPPORTED_LANGUAGES.includes(language)) {
    console.warn(`[ParserFactory] Language '${language}' not yet supported for ${filePath}`);
    return null;
  }

  const framework = detectFramework(filePath, sourceRootConfig);

  try {
    return getParser(language, framework);
  } catch (err) {
    console.warn(`[ParserFactory] No parser for ${filePath}: ${err.message}`);
    return null;
  }
}

/**
 * Check if a file is parseable (language supported and not test/generated)
 *
 * @param {string} filePath
 * @returns {boolean}
 */
function isSupported(filePath) {
  const language = detectLanguage(filePath);

  if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
    return false;
  }

  // Skip test files
  const skipPatterns = [
    /\.test\.[jt]sx?$/,
    /\.spec\.[jt]sx?$/,
    /__tests__\//,
    /\.d\.ts$/,
    /\.generated\./,
    /node_modules\//,
    /\.min\.[jt]s$/,
    /Test\.java$/,
    /IT\.java$/,  // Integration tests
    /target\//,
    /build\//,
    /dist\//,
    // C# patterns
    /\.Tests\.cs$/,
    /Test\.cs$/,
    /Tests\//,
    /bin\//,
    /obj\//,
    // PHP patterns
    /Test\.php$/,
    /\.test\.php$/,
    /tests\//i,
    /vendor\//,
  ];

  return !skipPatterns.some(pattern => pattern.test(filePath));
}

/**
 * Get list of supported file extensions
 *
 * @returns {string[]}
 */
function getSupportedExtensions() {
  return Object.keys(EXTENSION_MAP).filter(ext => {
    const lang = EXTENSION_MAP[ext];
    return SUPPORTED_LANGUAGES.includes(lang);
  });
}

/**
 * Get list of supported languages
 *
 * @returns {string[]}
 */
function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}

/**
 * Get list of supported frameworks
 *
 * @returns {string[]}
 */
function getSupportedFrameworks() {
  return Object.keys(extractorFactories);
}

/**
 * Clear parser cache (for testing)
 */
function clearCache() {
  parserCache.clear();
}

/**
 * Get cache statistics
 *
 * @returns {{ size: number, keys: string[] }}
 */
function getCacheStats() {
  return {
    size: parserCache.size,
    keys: [...parserCache.keys()],
  };
}

module.exports = {
  getParser,
  detectLanguage,
  detectFramework,
  getParserForFile,
  isSupported,
  getSupportedExtensions,
  getSupportedLanguages,
  getSupportedFrameworks,
  clearCache,
  getCacheStats,
};
