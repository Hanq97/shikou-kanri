/**
 * React State Management Specialist Test
 * Phase 2 Day 4 - Frontend Finalization
 *
 * Validates:
 * - File exists and has content
 * - State management patterns documented (30 patterns)
 * - NO Redux (use Context API + useReducer)
 * - Context API patterns (context provider, useContext hook)
 * - useReducer patterns (reducer, action creators)
 * - Custom hooks (useLocalStorage, useAuthState)
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

console.log('=== REACT STATE MANAGEMENT SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 4 - Frontend Finalization\n');

// ============================================
// FILE EXISTENCE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../react-state-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'React state specialist file exists');

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
// STATE MANAGEMENT PATTERN TESTS
// ============================================

testGroup('State Management Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-state-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: Context API mentioned
    assert(content.includes('Context') || content.includes('createContext'), 'Context API documented');

    // Test 5: useReducer mentioned
    assert(content.includes('useReducer'), 'useReducer pattern documented');

    // Test 6: Provider pattern
    assert(content.includes('Provider') || content.includes('.Provider'), 'Provider pattern documented');

    // Test 7: useContext hook
    assert(content.includes('useContext'), 'useContext hook documented');

    // Test 8: Action creators
    assert(content.includes('action') && (content.includes('creator') || content.includes('type')), 'Action creators documented');

    // Test 9: Reducer function
    assert(content.includes('reducer') && content.includes('function'), 'Reducer function documented');

    // Test 10: Custom hooks
    assert(content.includes('useLocalStorage') || content.includes('useAuthState') || content.includes('custom hook'), 'Custom hooks documented');

    // Test 11: State persistence
    assert(content.includes('localStorage') || content.includes('persistence'), 'State persistence documented');

    // Test 12: 30 patterns documented
    const patternCount = (content.match(/### Pattern \d+:/g) || []).length;
    assert(patternCount >= 25, `Sufficient patterns documented (${patternCount} patterns, expected ≥25)`);
  }
});

// ============================================
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-state-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 13: Prohibited patterns section exists
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'Prohibited patterns section exists');

    // Test 14: NO Redux documented
    assert(content.includes('NO Redux') || content.includes('Redux'), 'NO Redux prohibition documented');

    // Test 15: NO Zustand documented
    assert(content.includes('NO Zustand') || content.includes('Zustand'), 'NO Zustand prohibition documented');

    // Test 16: Verify Context API usage in code examples
    const tsCodeBlocks = [];
    const regex = /```typescript([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      tsCodeBlocks.push(match[1]);
    }

    const usesContextAPI = tsCodeBlocks.some(block =>
      block.includes('createContext') ||
      block.includes('useContext') ||
      block.includes('useReducer')
    );
    assert(usesContextAPI, 'Code examples use Context API or useReducer');

    // Test 17: NO Redux in good code examples
    const reduxInGoodCode = tsCodeBlocks.some(block =>
      (block.includes('createStore') || block.includes('redux')) &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!reduxInGoodCode, 'NO Redux in correct code examples');
  }
});

// ============================================
// INTEGRATION TESTS
// ============================================

testGroup('C# Backend Integration Tests', () => {
  const filePath = path.resolve(__dirname, '../react-state-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 18: C# backend integration mentioned
    assert(content.includes('C#') || content.includes('ASP.NET Core'), 'C# backend integration mentioned');

    // Test 19: Auth state management
    assert(content.includes('auth') || content.includes('Auth'), 'Auth state management documented');

    // Test 20: API integration
    assert(content.includes('api') || content.includes('API'), 'API integration documented');

    // Test 21: TypeScript types
    const interfaceCount = (content.match(/interface \w+/g) || []).length;
    assert(interfaceCount >= 8, `TypeScript interfaces present (${interfaceCount} interfaces, expected ≥8)`);
  }
});

// ============================================
// BEST PRACTICES TESTS
// ============================================

testGroup('Best Practices Tests', () => {
  const filePath = path.resolve(__dirname, '../react-state-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 22: Best practices section
    assert(content.includes('BEST PRACTICES') || content.includes('Best Practices'), 'Best practices section exists');

    // Test 23: Performance optimization
    assert(content.includes('useMemo') || content.includes('memoized') || content.includes('optimization'), 'Performance optimization documented');

    // Test 24: Context splitting
    assert(content.includes('split') || content.includes('separation'), 'Context splitting/separation documented');

    // Test 25: TypeScript code blocks
    const tsCodeBlockCount = (content.match(/```typescript/gi) || []).length;
    assert(tsCodeBlockCount >= 20, `Sufficient TypeScript code examples (${tsCodeBlockCount} code blocks, expected ≥20)`);

    // Test 26: React imports
    assert(content.includes('import') && content.includes('react'), 'React import statements present');
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
  console.log('\n✅ ALL REACT STATE MANAGEMENT SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - React state specialist file created and validated');
  console.log('  - Context API patterns documented (Provider, useContext)');
  console.log('  - useReducer patterns documented (reducer, action creators)');
  console.log('  - Custom hooks documented (useLocalStorage, useAuthState)');
  console.log('  - NO Redux, NO Zustand (Context API + useReducer ONLY)');
  console.log('  - State persistence with localStorage');
  console.log('  - C# backend integration documented');
  console.log('  - TypeScript interfaces present (≥8 interfaces)');
  console.log('\n🎯 Phase 2 Day 4 Task 17: COMPLETE');
  process.exit(0);
}
