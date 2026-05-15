/**
 * React Axios Specialist Test
 * Phase 2 Day 4 - Frontend Finalization
 *
 * Validates:
 * - File exists and has content
 * - Axios patterns documented (25 patterns)
 * - NO fetch API (use Axios ONLY)
 * - Request/response interceptors
 * - JWT token injection and refresh
 * - Error handling (network, timeout, server errors)
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

console.log('=== REACT AXIOS SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 4 - Frontend Finalization\n');

// ============================================
// FILE EXISTENCE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../react-axios-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'React axios specialist file exists');

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
// AXIOS PATTERN TESTS
// ============================================

testGroup('Axios Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-axios-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: Axios instance configuration
    assert(content.includes('axios.create') || content.includes('baseURL'), 'Axios instance configuration documented');

    // Test 5: Request interceptor
    assert(content.includes('request') && content.includes('interceptor'), 'Request interceptor pattern documented');

    // Test 6: Response interceptor
    assert(content.includes('response') && content.includes('interceptor'), 'Response interceptor pattern documented');

    // Test 7: JWT token injection
    assert(content.includes('JWT') || content.includes('Authorization') || content.includes('Bearer'), 'JWT token injection pattern documented');

    // Test 8: Token refresh mechanism
    assert(content.includes('refresh') && (content.includes('token') || content.includes('401')), 'Token refresh mechanism documented');

    // Test 9: Error handling
    assert(content.includes('error') && content.includes('handling'), 'Error handling pattern documented');

    // Test 10: Timeout configuration
    assert(content.includes('timeout'), 'Timeout configuration documented');

    // Test 11: Network error handling
    assert(content.includes('network') || content.includes('Network'), 'Network error handling documented');

    // Test 12: 25 patterns documented
    const patternCount = (content.match(/### Pattern \d+:/g) || []).length;
    assert(patternCount >= 20, `Sufficient patterns documented (${patternCount} patterns, expected ≥20)`);
  }
});

// ============================================
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-axios-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 13: Prohibited patterns section exists
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'Prohibited patterns section exists');

    // Test 14: NO fetch API documented
    assert(content.includes('NO fetch') || content.includes('fetch API'), 'NO fetch API prohibition documented');

    // Test 15: Verify axios usage in code examples
    const tsCodeBlocks = [];
    const regex = /```typescript([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      tsCodeBlocks.push(match[1]);
    }

    const usesAxios = tsCodeBlocks.some(block => block.includes('axios'));
    assert(usesAxios, 'Code examples use axios');

    // Test 16: NO fetch in good code examples
    const fetchInGoodCode = tsCodeBlocks.some(block =>
      block.includes('fetch(') &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!fetchInGoodCode, 'NO fetch API in correct code examples');
  }
});

// ============================================
// INTEGRATION TESTS
// ============================================

testGroup('C# Backend Integration Tests', () => {
  const filePath = path.resolve(__dirname, '../react-axios-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 17: C# backend integration mentioned
    assert(content.includes('C#') || content.includes('ASP.NET Core'), 'C# backend integration mentioned');

    // Test 18: API base URL configuration
    assert(content.includes('baseURL') || content.includes('API_URL'), 'API base URL configuration documented');

    // Test 19: CORS handling
    assert(content.includes('CORS') || content.includes('withCredentials'), 'CORS handling documented');

    // Test 20: TypeScript types
    const interfaceCount = (content.match(/interface \w+/g) || []).length;
    assert(interfaceCount >= 5, `TypeScript interfaces present (${interfaceCount} interfaces, expected ≥5)`);
  }
});

// ============================================
// BEST PRACTICES TESTS
// ============================================

testGroup('Best Practices Tests', () => {
  const filePath = path.resolve(__dirname, '../react-axios-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 21: Best practices section
    assert(content.includes('BEST PRACTICES') || content.includes('Best Practices'), 'Best practices section exists');

    // Test 22: Environment variables
    assert(content.includes('process.env') || content.includes('env'), 'Environment variables usage documented');

    // Test 23: Error types
    assert(content.includes('NetworkError') || content.includes('TimeoutError') || content.includes('ServerError'), 'Error types documented');

    // Test 24: TypeScript code blocks
    const tsCodeBlockCount = (content.match(/```typescript/gi) || []).length;
    assert(tsCodeBlockCount >= 15, `Sufficient TypeScript code examples (${tsCodeBlockCount} code blocks, expected ≥15)`);

    // Test 25: Axios import statements
    assert(content.includes('import axios') || content.includes('from \'axios\''), 'Axios import statements present');
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
  console.log('\n✅ ALL REACT AXIOS SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - React axios specialist file created and validated');
  console.log('  - Axios patterns documented (instance, interceptors, JWT, refresh)');
  console.log('  - NO fetch API (axios ONLY)');
  console.log('  - Error handling (network, timeout, server errors)');
  console.log('  - C# backend integration documented');
  console.log('  - TypeScript interfaces present (≥5 interfaces)');
  console.log('\n🎯 Phase 2 Day 4 Task 15: COMPLETE');
  process.exit(0);
}
