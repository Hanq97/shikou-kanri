#!/usr/bin/env node
/**
 * Prohibited Content Checker for SRS v2.0
 * Detects implementation details in requirements documents
 *
 * Usage: node prohibited-content-checker.js <file> --sections <sections>
 * Example: node prohibited-content-checker.js LDR-INVS-srs.md --sections 1,2,3,4,5
 *
 * Exit codes:
 * 0 = PASS (zero violations)
 * 1 = FAIL (violations detected)
 */

const fs = require('fs');
const path = require('path');

// 7 Categories of Prohibited Content
const PROHIBITED_PATTERNS = {
  ARCHITECTURE: {
    name: 'Architecture Patterns',
    patterns: [
      /event-driven\s+(architecture)?/i,
      /microservices?\s+(architecture)?/i,
      /saga\s+pattern/i,
      /CQRS/i,
      /event\s+sourcing/i,
      /circuit\s+breaker/i,
      /retry\s+pattern/i,
      /cache-aside/i,
      /bulkhead/i,
      /strangler\s+(fig|pattern)/i,
      /anti-corruption\s+layer/i,
      /backend\s+for\s+frontend/i,
      /\bBFF\b/,
      /service\s+mesh/i,
      /\bFBO\b/i  // Feature-Based Organization
    ]
  },

  TECH_STACK: {
    name: 'Technology Stack',
    patterns: [
      /\bRedis\b/i,
      /PostgreSQL/i,
      /\bMongoDB\b/i,
      /\bNestJS\b/i,
      /\bReact\b/i,
      /\bTypeScript\b/i,
      /\bRabbitMQ\b/i,
      /\bKafka\b/i,
      /\bDocker\b/i,
      /Kubernetes/i,
      /\bK8s\b/i,
      /\bNginx\b/i,
      /\bVarnish\b/i,
      /\bIstio\b/i,
      /\bExpress\.?js\b/i,
      /\bNext\.?js\b/i,
      /\bTailwind\b/i,
      /\bPrisma\b/i,
      /\bTypeORM\b/i
    ]
  },

  API_PATHS: {
    name: 'API Endpoint Paths',
    patterns: [
      /GET\s+\/api\//i,
      /POST\s+\/api\//i,
      /PUT\s+\/api\//i,
      /DELETE\s+\/api\//i,
      /PATCH\s+\/api\//i,
      /\/v\d+\//,
      /\/api\/[a-z-]+/i,
      /endpoint[:=]\s*['"\/]/i
    ]
  },

  METHOD_SIGNATURES: {
    name: 'Method Signatures',
    patterns: [
      /async\s+function\s+\w+\s*\(/i,
      /function\s+\w+\s*\([^)]*\)\s*\{/i,
      /class\s+\w+\s*\{/i,
      /constructor\s*\(/i,
      /public\s+\w+\s*\(/i,
      /private\s+\w+\s*\(/i,
      /protected\s+\w+\s*\(/i,
      /\w+\s*:\s*\([^)]*\)\s*=>/,  // Arrow function signatures
      /interface\s+\w+\s*\{/i,
      /type\s+\w+\s*=/i
    ]
  },

  SQL_STATEMENTS: {
    name: 'SQL Statements',
    patterns: [
      /SELECT\s+.*FROM/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+\w+\s+SET/i,
      /DELETE\s+FROM/i,
      /CREATE\s+TABLE/i,
      /ALTER\s+TABLE/i,
      /DROP\s+TABLE/i,
      /CREATE\s+INDEX/i,
      /JOIN\s+\w+\s+ON/i,
      /WHERE\s+\w+\s*=/i,
      /GROUP\s+BY/i,
      /ORDER\s+BY/i
    ]
  },

  SOURCE_CODE: {
    name: 'Source Code Blocks',
    patterns: [
      /```typescript/i,
      /```javascript/i,
      /```sql/i,
      /```java/i,
      /```python/i,
      /```csharp/i,
      /```go/i,
      /```rust/i,
      /```json/i,
      /```yaml/i
    ]
  },

  IMPLEMENTATION_DETAILS: {
    name: 'Implementation Details',
    patterns: [
      /retry\s+\d+\s+(times?|x)/i,
      /timeout[:=]\s*\d+\s*(s|ms|seconds|milliseconds)/i,
      /connection\s+pool/i,
      /pool\s+size[:=]\s*\d+/i,
      /rate\s+limit(ing)?[:=]\s*\d+/i,
      /max\s+connections?[:=]\s*\d+/i,
      /batch\s+size[:=]\s*\d+/i,
      /exponential\s+backoff/i,
      /jitter/i,
      /circuit\s+open/i,
      /health\s+check\s+interval/i,
      /heartbeat[:=]/i
    ]
  }
};

class ProhibitedContentChecker {
  constructor(filePath, sections = [1, 2, 3, 4, 5]) {
    this.filePath = filePath;
    this.sectionsToCheck = new Set(sections);
    this.violations = [];
    this.currentSection = 0;
  }

  /**
   * Detect current section number from heading
   */
  detectSection(line) {
    // Section headings: ## 1. ..., ## 2. ..., ### 1.1 ..., etc.
    const sectionMatch = line.match(/^#{1,4}\s+(\d+)[\.\s]/);
    if (sectionMatch) {
      this.currentSection = parseInt(sectionMatch[1]);
    }
  }

  /**
   * Check if current section should be validated
   */
  shouldCheckCurrentSection() {
    // Section 6 (Constraints): Allow tech stack
    if (this.currentSection === 6) return false;

    // Check if section is in list to validate
    return this.sectionsToCheck.has(this.currentSection);
  }

  /**
   * Check for Service Boundaries section (special case in Section 1.2.2)
   */
  isServiceBoundariesSection(line) {
    return /Service\s+Boundaries/i.test(line);
  }

  /**
   * Check line for prohibited content
   */
  checkLine(line, lineNum) {
    if (!this.shouldCheckCurrentSection()) return;

    // Special case: Service Boundaries section in 1.2.2
    // Allow service names but still check for implementation details
    const isServiceBoundaries = this.isServiceBoundariesSection(line);

    for (const [category, config] of Object.entries(PROHIBITED_PATTERNS)) {
      // Skip TECH_STACK check in Service Boundaries section
      if (isServiceBoundaries && category === 'TECH_STACK') continue;

      for (const pattern of config.patterns) {
        if (pattern.test(line)) {
          // Extract matched text for better error message
          const match = line.match(pattern);
          this.violations.push({
            line: lineNum,
            category: category,
            categoryName: config.name,
            pattern: pattern.source,
            matched: match ? match[0] : '',
            text: line.trim().substring(0, 100)  // First 100 chars
          });
        }
      }
    }
  }

  /**
   * Validate entire document
   */
  validate() {
    console.log('=== Prohibited Content Check Results ===');
    console.log(`File: ${this.filePath}`);
    console.log(`Sections checked: ${Array.from(this.sectionsToCheck).sort().join(', ')}`);
    console.log('');

    // Read file
    let content;
    try {
      content = fs.readFileSync(this.filePath, 'utf-8');
    } catch (err) {
      console.error(`❌ ERROR: Cannot read file: ${err.message}`);
      process.exit(1);
    }

    const lines = content.split('\n');

    // Process each line
    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Detect section transitions
      this.detectSection(line);

      // Check for prohibited content
      this.checkLine(line, lineNum);
    });

    console.log(`Violations: ${this.violations.length}`);
    console.log('');

    // Display violations grouped by category
    if (this.violations.length > 0) {
      console.log('--- Violations by Category ---');

      // Group by category
      const byCategory = {};
      this.violations.forEach(v => {
        if (!byCategory[v.category]) {
          byCategory[v.category] = [];
        }
        byCategory[v.category].push(v);
      });

      // Display each category
      for (const [category, violations] of Object.entries(byCategory)) {
        console.log(`\n${violations[0].categoryName} (${violations.length}):`);
        violations.forEach(v => {
          console.log(`  Line ${v.line}: Found "${v.matched}"`);
          if (v.text.length > 0) {
            console.log(`    Context: ${v.text}${v.text.length >= 100 ? '...' : ''}`);
          }
        });
      }
      console.log('');
    }

    // Determine pass/fail
    const overallPass = this.violations.length === 0;

    if (overallPass) {
      console.log('✅ PASS - Zero prohibited content detected');
      return 0;
    } else {
      console.log('❌ FAIL - Prohibited content violations detected');
      console.log(`   Total violations: ${this.violations.length}`);

      // Show breakdown by category
      const categoryCounts = {};
      this.violations.forEach(v => {
        categoryCounts[v.categoryName] = (categoryCounts[v.categoryName] || 0) + 1;
      });

      console.log('\n   Breakdown:');
      for (const [name, count] of Object.entries(categoryCounts)) {
        console.log(`   - ${name}: ${count}`);
      }

      return 1;
    }
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse arguments
  let filePath = null;
  let sections = [1, 2, 3, 4, 5];  // Default sections

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sections') {
      sections = args[i + 1].split(',').map(s => parseInt(s.trim()));
      i++; // Skip next arg
    } else if (!filePath) {
      filePath = args[i];
    }
  }

  // Validate arguments
  if (!filePath) {
    console.error('Usage: node prohibited-content-checker.js <file> [--sections <sections>]');
    console.error('Example: node prohibited-content-checker.js LDR-INVS-srs.md --sections 1,2,3,4,5');
    process.exit(1);
  }

  // Resolve file path
  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath);
  }

  // Check file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ERROR: File not found: ${filePath}`);
    process.exit(1);
  }

  // Run checker
  const checker = new ProhibitedContentChecker(filePath, sections);
  const exitCode = checker.validate();
  process.exit(exitCode);
}

module.exports = ProhibitedContentChecker;
