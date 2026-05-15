#!/usr/bin/env node
/**
 * Prohibited Content Checker for Basic Design Documents
 * Detects 7 categories of implementation details that should be in Detail Design
 *
 * Usage: node prohibited-content-checker-bd.js <file-path>
 * Output: JSON array of violations { line, category, content, suggestion }
 */

const fs = require('fs');
const path = require('path');

// Category 1: Implementation Code
const CODE_PATTERNS = [
  /class\s+\w+\s*\{/,  // class definitions
  /function\s+\w+\s*\(/,  // function definitions
  /async\s+\w+\s*\(/,  // async functions
  /=>/,  // arrow functions
  /interface\s+\w+\s*\{/,  // TypeScript interfaces
  /type\s+\w+\s*=/,  // TypeScript types
  /const\s+\w+\s*=/,  // variable declarations
  /let\s+\w+\s*=/,
  /var\s+\w+\s*=/,
];

// Category 2: API Implementation Details
const API_PATTERNS = [
  /\/api\/v\d+\//,  // API paths with versioning
  /(GET|POST|PUT|DELETE|PATCH)\s+\/\w+/,  // HTTP methods with paths
  /:\d{4,5}/,  // Port numbers
  /\?[\w=&]+/,  // Query parameters
  /\{[\w]+\}/,  // Path parameters (e.g., {id})
];

// Category 3: Database Implementation Details
const DB_PATTERNS = [
  /CREATE\s+TABLE/i,  // SQL CREATE TABLE
  /SELECT\s+.*\s+FROM/i,  // SQL SELECT
  /INSERT\s+INTO/i,  // SQL INSERT
  /UPDATE\s+.*\s+SET/i,  // SQL UPDATE
  /DELETE\s+FROM/i,  // SQL DELETE
  /PRIMARY\s+KEY/i,  // SQL PRIMARY KEY
  /FOREIGN\s+KEY/i,  // SQL FOREIGN KEY
  /VARCHAR\(\d+\)/i,  // SQL data types
  /DECIMAL\(\d+,\s*\d+\)/i,
  /\.aggregate\(/,  // MongoDB aggregations
  /\.find\(/,  // MongoDB queries
];

// Category 4: Sequence Diagrams (step-by-step flows)
const SEQUENCE_PATTERNS = [
  /^\s*\d+\.\s+\w+.*→/m,  // "1. User → System"
  /Step\s+\d+:/,  // "Step 1:", "Step 2:"
  /^\s*\d+\)\s+/m,  // "1) Action", "2) Action"
];

// Category 5: Configuration Values (exact numbers)
const CONFIG_PATTERNS = [
  /TTL[:=]\s*\d+\s*(seconds?|minutes?|hours?)/i,  // Exact TTL values
  /timeout[:=]\s*\d+/i,  // Exact timeout values
  /retry[:=]\s*\d+/i,  // Exact retry counts
  /pool_size[:=]\s*\d+/i,  // Connection pool sizes
  /port[:=]\s*\d{4,5}/i,  // Port assignments
];

// Category 6: UI Implementation Details
const UI_PATTERNS = [
  /<\w+[^>]*>/,  // HTML/JSX tags
  /className[:=]/,  // CSS class names
  /useState\(/,  // React hooks
  /useEffect\(/,
  /\.css/,  // CSS imports
  /style[:=]\s*\{/,  // Inline styles
];

// Category 7: Infrastructure Details
const INFRA_PATTERNS = [
  /apiVersion:\s*v\d+/,  // Kubernetes manifests
  /kind:\s*Deployment/,
  /FROM\s+[\w:.-]+/,  // Dockerfile
  /RUN\s+/,  // Dockerfile RUN commands
  /docker\s+(build|run|exec)/,  // Docker commands
  /kubectl\s+/,  // Kubernetes commands
];

const CATEGORIES = {
  CODE: { patterns: CODE_PATTERNS, name: 'Implementation Code', severity: 'HIGH' },
  API: { patterns: API_PATTERNS, name: 'API Implementation Details', severity: 'HIGH' },
  DB: { patterns: DB_PATTERNS, name: 'Database Implementation Details', severity: 'HIGH' },
  SEQUENCE: { patterns: SEQUENCE_PATTERNS, name: 'Sequence Diagrams', severity: 'MEDIUM' },
  CONFIG: { patterns: CONFIG_PATTERNS, name: 'Configuration Values', severity: 'MEDIUM' },
  UI: { patterns: UI_PATTERNS, name: 'UI Implementation Details', severity: 'HIGH' },
  INFRA: { patterns: INFRA_PATTERNS, name: 'Infrastructure Details', severity: 'LOW' },
};

function checkProhibitedContent(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];
  let inCodeBlock = false;

  // Detect document type
  const isDetailDesign = filePath.includes('detail-design') ||
                         filePath.includes('-backend-detail') ||
                         filePath.includes('-frontend-detail') ||
                         filePath.includes('-bdd.md') ||
                         filePath.includes('-fdd.md');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Track code blocks in markdown (```...```)
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return; // Skip code block markers
    }

    // Skip lines inside code blocks ONLY for non-Detail Design documents
    // For Detail Design, we MUST validate code blocks (Q4 requirement)
    if (inCodeBlock && !isDetailDesign) {
      return;
    }

    // Check each category
    Object.entries(CATEGORIES).forEach(([key, category]) => {
      category.patterns.forEach((pattern) => {
        if (pattern.test(line)) {
          violations.push({
            line: lineNumber,
            category: category.name,
            severity: category.severity,
            content: line.trim().substring(0, 80) + (line.length > 80 ? '...' : ''),
            suggestion: getSuggestion(key),
          });
        }
      });
    });
  });

  return violations;
}

function getSuggestion(category) {
  const suggestions = {
    CODE: 'Remove code implementation. Describe component purpose only.',
    API: 'Remove API paths/methods. Describe API interaction conceptually.',
    DB: 'Remove SQL/queries. Describe entity relationships only.',
    SEQUENCE: 'Remove step-by-step sequences. Use high-level data flow instead.',
    CONFIG: 'Use ranges (e.g., "5-15 minutes") instead of exact values.',
    UI: 'Remove UI code. Describe UI structure conceptually or use wireframes.',
    INFRA: 'Remove infrastructure code. Describe deployment approach only.',
  };
  return suggestions[category] || 'Move to Detail Design document.';
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node prohibited-content-checker-bd.js <file-path>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const violations = checkProhibitedContent(filePath);

  if (violations.length === 0) {
    console.log('✅ No prohibited content detected.');
    process.exit(0);
  } else {
    console.log(`❌ Found ${violations.length} prohibited content violations:\n`);

    // Group by category
    const grouped = violations.reduce((acc, v) => {
      if (!acc[v.category]) acc[v.category] = [];
      acc[v.category].push(v);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([category, items]) => {
      console.log(`\n📋 ${category} (${items.length} violations):`);
      items.forEach((v, i) => {
        console.log(`   ${i + 1}. Line ${v.line} [${v.severity}]`);
        console.log(`      Content: ${v.content}`);
        console.log(`      Suggestion: ${v.suggestion}`);
      });
    });

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkProhibitedContent };
