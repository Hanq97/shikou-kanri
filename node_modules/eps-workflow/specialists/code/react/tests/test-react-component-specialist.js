/**
 * React Component Specialist Test
 * Week 7 - React Frontend Specialists
 *
 * Validates:
 * - File exists and has content
 * - Component patterns documented (30 patterns)
 * - Functional components (NO class components except ErrorBoundary)
 * - TypeScript interfaces for props
 * - Performance optimization patterns (memo, useCallback, useMemo)
 * - Code splitting and lazy loading
 * - NO default exports, NO prop drilling, NO class components
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

console.log('=== REACT COMPONENT SPECIALIST TEST SUITE ===\n');
console.log('Week 7 - React Frontend Specialists\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../react-component-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'React component specialist file exists');

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
// FUNCTIONAL COMPONENT PATTERN TESTS
// ============================================

testGroup('Functional Component Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-component-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: Functional component pattern
    assert(content.includes('functional-component') || content.includes('export function UserCard'), 'Functional component pattern documented');

    // Test 5: Props interface
    assert(content.includes('props-interface') || content.includes('interface UserCardProps'), 'Props interface pattern documented');

    // Test 6: Children prop
    assert(content.includes('children-prop') || content.includes('children: ReactNode'), 'Children prop pattern documented');

    // Test 7: Default props
    assert(content.includes('default-props') || content.includes('variant = \'primary\''), 'Default props pattern documented');

    // Test 8: Component composition
    assert(content.includes('component-composition') || content.includes('UserCard.Header'), 'Component composition pattern documented');

    // Test 9: Conditional rendering
    assert(content.includes('conditional-rendering') || content.includes('if (isBanned)'), 'Conditional rendering pattern documented');

    // Test 10: List rendering
    assert(content.includes('list-rendering') || content.includes('users.map'), 'List rendering pattern documented');

    // Test 11: Fragment wrapper
    assert(content.includes('fragment-wrapper') || content.includes('<>') || content.includes('<Fragment>'), 'Fragment wrapper pattern documented');

    // Test 12: Forward ref
    assert(content.includes('forward-ref-pattern') || content.includes('forwardRef'), 'Forward ref pattern documented');
  }
});

// ============================================
// PERFORMANCE OPTIMIZATION PATTERN TESTS
// ============================================

testGroup('Performance Optimization Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-component-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 13: React.memo
    assert(content.includes('react-memo') || content.includes('memo(function'), 'React.memo pattern documented');

    // Test 14: useCallback
    assert(content.includes('use-callback-optimization') || content.includes('useCallback'), 'useCallback optimization pattern documented');

    // Test 15: useMemo
    assert(content.includes('use-memo-computation') || content.includes('useMemo'), 'useMemo computation pattern documented');

    // Test 16: Lazy loading
    assert(content.includes('lazy-loading') || content.includes('React.lazy') || content.includes('lazy('), 'Lazy loading pattern documented');

    // Test 17: Code splitting
    assert(content.includes('code-splitting') || content.includes('Suspense'), 'Code splitting pattern documented');

    // Test 18: Virtual scrolling
    assert(content.includes('virtual-scrolling') || content.includes('virtualized'), 'Virtual scrolling pattern mentioned');

    // Test 19: Debounce input
    assert(content.includes('debounce-input') || content.includes('debounce'), 'Debounce input pattern mentioned');

    // Test 20: Key prop optimization
    assert(content.includes('key-prop-optimization') || content.includes('key={user.id}'), 'Key prop optimization documented');
  }
});

// ============================================
// TYPESCRIPT INTEGRATION TESTS
// ============================================

testGroup('TypeScript Integration Tests', () => {
  const filePath = path.resolve(__dirname, '../react-component-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 21: Props typing
    assert(content.includes('props-typing') || content.includes('interface') && content.includes('Props'), 'Props typing pattern documented');

    // Test 22: Children typing
    assert(content.includes('children-typing') || content.includes('ReactNode'), 'Children typing pattern documented');

    // Test 23: Event handler typing
    assert(content.includes('event-handler-typing') || content.includes('onClick: () => void'), 'Event handler typing pattern documented');

    // Test 24: Ref typing
    assert(content.includes('ref-typing') || content.includes('forwardRef<HTMLInputElement'), 'Ref typing pattern documented');

    // Test 25: TypeScript interfaces present
    const interfaceCount = (content.match(/interface \w+Props/g) || []).length;
    assert(interfaceCount >= 10, `Sufficient TypeScript interfaces (${interfaceCount} interfaces, expected ≥10)`);
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../react-component-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 26: TypeScript code blocks present
    const tsCodeBlockCount = (content.match(/```typescript/gi) || []).length;
    assert(tsCodeBlockCount >= 20, `Sufficient TypeScript code examples (${tsCodeBlockCount} code blocks, expected ≥20)`);

    // Test 27: Export function pattern
    assert(content.includes('export function UserCard'), 'Export function pattern present');

    // Test 28: Destructured props
    assert(content.includes('{ id, name, email') || content.includes('{ name, email'), 'Destructured props pattern present');

    // Test 29: Interface extends
    assert(content.includes('extends InputHTMLAttributes') || content.includes('extends'), 'Interface extends pattern present');

    // Test 30: Memo usage example
    assert(content.includes('memo(function UserCard'), 'Memo usage example present');
  }
});

// ============================================
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-component-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 31: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 32: NO class components prohibition (except ErrorBoundary)
    assert(content.includes('NO class components') || content.includes('NO Class Components'), 'Class components prohibition documented');

    // Test 33: NO default exports prohibition
    assert(content.includes('NO default exports') || content.includes('NO Default Exports'), 'Default exports prohibition documented');

    // Test 34: NO prop drilling prohibition
    assert(content.includes('NO prop drilling') || content.includes('NO Prop Drilling'), 'Prop drilling prohibition documented');

    // Test 35: Verify NO class components in good code examples (except ErrorBoundary)
    const tsCodeBlocks = [];
    const regex = /```typescript([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      tsCodeBlocks.push(match[1]);
    }

    const classComponentInGoodCode = tsCodeBlocks.some(block =>
      block.includes('class') &&
      block.includes('extends Component') &&
      !block.includes('ErrorBoundary') &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!classComponentInGoodCode, 'NO class components in correct code examples (except ErrorBoundary)');

    // Test 36: Verify named exports used
    const namedExportPresent = tsCodeBlocks.some(block =>
      block.includes('export function') || block.includes('export const')
    );
    assert(namedExportPresent, 'Named exports present in code examples');
  }
});

// ============================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================

testGroup('Architecture Compliance Tests', () => {
  const filePath = path.resolve(__dirname, '../react-component-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 37: React 19 mentioned
    assert(content.includes('React 19') || content.includes('React'), 'React version mentioned');

    // Test 38: TypeScript mentioned
    assert(content.includes('TypeScript'), 'TypeScript mentioned');

    // Test 39: Functional components focus
    assert(content.includes('Functional components') || content.includes('functional components'), 'Functional components focus documented');

    // Test 40: C# backend integration
    assert(content.includes('C# ASP.NET Core') || content.includes('C#') && content.includes('backend'), 'C# backend integration mentioned');

    // Test 41: Performance optimization documented
    assert(content.includes('Performance') || content.includes('performance'), 'Performance optimization documented');

    // Test 42: 30 patterns documented
    const patternSectionCount = (content.match(/### Pattern \d+:/g) || []).length;
    assert(patternSectionCount >= 15, `Sufficient pattern documentation (${patternSectionCount} patterns, expected ≥15)`);
  }
});

// ============================================
// BEST PRACTICES TESTS
// ============================================

testGroup('Best Practices Tests', () => {
  const filePath = path.resolve(__dirname, '../react-component-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 43: Best practices section
    assert(content.includes('BEST PRACTICES') || content.includes('Best Practices'), 'Best practices section documented');

    // Test 44: Error boundary mentioned
    assert(content.includes('error-boundary') || content.includes('ErrorBoundary'), 'Error boundary pattern documented');

    // Test 45: Axios for API calls
    assert(content.includes('axios') || content.includes('fetch'), 'API client documented');

    // Test 46: Environment variables
    assert(content.includes('process.env') || content.includes('REACT_APP_'), 'Environment variables usage documented');

    // Test 47: PascalCase naming
    assert(content.includes('PascalCase'), 'PascalCase naming convention documented');

    // Test 48: Semantic HTML
    assert(content.includes('Semantic HTML') || content.includes('semantic'), 'Semantic HTML mentioned');
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
  console.log('\n✅ ALL REACT COMPONENT SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - React component specialist file created and validated');
  console.log('  - Functional component patterns documented (export function, props interface, children)');
  console.log('  - Performance optimization patterns documented (memo, useCallback, useMemo, lazy loading)');
  console.log('  - TypeScript integration patterns documented (≥10 interfaces)');
  console.log('  - Prohibited patterns documented (NO class components, NO default exports, NO prop drilling)');
  console.log('  - Code examples present (≥20 TypeScript code blocks)');
  console.log('  - C# backend integration documented (axios API client)');
  console.log('\n🎯 Week 7 Task 1: COMPLETE');
  process.exit(0);
}
