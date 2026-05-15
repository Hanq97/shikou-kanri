/**
 * React Security Specialist Test
 * Phase 2 Day 4 - Frontend Finalization
 *
 * Validates:
 * - File exists and has content
 * - Security patterns documented (35 patterns)
 * - NO localStorage for tokens (use httpOnly cookies)
 * - DOMPurify for XSS prevention
 * - CSRF protection (CSRF tokens, SameSite cookies)
 * - Authentication (httpOnly cookies, JWT refresh)
 * - Data validation (input validation, sanitization)
 * - Secure communication (HTTPS enforcement, secure headers)
 * - Integration with C# ASP.NET Core backend
 */

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✅ ${message}`);
    return true;
  } else {
    failCount++;
    failures.push(message);
    console.log(`  ❌ ${message}`);
    return false;
  }
}

function testGroup(name, fn) {
  console.log(`\n📦 ${name}`);
  fn();
}

console.log('=== REACT SECURITY SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 4 - Frontend Finalization\n');

// ============================================
// FILE EXISTENCE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../react-security-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'React security specialist file exists');

  if (fileExists) {
    // Test 2: File has content
    const content = fs.readFileSync(filePath, 'utf8');
    assert(content.length > 1000, 'File has substantial content (>1000 characters)');

    // Test 3: File size reasonable
    const lines = content.split('\n').length;
    assert(lines >= 100, `File has sufficient lines (${lines} lines, expected ≥100)`);
  }
});

// ============================================
// XSS PREVENTION TESTS
// ============================================

testGroup('XSS Prevention Tests', () => {
  const filePath = path.resolve(__dirname, '../react-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: DOMPurify mentioned
    assert(content.includes('DOMPurify') || content.includes('dompurify'), 'DOMPurify library documented');

    // Test 5: Sanitization pattern
    assert(content.includes('sanitize') || content.includes('sanitization'), 'Sanitization pattern documented');

    // Test 6: XSS prevention
    assert(content.includes('XSS'), 'XSS prevention documented');

    // Test 7: dangerouslySetInnerHTML safety
    assert(content.includes('dangerouslySetInnerHTML'), 'dangerouslySetInnerHTML safety documented');

    // Test 8: Content Security Policy
    assert(content.includes('CSP') || content.includes('Content Security Policy'), 'Content Security Policy documented');
  }
});

// ============================================
// CSRF PROTECTION TESTS
// ============================================

testGroup('CSRF Protection Tests', () => {
  const filePath = path.resolve(__dirname, '../react-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 9: CSRF mentioned
    assert(content.includes('CSRF'), 'CSRF protection documented');

    // Test 10: CSRF token
    assert(content.includes('CSRF') && content.includes('token'), 'CSRF token pattern documented');

    // Test 11: SameSite cookies
    assert(content.includes('SameSite'), 'SameSite cookies documented');

    // Test 12: CSRF header
    assert(content.includes('X-CSRF-Token') || content.includes('CSRF-TOKEN'), 'CSRF header documented');
  }
});

// ============================================
// AUTHENTICATION TESTS
// ============================================

testGroup('Authentication & Authorization Tests', () => {
  const filePath = path.resolve(__dirname, '../react-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 13: httpOnly cookies
    assert(content.includes('httpOnly') || content.includes('HttpOnly'), 'httpOnly cookies documented');

    // Test 14: JWT refresh token
    assert(content.includes('JWT') || content.includes('refresh') && content.includes('token'), 'JWT refresh token documented');

    // Test 15: Protected routes
    assert(content.includes('protected') && content.includes('route'), 'Protected routes documented');

    // Test 16: Role-based access
    assert(content.includes('role') || content.includes('RBAC'), 'Role-based access documented');

    // Test 17: Token expiration handling
    assert(content.includes('expiration') || content.includes('401'), 'Token expiration handling documented');
  }
});

// ============================================
// DATA VALIDATION TESTS
// ============================================

testGroup('Data Validation Tests', () => {
  const filePath = path.resolve(__dirname, '../react-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 18: Input validation
    assert(content.includes('validation') || content.includes('validator'), 'Input validation documented');

    // Test 19: Sanitize before submit
    assert(content.includes('sanitize') && content.includes('submit'), 'Sanitize before submit documented');

    // Test 20: Form validation
    assert(content.includes('form') && content.includes('validation'), 'Form validation documented');

    // Test 21: 35 patterns documented
    const patternCount = (content.match(/### Pattern \d+:/g) || []).length;
    assert(patternCount >= 30, `Sufficient patterns documented (${patternCount} patterns, expected ≥30)`);
  }
});

// ============================================
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 22: Prohibited patterns section exists
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'Prohibited patterns section exists');

    // Test 23: NO localStorage for tokens
    assert(content.includes('NO localStorage') || content.includes('localStorage') && content.includes('token'), 'NO localStorage for tokens documented');

    // Test 24: Verify DOMPurify usage in code examples
    const tsCodeBlocks = [];
    const regex = /```typescript([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      tsCodeBlocks.push(match[1]);
    }

    const usesDOMPurify = tsCodeBlocks.some(block =>
      block.includes('DOMPurify') ||
      block.includes('sanitize')
    );
    assert(usesDOMPurify, 'Code examples use DOMPurify');

    // Test 25: NO localStorage for tokens in good code examples
    const localStorageTokenInGoodCode = tsCodeBlocks.some(block =>
      block.includes('localStorage.setItem') &&
      block.includes('token') &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!localStorageTokenInGoodCode, 'NO localStorage for tokens in correct code examples');
  }
});

// ============================================
// INTEGRATION TESTS
// ============================================

testGroup('C# Backend Integration Tests', () => {
  const filePath = path.resolve(__dirname, '../react-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 26: C# backend integration mentioned
    assert(content.includes('C#') || content.includes('ASP.NET Core'), 'C# backend integration mentioned');

    // Test 27: HTTPS enforcement
    assert(content.includes('HTTPS') || content.includes('https'), 'HTTPS enforcement documented');

    // Test 28: Secure headers
    assert(content.includes('header') && (content.includes('secure') || content.includes('security')), 'Secure headers documented');

    // Test 29: TypeScript types
    const interfaceCount = (content.match(/interface \w+/g) || []).length;
    assert(interfaceCount >= 5, `TypeScript interfaces present (${interfaceCount} interfaces, expected ≥5)`);
  }
});

// ============================================
// BEST PRACTICES TESTS
// ============================================

testGroup('Best Practices Tests', () => {
  const filePath = path.resolve(__dirname, '../react-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 30: Best practices section
    assert(content.includes('BEST PRACTICES') || content.includes('Best Practices'), 'Best practices section exists');

    // Test 31: TypeScript code blocks
    const tsCodeBlockCount = (content.match(/```typescript/gi) || []).length;
    assert(tsCodeBlockCount >= 20, `Sufficient TypeScript code examples (${tsCodeBlockCount} code blocks, expected ≥20)`);

    // Test 32: DOMPurify import statements
    assert(content.includes('import') && content.includes('dompurify'), 'DOMPurify import statements present');

    // Test 33: Security headers
    assert(content.includes('X-Content-Type-Options') || content.includes('X-Frame-Options') || content.includes('X-XSS-Protection'), 'Security headers documented');

    // Test 34: Cookie security
    assert(content.includes('Secure') && content.includes('cookie'), 'Cookie security documented');

    // Test 35: Error handling
    assert(content.includes('error') && content.includes('handling'), 'Error handling documented');
  }
});

// ============================================
// SUMMARY
// ============================================

console.log(`\n--- Test Summary ---`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

if (failCount > 0) {
  console.log('\n❌ FAILED TESTS:');
  failures.forEach((failure, i) => {
    console.log(`  ${i + 1}. ${failure}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ ALL REACT SECURITY SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - React security specialist file created and validated');
  console.log('  - XSS prevention patterns documented (DOMPurify, sanitization, CSP)');
  console.log('  - CSRF protection patterns documented (CSRF tokens, SameSite cookies)');
  console.log('  - Authentication patterns documented (httpOnly cookies, JWT refresh)');
  console.log('  - Data validation patterns documented (input validation, sanitization)');
  console.log('  - Secure communication patterns documented (HTTPS, secure headers)');
  console.log('  - NO localStorage for tokens (httpOnly cookies ONLY)');
  console.log('  - C# backend integration documented');
  console.log('  - TypeScript interfaces present (≥5 interfaces)');
  console.log('\n🎯 Phase 2 Day 4 Task 19: COMPLETE');
  process.exit(0);
}
