/**
 * React UI Component Library Specialist Test
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

console.log('=== REACT UI COMPONENT LIBRARY SPECIALIST TEST SUITE ===\n');

const filePath = path.resolve(__dirname, '../react-ui-specialist.md');
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

  testGroup('shadcn/ui Patterns', () => {
    assert(content.includes('shadcn') || content.includes('shadcn-ui'), 'shadcn/ui mentioned');
    assert(content.includes('Tailwind'), 'Tailwind CSS mentioned');
    assert(content.includes('Radix'), 'Radix UI mentioned');
    assert(content.includes('button-variants') || content.includes('cva'), 'Button variants pattern');
    assert(content.includes('dark-mode') || content.includes('next-themes'), 'Dark mode pattern');
  });

  testGroup('Component Patterns', () => {
    assert(content.includes('form-components'), 'Form components');
    assert(content.includes('dialog-modal') || content.includes('Dialog'), 'Dialog/Modal');
    assert(content.includes('data-table'), 'Data table');
    assert(content.includes('toast-notifications') || content.includes('sonner'), 'Toast');
    assert(content.includes('card-component'), 'Card');
  });

  testGroup('Styling Patterns', () => {
    assert(content.includes('responsive-design'), 'Responsive design');
    assert(content.includes('utility-classes'), 'Utility classes');
    assert(content.includes('cn-utility') || content.includes('twMerge'), 'cn utility');
  });

  testGroup('Code Examples', () => {
    const tsCount = (content.match(/```typescript/gi) || []).length;
    assert(tsCount >= 10, `TypeScript examples (${tsCount})`);
  });

  testGroup('Prohibited Patterns', () => {
    assert(content.includes('NO Material-UI'), 'NO Material-UI');
    assert(content.includes('NO Bootstrap'), 'NO Bootstrap');
    assert(content.includes('NO Inline Styles'), 'NO Inline Styles');
  });

  testGroup('Best Practices', () => {
    assert(content.includes('BEST PRACTICES'), 'Best practices section');
    assert(content.includes('Accessibility'), 'Accessibility');
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
  console.log('\n✅ ALL REACT UI SPECIALIST TESTS PASSED');
  console.log('\n🎯 Week 7 Task 6: COMPLETE');
  process.exit(0);
}
