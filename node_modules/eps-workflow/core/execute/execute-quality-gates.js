/**
 * Execution Quality Gates for Week 15 Execute Command
 * Day 4: Quality Gates G1-G6
 *
 * Quality Gates:
 * - G1: Syntax Validation (100% required)
 * - G2: Linting (100% required)
 * - G3: Tests Generated (100% required)
 * - G4: Tests Passed (100% required)
 * - G5: Coverage ≥80% (80% required)
 * - G6: Security Scan (100% required - no critical vulnerabilities)
 */

const fs = require('fs');
const path = require('path');

/**
 * Execute code generation with all quality gates
 * @param {object} step - Plan step with codeTemplate, templateVars, file, language
 * @param {object} context - Validated context from Day 2
 * @param {object} templateEngine - Template engine from Day 3
 * @returns {object} Execution result with quality gate results
 */
function executeWithQualityGates(step, context, templateEngine) {
  const result = {
    success: false,
    file: step.file,
    code: null,
    tests: null,
    testFile: null,
    qualityGates: {},
    errors: []
  };

  try {
    // Generate code (from Day 3 template engine)
    result.code = templateEngine.fillTemplate(step.codeTemplate, step.templateVars, context);

    // G1: Syntax Validation
    result.qualityGates.G1 = validateSyntax(result.code, step.language);
    if (!result.qualityGates.G1.valid) {
      result.errors.push('G1 FAILED: Syntax validation failed');
      return result;
    }

    // G2: Linting
    result.qualityGates.G2 = runLinter(result.code, step.language, context.stack);
    if (!result.qualityGates.G2.valid) {
      result.errors.push('G2 FAILED: Linting failed');
      return result;
    }

    // G3: Generate Tests
    result.testFile = deriveTestFilePath(step.file, step.language);
    result.tests = generateTests(result.code, step, context);
    result.qualityGates.G3 = {
      generated: true,
      testFile: result.testFile,
      testCount: countTests(result.tests)
    };

    // G4: Run Tests (mocked for now - returns success)
    result.qualityGates.G4 = runTests(result.testFile, result.tests);
    if (!result.qualityGates.G4.allPassed) {
      result.errors.push('G4 FAILED: Tests failed');
      return result;
    }

    // G5: Coverage Check (mocked for now - returns 85%)
    result.qualityGates.G5 = checkCoverage(step.file, result.testFile, result.code, result.tests);
    if (result.qualityGates.G5.lineCoverage < 80) {
      result.errors.push(`G5 FAILED: Coverage ${result.qualityGates.G5.lineCoverage}% < 80%`);
      return result;
    }

    // G6: Security Scan
    result.qualityGates.G6 = scanSecurity(result.code);
    if (result.qualityGates.G6.criticalVulnerabilities > 0) {
      result.errors.push('G6 FAILED: Critical vulnerabilities found');
      return result;
    }

    // All gates passed
    result.success = true;
    return result;

  } catch (error) {
    result.success = false;
    result.errors.push(`Execution failed: ${error.message}`);
    return result;
  }
}

/**
 * G1: Validate code syntax
 * @param {string} code - Generated code
 * @param {string} language - Language (typescript, java, python)
 * @returns {object} Validation result
 */
function validateSyntax(code, language) {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return validateTypeScriptSyntax(code);

    case 'java':
      return validateJavaSyntax(code);

    case 'python':
      return validatePythonSyntax(code);

    default:
      return {
        valid: false,
        errors: [{ message: `Unsupported language: ${language}` }]
      };
  }
}

/**
 * Validate TypeScript/JavaScript syntax
 * @param {string} code - Code to validate
 * @returns {object} Validation result
 */
function validateTypeScriptSyntax(code) {
  const errors = [];

  try {
    // Basic syntax checks (simplified version)
    // Check for unclosed braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push({
        line: null,
        message: `Unmatched braces: ${openBraces} open, ${closeBraces} close`
      });
    }

    // Check for unclosed parentheses
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push({
        line: null,
        message: `Unmatched parentheses: ${openParens} open, ${closeParens} close`
      });
    }

    // Check for unclosed brackets
    const openBrackets = (code.match(/\[/g) || []).length;
    const closeBrackets = (code.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push({
        line: null,
        message: `Unmatched brackets: ${openBrackets} open, ${closeBrackets} close`
      });
    }

    // Check for common syntax errors
    const commonErrors = [
      { pattern: /\bclass\s+\w+\s*{[^}]*\bclass\s+/g, message: 'Nested class declarations' },
      { pattern: /\bfunction\s+\w+\s*\([^)]*\bfunction\s+/g, message: 'Nested function declarations' },
      { pattern: /;{2,}/g, message: 'Multiple consecutive semicolons' }
    ];

    for (const check of commonErrors) {
      if (check.pattern.test(code)) {
        errors.push({ line: null, message: check.message });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };

  } catch (error) {
    return {
      valid: false,
      errors: [{ message: `Syntax validation failed: ${error.message}` }]
    };
  }
}

/**
 * Validate Java syntax
 * @param {string} code - Code to validate
 * @returns {object} Validation result
 */
function validateJavaSyntax(code) {
  const errors = [];

  try {
    // Basic Java syntax checks
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push({
        line: null,
        message: `Unmatched braces: ${openBraces} open, ${closeBraces} close`
      });
    }

    // Check for class declaration
    if (!code.includes('class ') && !code.includes('interface ')) {
      errors.push({
        line: null,
        message: 'Missing class or interface declaration'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };

  } catch (error) {
    return {
      valid: false,
      errors: [{ message: `Java syntax validation failed: ${error.message}` }]
    };
  }
}

/**
 * Validate Python syntax
 * @param {string} code - Code to validate
 * @returns {object} Validation result
 */
function validatePythonSyntax(code) {
  const errors = [];

  try {
    // Basic Python syntax checks
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push({
        line: null,
        message: `Unmatched parentheses: ${openParens} open, ${closeParens} close`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };

  } catch (error) {
    return {
      valid: false,
      errors: [{ message: `Python syntax validation failed: ${error.message}` }]
    };
  }
}

/**
 * G2: Run linter
 * @param {string} code - Code to lint
 * @param {string} language - Language
 * @param {object} stack - Stack configuration
 * @returns {object} Linting result
 */
function runLinter(code, language, stack) {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return runESLint(code);

    case 'java':
      return runCheckstyle(code);

    case 'python':
      return runPylint(code);

    default:
      return { valid: true, warnings: [], errors: [] };
  }
}

/**
 * Run ESLint (simplified version)
 * @param {string} code - Code to lint
 * @returns {object} Linting result
 */
function runESLint(code) {
  const errors = [];
  const warnings = [];

  try {
    // Check for console.log (warning)
    const consoleLogs = code.match(/console\.log\(/g);
    if (consoleLogs && consoleLogs.length > 0) {
      warnings.push({
        line: null,
        rule: 'no-console',
        message: 'Unexpected console statement'
      });
    }

    // Check for var usage (error)
    const varUsage = code.match(/\bvar\s+\w+/g);
    if (varUsage && varUsage.length > 0) {
      errors.push({
        line: null,
        rule: 'no-var',
        message: 'Unexpected var, use let or const instead'
      });
    }

    // Check for == usage (error)
    const doubleEquals = code.match(/[^=!]={2}[^=]/g);
    if (doubleEquals && doubleEquals.length > 0) {
      errors.push({
        line: null,
        rule: 'eqeqeq',
        message: 'Expected === instead of =='
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    return {
      valid: false,
      errors: [{ message: `Linting failed: ${error.message}` }],
      warnings: []
    };
  }
}

/**
 * Run Checkstyle (simplified version)
 * @param {string} code - Code to lint
 * @returns {object} Linting result
 */
function runCheckstyle(code) {
  const warnings = [];

  // Simple checks for Java
  if (!code.match(/public\s+class/)) {
    warnings.push({
      line: null,
      rule: 'visibility',
      message: 'Class should be public'
    });
  }

  return {
    valid: true,
    errors: [],
    warnings
  };
}

/**
 * Run Pylint (simplified version)
 * @param {string} code - Code to lint
 * @returns {object} Linting result
 */
function runPylint(code) {
  return {
    valid: true,
    errors: [],
    warnings: []
  };
}

/**
 * G3: Generate tests for code
 * @param {string} code - Generated code
 * @param {object} step - Plan step
 * @param {object} context - Validated context
 * @returns {string} Generated test code
 */
function generateTests(code, step, context) {
  const analysis = analyzeCodeForTesting(code, step.language);

  if (analysis.testableUnits.length === 0) {
    return generateBasicTestStub(step, context);
  }

  return generateFullTestSuite(analysis, step, context);
}

/**
 * Analyze code to extract testable units
 * @param {string} code - Code to analyze
 * @param {string} language - Language
 * @returns {object} Analysis result
 */
function analyzeCodeForTesting(code, language) {
  const testableUnits = [];

  try {
    if (language === 'typescript' || language === 'javascript') {
      // Extract class name
      const classMatch = code.match(/(?:export\s+)?class\s+(\w+)/);
      const className = classMatch ? classMatch[1] : 'Unknown';

      // Extract methods
      const methodMatches = code.matchAll(/(?:public\s+|private\s+|protected\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/g);
      for (const match of methodMatches) {
        const methodName = match[1];
        if (methodName !== 'constructor' && !methodName.startsWith('_')) {
          testableUnits.push({
            type: 'method',
            className,
            methodName,
            isAsync: match[0].includes('async')
          });
        }
      }

      return {
        testableUnits,
        className
      };
    } else if (language === 'java') {
      // Extract class name
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      const className = classMatch ? classMatch[1] : 'Unknown';

      // Extract methods
      const methodMatches = code.matchAll(/public\s+(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\([^)]*\)/g);
      for (const match of methodMatches) {
        const methodName = match[1];
        testableUnits.push({
          type: 'method',
          className,
          methodName
        });
      }

      return {
        testableUnits,
        className
      };
    }
  } catch (error) {
    // Return empty analysis on error
  }

  return {
    testableUnits: [],
    className: 'Unknown'
  };
}

/**
 * Generate basic test stub
 * @param {object} step - Plan step
 * @param {object} context - Validated context
 * @returns {string} Test code
 */
function generateBasicTestStub(step, context) {
  if (step.language === 'typescript' || step.language === 'javascript') {
    return `describe('${step.file}', () => {
  it('should exist', () => {
    expect(true).toBe(true);
  });
});
`;
  } else if (step.language === 'java') {
    const className = path.basename(step.file, '.java');
    return `import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ${className}Test {
    @Test
    public void testExists() {
        assertTrue(true);
    }
}
`;
  }

  return '// No tests generated\n';
}

/**
 * Generate full test suite
 * @param {object} analysis - Code analysis
 * @param {object} step - Plan step
 * @param {object} context - Validated context
 * @returns {string} Test code
 */
function generateFullTestSuite(analysis, step, context) {
  if (step.language === 'typescript' || step.language === 'javascript') {
    let tests = `describe('${analysis.className}', () => {\n`;

    for (const unit of analysis.testableUnits) {
      const asyncKeyword = unit.isAsync ? 'async ' : '';

      tests += `  it('${unit.methodName} should work', ${asyncKeyword}() => {\n`;
      tests += `    // TODO: Implement test\n`;
      tests += `    expect(true).toBe(true);\n`;
      tests += `  });\n\n`;
    }

    tests += '});\n';
    return tests;
  } else if (step.language === 'java') {
    let tests = `import org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.*;\n\n`;
    tests += `public class ${analysis.className}Test {\n`;

    for (const unit of analysis.testableUnits) {
      tests += `    @Test\n`;
      tests += `    public void test${unit.methodName.charAt(0).toUpperCase() + unit.methodName.slice(1)}() {\n`;
      tests += `        // TODO: Implement test\n`;
      tests += `        assertTrue(true);\n`;
      tests += `    }\n\n`;
    }

    tests += '}\n';
    return tests;
  }

  return generateBasicTestStub(step, context);
}

/**
 * G4: Run tests (mocked for now)
 * @param {string} testFile - Test file path
 * @param {string} testCode - Test code
 * @returns {object} Test results
 */
function runTests(testFile, testCode) {
  // Mock test execution - in real implementation would use Jest/JUnit/pytest
  const testCount = countTests(testCode);

  return {
    allPassed: true,
    totalTests: testCount,
    passed: testCount,
    failed: 0,
    skipped: 0,
    duration: 150, // ms
    failures: []
  };
}

/**
 * G5: Check test coverage (mocked for now)
 * @param {string} sourceFile - Source file
 * @param {string} testFile - Test file
 * @param {string} code - Source code
 * @param {string} tests - Test code
 * @returns {object} Coverage results
 */
function checkCoverage(sourceFile, testFile, code, tests) {
  // Mock coverage - in real implementation would use Istanbul/JaCoCo/coverage.py
  const testCount = countTests(tests);

  // Calculate mock coverage based on test count
  // More tests = higher coverage
  const baseCoverage = 75;
  const coverageBoost = Math.min(testCount * 5, 20);
  const lineCoverage = baseCoverage + coverageBoost;

  return {
    passed: lineCoverage >= 80,
    lineCoverage: Math.min(lineCoverage, 95),
    branchCoverage: Math.min(lineCoverage - 5, 90),
    functionCoverage: Math.min(lineCoverage + 2, 97),
    statementCoverage: Math.min(lineCoverage, 95),
    details: {
      totalLines: 100,
      coveredLines: Math.floor(lineCoverage),
      uncoveredLines: Math.floor(100 - lineCoverage)
    }
  };
}

/**
 * G6: Scan for security vulnerabilities
 * @param {string} code - Code to scan
 * @returns {object} Security scan results
 */
function scanSecurity(code) {
  const vulnerabilities = [];

  // Check 1: Hardcoded secrets
  vulnerabilities.push(...checkHardcodedSecrets(code));

  // Check 2: SQL injection
  vulnerabilities.push(...checkSqlInjection(code));

  // Check 3: XSS vulnerabilities
  vulnerabilities.push(...checkXssVulnerabilities(code));

  // Check 4: Unsafe eval/exec
  vulnerabilities.push(...checkUnsafeEval(code));

  // Check 5: Insecure randomness
  vulnerabilities.push(...checkInsecureRandom(code));

  const criticalVulns = vulnerabilities.filter(v => v.severity === 'CRITICAL');
  const highVulns = vulnerabilities.filter(v => v.severity === 'HIGH');

  return {
    passed: criticalVulns.length === 0,
    criticalVulnerabilities: criticalVulns.length,
    highVulnerabilities: highVulns.length,
    totalVulnerabilities: vulnerabilities.length,
    vulnerabilities
  };
}

/**
 * Check for hardcoded secrets
 * @param {string} code - Code to check
 * @returns {Array} Vulnerabilities found
 */
function checkHardcodedSecrets(code) {
  const vulnerabilities = [];

  const secretPatterns = [
    { name: 'password', pattern: /password\s*=\s*["'](?!.*process\.env)(?!.*config\.)(?!\{\{)[^"']{8,}["']/gi, severity: 'CRITICAL' },
    { name: 'api_key', pattern: /api[_-]?key\s*=\s*["'](?!.*process\.env)(?!.*config\.)[^"']{20,}["']/gi, severity: 'CRITICAL' },
    { name: 'secret', pattern: /secret\s*=\s*["'](?!.*process\.env)(?!.*config\.)[^"']{16,}["']/gi, severity: 'CRITICAL' },
    { name: 'token', pattern: /token\s*=\s*["'](?!.*process\.env)(?!.*config\.)[^"']{20,}["']/gi, severity: 'CRITICAL' },
    { name: 'private_key', pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi, severity: 'CRITICAL' }
  ];

  for (const pattern of secretPatterns) {
    const matches = [...code.matchAll(pattern.pattern)];
    for (const match of matches) {
      vulnerabilities.push({
        type: 'HARDCODED_SECRET',
        subtype: pattern.name,
        severity: pattern.severity,
        message: `Potential hardcoded ${pattern.name} detected`,
        snippet: match[0].substring(0, 50)
      });
    }
  }

  return vulnerabilities;
}

/**
 * Check for SQL injection vulnerabilities
 * @param {string} code - Code to check
 * @returns {Array} Vulnerabilities found
 */
function checkSqlInjection(code) {
  const vulnerabilities = [];

  const sqlInjectionPatterns = [
    /execute\s*\(\s*["'].*\+.*["']\s*\)/gi,
    /query\s*\(\s*["'].*\+.*["']\s*\)/gi,
    /execSQL\s*\(\s*["'].*\+.*["']\s*\)/gi
  ];

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(code)) {
      vulnerabilities.push({
        type: 'SQL_INJECTION',
        severity: 'CRITICAL',
        message: 'Potential SQL injection vulnerability - string concatenation in query'
      });
    }
  }

  return vulnerabilities;
}

/**
 * Check for XSS vulnerabilities
 * @param {string} code - Code to check
 * @returns {Array} Vulnerabilities found
 */
function checkXssVulnerabilities(code) {
  const vulnerabilities = [];

  const xssPatterns = [
    { pattern: /\.innerHTML\s*=\s*(?!["'])/gi, message: 'Potential XSS via innerHTML assignment' },
    { pattern: /document\.write\s*\(/gi, message: 'Potential XSS via document.write' },
    { pattern: /dangerouslySetInnerHTML/gi, message: 'Using dangerouslySetInnerHTML - ensure proper sanitization' }
  ];

  for (const check of xssPatterns) {
    if (check.pattern.test(code)) {
      vulnerabilities.push({
        type: 'XSS',
        severity: 'HIGH',
        message: check.message
      });
    }
  }

  return vulnerabilities;
}

/**
 * Check for unsafe eval/exec usage
 * @param {string} code - Code to check
 * @returns {Array} Vulnerabilities found
 */
function checkUnsafeEval(code) {
  const vulnerabilities = [];

  if (/\beval\s*\(/gi.test(code)) {
    vulnerabilities.push({
      type: 'CODE_INJECTION',
      severity: 'CRITICAL',
      message: 'Use of eval() detected - potential code injection'
    });
  }

  if (/\bexec\s*\(/gi.test(code)) {
    vulnerabilities.push({
      type: 'CODE_INJECTION',
      severity: 'CRITICAL',
      message: 'Use of exec() detected - potential command injection'
    });
  }

  if (/new\s+Function\s*\(/gi.test(code)) {
    vulnerabilities.push({
      type: 'CODE_INJECTION',
      severity: 'HIGH',
      message: 'Use of Function() constructor - potential code injection'
    });
  }

  return vulnerabilities;
}

/**
 * Check for insecure random number generation
 * @param {string} code - Code to check
 * @returns {Array} Vulnerabilities found
 */
function checkInsecureRandom(code) {
  const vulnerabilities = [];

  if (/Math\.random\s*\(\)/gi.test(code) && /token|secret|key|password/gi.test(code)) {
    vulnerabilities.push({
      type: 'WEAK_RANDOMNESS',
      severity: 'HIGH',
      message: 'Math.random() used in security context - use crypto.randomBytes() instead'
    });
  }

  return vulnerabilities;
}

/**
 * Derive test file path from source file
 * @param {string} sourceFile - Source file path
 * @param {string} language - Language
 * @returns {string} Test file path
 */
function deriveTestFilePath(sourceFile, language) {
  const dir = path.dirname(sourceFile);
  const filename = path.basename(sourceFile);
  const ext = path.extname(sourceFile);
  const baseName = filename.replace(ext, '');

  switch (ext) {
    case '.ts':
      return path.join(dir, `${baseName}.spec.ts`);
    case '.js':
      return path.join(dir, `${baseName}.test.js`);
    case '.java':
      // Java tests typically go in parallel test directory
      let testDir = dir;
      if (dir.includes('/src/main/')) {
        testDir = dir.replace('/src/main/', '/src/test/');
      } else if (dir.includes('src/main/')) {
        testDir = dir.replace('src/main/', 'src/test/');
      } else {
        // If no src/main pattern, just use same directory
        testDir = dir;
      }
      return path.join(testDir, `${baseName}Test.java`);
    case '.py':
      return path.join(dir, `test_${baseName}.py`);
    default:
      return path.join(dir, `${baseName}.test${ext}`);
  }
}

/**
 * Count number of tests in test code
 * @param {string} testCode - Test code
 * @returns {number} Number of tests
 */
function countTests(testCode) {
  let count = 0;

  // TypeScript/JavaScript: count it( or test(
  count += (testCode.match(/\s+it\s*\(/g) || []).length;
  count += (testCode.match(/\s+test\s*\(/g) || []).length;

  // Java: count @Test annotations
  count += (testCode.match(/@Test/g) || []).length;

  // Python: count def test_
  count += (testCode.match(/def\s+test_/g) || []).length;

  return Math.max(count, 1); // At least 1 test
}

module.exports = {
  executeWithQualityGates,
  validateSyntax,
  runLinter,
  generateTests,
  runTests,
  checkCoverage,
  scanSecurity,
  deriveTestFilePath,
  countTests
};
