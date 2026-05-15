/**
 * React Testing Specialist Test
 * Week 7 Extension - React Frontend Specialists
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
  } else {
    failCount++;
    failures.push(message);
    console.log(`  ❌ ${message}`);
  }
}

function testGroup(name, fn) {
  console.log(`\n📦 ${name}`);
  fn();
}

console.log('=== REACT TESTING SPECIALIST TEST SUITE ===\n');

const filePath = path.resolve(__dirname, '../react-testing-specialist.md');
const fileExists = fs.existsSync(filePath);

testGroup('File Tests', () => {
  assert(fileExists, 'File exists');
  if (fileExists) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert(content.length > 1000, 'Has content');
    assert(content.split('\n').length >= 100, 'Has lines');
  }
});

if (fileExists) {
  const content = fs.readFileSync(filePath, 'utf8');

  testGroup('Vitest Patterns', () => {
    assert(content.includes('vitest-setup') || content.includes('Vitest'), 'Vitest setup');
    assert(content.includes('React Testing Library'), 'React Testing Library');
    assert(content.includes('jsdom'), 'jsdom environment');
  });

  testGroup('Component Testing', () => {
    assert(content.includes('component-render'), 'Component render');
    assert(content.includes('user-interaction') || content.includes('userEvent'), 'User interaction');
    assert(content.includes('async-component'), 'Async component');
  });

  testGroup('Integration Testing', () => {
    assert(content.includes('react-query-testing'), 'React Query testing');
    assert(content.includes('integration-test'), 'Integration test');
    assert(content.includes('mock-server') || content.includes('MSW'), 'Mock server');
  });

  testGroup('Testing Utilities', () => {
    assert(content.includes('mocking-modules'), 'Mocking modules');
    assert(content.includes('custom-render'), 'Custom render');
    assert(content.includes('test-hooks') || content.includes('renderHook'), 'Test hooks');
  });

  testGroup('Quality Assurance', () => {
    assert(content.includes('accessibility-testing') || content.includes('jest-axe'), 'Accessibility');
    assert(content.includes('snapshot-testing'), 'Snapshot testing');
    assert(content.includes('coverage-reporting'), 'Coverage');
  });

  testGroup('E2E Testing', () => {
    assert(content.includes('e2e-playwright') || content.includes('Playwright'), 'Playwright E2E');
  });

  testGroup('Code Examples', () => {
    const tsCount = (content.match(/```typescript/gi) || []).length;
    assert(tsCount >= 10, `TypeScript examples (${tsCount})`);
  });

  testGroup('Prohibited Patterns', () => {
    assert(content.includes('NO Jest'), 'NO Jest');
    assert(content.includes('NO Enzyme'), 'NO Enzyme');
  });

  testGroup('Best Practices', () => {
    assert(content.includes('BEST PRACTICES'), 'Best practices section');
    assert(content.includes('Query Priority') || content.includes('getByRole'), 'Query priority');
  });
}

console.log(`\n--- Test Summary ---`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

if (failCount > 0) {
  console.log('\n❌ FAILED TESTS:');
  failures.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));
  process.exit(1);
} else {
  console.log('\n✅ ALL REACT TESTING SPECIALIST TESTS PASSED');
  console.log('\n🎯 Week 7 Task 7: COMPLETE');
  process.exit(0);
}
